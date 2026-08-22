"""distribute=true must include uploaded videos (channel_id=None), not just channels."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def make_doc(video_id: str, channel_id: str | None, source: str = "youtube") -> dict:
    return {
        "_id": video_id,
        "source": source,
        "original_title": video_id,
        "display_title": video_id,
        "description": None,
        "channel_id": channel_id,
        "channel_title": None if channel_id is None else f"Channel {channel_id}",
        "thumbnail_url": None,
        "duration_seconds": 60,
        "published_at": None,
        "embeddable": True,
        "file_path": f"{video_id}.mp4" if source == "upload" else None,
        "created_at": "2026-08-22T00:00:00",
    }


class FakeCursor:
    def __init__(self, items):
        self._items = items

    def sort(self, *_args, **_kwargs):
        return self

    def skip(self, n):
        self._items = self._items[n:]
        return self

    def limit(self, n):
        self._items = self._items[:n]
        return self

    def __aiter__(self):
        async def gen():
            for item in self._items:
                yield item

        return gen()


class FakeCollection:
    def __init__(self, docs: list[dict]):
        self.docs = docs

    def _matches(self, doc: dict, query: dict) -> bool:
        return all(doc.get(k) == v for k, v in query.items())

    async def distinct(self, field: str, query: dict | None = None):
        query = query or {}
        seen: list = []
        for doc in self.docs:
            if self._matches(doc, query):
                val = doc.get(field)
                if val not in seen:
                    seen.append(val)
        return seen

    def find(self, query: dict | None = None):
        query = query or {}
        return FakeCursor([d for d in self.docs if self._matches(d, query)])


class FakeDB:
    def __init__(self, docs: list[dict]):
        self.videos = FakeCollection(docs)


def test_distribute_includes_uploads_alongside_channel_videos():
    docs = [
        make_doc("u1", None, source="upload"),
        make_doc("u2", None, source="upload"),
        make_doc("y1", "UCabc"),
        make_doc("y2", "UCabc"),
        make_doc("y3", "UCabc"),
    ]
    fake = FakeDB(docs)
    with patch("app.routers.videos.get_db", return_value=fake):
        response = client.get("/api/videos", params={"limit": 10, "distribute": "true"})

    assert response.status_code == 200
    ids = {v["id"] for v in response.json()}
    assert "u1" in ids and "u2" in ids  # uploads must not be silently excluded
    assert "y1" in ids


def test_distribute_with_only_uploads_returns_them():
    # Before any YouTube channel exists, every video has channel_id=None - the
    # single "no channel" bucket must not be mistaken for "no videos at all".
    docs = [make_doc("u1", None, source="upload"), make_doc("u2", None, source="upload")]
    fake = FakeDB(docs)
    with patch("app.routers.videos.get_db", return_value=fake):
        response = client.get("/api/videos", params={"limit": 10, "distribute": "true"})

    assert response.status_code == 200
    ids = {v["id"] for v in response.json()}
    assert ids == {"u1", "u2"}


def test_distribute_balances_across_channels_and_uploads():
    # One prolific channel (5 videos) must not crowd out a smaller channel (1
    # video) or uploads (1 video) - each source gets a fair share of the slots.
    docs = (
        [make_doc(f"y{i}", "UCbig") for i in range(5)]
        + [make_doc("y_small", "UCsmall")]
        + [make_doc("u1", None, source="upload")]
    )
    fake = FakeDB(docs)
    with patch("app.routers.videos.get_db", return_value=fake):
        response = client.get("/api/videos", params={"limit": 3, "distribute": "true"})

    assert response.status_code == 200
    ids = {v["id"] for v in response.json()}
    assert "y_small" in ids
    assert "u1" in ids
