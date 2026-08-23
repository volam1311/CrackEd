"""GET /api/videos?series_id=... returns a split upload's clips in order."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def make_doc(video_id: str, series_id: str | None, part_number: int | None) -> dict:
    return {
        "_id": video_id,
        "source": "upload",
        "original_title": video_id,
        "display_title": video_id,
        "description": None,
        "channel_id": None,
        "channel_title": None,
        "thumbnail_url": None,
        "duration_seconds": 60,
        "published_at": None,
        "embeddable": True,
        "file_path": f"{video_id}.mp4",
        "series_id": series_id,
        "part_number": part_number,
        "total_parts": 3 if series_id else None,
        "created_at": "2026-08-22T00:00:00",
    }


class FakeCursor:
    def __init__(self, items):
        self._items = items

    def sort(self, field, direction):
        self._items = sorted(self._items, key=lambda d: d[field], reverse=direction < 0)
        return self

    def __aiter__(self):
        async def gen():
            for item in self._items:
                yield item

        return gen()


class FakeCollection:
    def __init__(self, docs: list[dict]):
        self.docs = docs

    def find(self, query: dict | None = None):
        query = query or {}
        return FakeCursor([d for d in self.docs if all(d.get(k) == v for k, v in query.items())])


class FakeDB:
    def __init__(self, docs: list[dict]):
        self.videos = FakeCollection(docs)


def test_series_id_returns_only_that_series_ordered_by_part_number():
    docs = [
        make_doc("c", "series-1", 3),
        make_doc("a", "series-1", 1),
        make_doc("b", "series-1", 2),
        make_doc("other", "series-2", 1),  # a different series - must not leak in
        make_doc("upload", None, None),  # a non-split upload - must not leak in
    ]
    fake = FakeDB(docs)
    with patch("app.routers.videos.get_db", return_value=fake):
        response = client.get("/api/videos", params={"series_id": "series-1"})

    assert response.status_code == 200
    ids = [v["id"] for v in response.json()]
    assert ids == ["a", "b", "c"]
