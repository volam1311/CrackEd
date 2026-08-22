"""Search behaviour of GET /api/videos?q=..."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def make_doc(video_id: str, original: str, display: str | None = None, channel: str = "Some Channel") -> dict:
    return {
        "_id": video_id,
        "source": "youtube",
        "original_title": original,
        "display_title": display,
        "description": None,
        "channel_id": "UCabc",
        "channel_title": channel,
        "thumbnail_url": None,
        "duration_seconds": 60,
        "published_at": None,
        "embeddable": True,
        "file_path": None,
        "created_at": "2026-08-22T00:00:00",
    }


class FakeCursor:
    def __init__(self, items):
        self._items = items

    def sort(self, *_args, **_kwargs):
        return self

    def skip(self, _n):
        return self

    def limit(self, _n):
        return self

    def __aiter__(self):
        async def gen():
            for item in self._items:
                yield item

        return gen()


class FakeVideos:
    """Records the filter it was asked for so tests can assert on it.

    A search runs as an aggregation (so results can be ranked by which title
    matched); everything else still goes through find().
    """

    def __init__(self, docs: list[dict]):
        self.docs = docs
        self.last_query: dict | None = None

    def find(self, query=None):
        self.last_query = query
        return FakeCursor(self.docs)

    def aggregate(self, pipeline):
        self.last_query = next(s["$match"] for s in pipeline if "$match" in s)
        return FakeCursor(self.docs)


class FakeDB:
    def __init__(self, docs: list[dict]):
        self.videos = FakeVideos(docs)


def test_search_builds_case_insensitive_or_query_across_title_fields():
    fake = FakeDB([make_doc("abc", "But what is a neural network?")])
    with patch("app.routers.videos.get_db", return_value=fake):
        response = client.get("/api/videos", params={"q": "neural"})

    assert response.status_code == 200
    clauses = fake.videos.last_query["$or"]
    fields = {next(iter(c)) for c in clauses}
    assert fields == {"display_title", "original_title", "channel_title"}
    assert all(c[next(iter(c))]["$options"] == "i" for c in clauses)


def test_search_escapes_regex_metacharacters():
    """A stray "(" from a search box must be matched literally, not compiled."""
    fake = FakeDB([])
    with patch("app.routers.videos.get_db", return_value=fake):
        response = client.get("/api/videos", params={"q": "c++ (advanced)"})

    assert response.status_code == 200
    pattern = fake.videos.last_query["$or"][0]["display_title"]["$regex"]
    assert "\\(" in pattern
    assert "\\+" in pattern


def test_blank_search_is_ignored_rather_than_matching_everything():
    fake = FakeDB([make_doc("abc", "Anything")])
    with patch("app.routers.videos.get_db", return_value=fake):
        response = client.get("/api/videos", params={"q": "   ", "order": "recent"})

    assert response.status_code == 200
    assert "$or" not in (fake.videos.last_query or {})


def test_search_combines_with_source_filter():
    fake = FakeDB([])
    with patch("app.routers.videos.get_db", return_value=fake):
        response = client.get("/api/videos", params={"q": "python", "source": "upload"})

    assert response.status_code == 200
    assert fake.videos.last_query["source"] == "upload"
    assert "$or" in fake.videos.last_query
