"""DELETE /api/channels/{id} must also remove that channel's videos."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class FakeCollection:
    def __init__(self, docs: dict | None = None):
        self.docs = docs or {}

    async def delete_one(self, filt):
        video_id = filt["_id"]
        if video_id in self.docs:
            del self.docs[video_id]
            return type("Result", (), {"deleted_count": 1})()
        return type("Result", (), {"deleted_count": 0})()

    async def delete_many(self, filt):
        channel_id = filt["channel_id"]
        to_remove = [k for k, v in self.docs.items() if v.get("channel_id") == channel_id]
        for k in to_remove:
            del self.docs[k]
        return type("Result", (), {"deleted_count": len(to_remove)})()


class FakeDB:
    def __init__(self, channels: dict | None = None, videos: dict | None = None):
        self.channels = FakeCollection(channels)
        self.videos = FakeCollection(videos)


def test_delete_channel_removes_its_videos_too():
    fake_db = FakeDB(
        channels={"UCabc": {"_id": "UCabc", "title": "Some Channel"}},
        videos={
            "v1": {"_id": "v1", "channel_id": "UCabc"},
            "v2": {"_id": "v2", "channel_id": "UCabc"},
        },
    )
    with patch("app.routers.channels.get_db", return_value=fake_db):
        response = client.delete("/api/channels/UCabc")
    assert response.status_code == 204
    assert fake_db.videos.docs == {}


def test_delete_channel_does_not_remove_other_channels_videos():
    fake_db = FakeDB(
        channels={"UCabc": {"_id": "UCabc"}},
        videos={
            "v1": {"_id": "v1", "channel_id": "UCabc"},
            "v2": {"_id": "v2", "channel_id": "UCxyz"},
            "v3": {"_id": "v3", "channel_id": None},  # an uploaded video, no channel
        },
    )
    with patch("app.routers.channels.get_db", return_value=fake_db):
        client.delete("/api/channels/UCabc")
    assert set(fake_db.videos.docs.keys()) == {"v2", "v3"}


def test_delete_nonexistent_channel_returns_404_and_touches_no_videos():
    fake_db = FakeDB(channels={}, videos={"v1": {"_id": "v1", "channel_id": "UCabc"}})
    with patch("app.routers.channels.get_db", return_value=fake_db):
        response = client.delete("/api/channels/does-not-exist")
    assert response.status_code == 404
    assert "v1" in fake_db.videos.docs
