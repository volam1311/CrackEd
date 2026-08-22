from unittest.mock import patch
from urllib.error import HTTPError

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def make_raw_video(video_id: str) -> dict:
    return {
        "id": video_id,
        "snippet": {
            "publishedAt": "2026-08-18T16:00:07Z",
            "channelId": "UCabc",
            "title": f"Title {video_id}",
            "description": "desc",
            "thumbnails": {"default": {"url": f"https://i.ytimg.com/vi/{video_id}/default.jpg"}},
            "channelTitle": "Some Channel",
        },
        "contentDetails": {"duration": "PT1M0S"},
        "status": {"embeddable": True, "privacyStatus": "public"},
    }


class FakeCursor:
    def __init__(self, items):
        self._items = items

    def __aiter__(self):
        async def gen():
            for item in self._items:
                yield item

        return gen()


class FakeCollection:
    def __init__(self, docs: dict | None = None):
        self.docs = docs or {}

    def find(self):
        return FakeCursor(list(self.docs.values()))

    async def find_one(self, filt):
        return self.docs.get(filt["_id"])

    async def insert_one(self, doc):
        self.docs[doc["_id"]] = doc


class FakeDB:
    def __init__(self, channels: dict | None = None, videos: dict | None = None):
        self.channels = FakeCollection(channels)
        self.videos = FakeCollection(videos)


def post_fetch(api_key: str = "test-key"):
    """/api/fetch is BYOK - the key travels in the request body, not the environment."""
    return client.post("/api/fetch", json={"youtube_api_key": api_key})


def test_fetch_without_api_key_is_rejected():
    """The key is a required body field, so omitting it fails validation."""
    response = client.post("/api/fetch", json={})
    assert response.status_code == 422


def test_fetch_with_empty_whitelist_returns_400():
    """Fetching with nothing whitelisted is a caller error, not a silent no-op."""
    fake_db = FakeDB()
    with patch("app.routers.fetch.get_db", return_value=fake_db):
        response = post_fetch()
    assert response.status_code == 400
    assert "channels" in response.json()["detail"].lower()


def test_fetch_skips_already_stored_videos():
    fake_db = FakeDB(
        channels={"UCabc": {"_id": "UCabc"}},
        videos={"v1": {"_id": "v1"}},
    )
    with (
        patch("app.routers.fetch.get_db", return_value=fake_db),
        patch("app.routers.fetch.get_uploads_playlist_id", return_value="UUabc"),
        patch("app.routers.fetch.list_playlist_video_ids", return_value=["v1"]),
        patch("app.routers.fetch.get_videos_metadata", return_value=[make_raw_video("v1")]),
    ):
        response = post_fetch()
    body = response.json()
    assert body["videos_added"] == 0
    assert body["videos_skipped"] == 1


def test_fetch_isolates_one_bad_channel_from_the_rest():
    # A channel that fails to resolve (deleted/invalid ID) must not stop the
    # good channel from being processed - this is the partial-failure guarantee
    # the whitelist-driven fetch button depends on.
    fake_db = FakeDB(channels={"good": {"_id": "good"}, "bad": {"_id": "bad"}})

    def fake_uploads_playlist(api_key, channel_id):
        if channel_id == "bad":
            raise ValueError(f"No channel found for ID {channel_id}")
        return "UUgood"

    with (
        patch("app.routers.fetch.get_db", return_value=fake_db),
        patch("app.routers.fetch.get_uploads_playlist_id", side_effect=fake_uploads_playlist),
        patch("app.routers.fetch.list_playlist_video_ids", return_value=["v1"]),
        patch("app.routers.fetch.get_videos_metadata", return_value=[make_raw_video("v1")]),
    ):
        response = post_fetch()
    body = response.json()
    assert response.status_code == 200
    assert body["channels_failed"] == ["bad"]
    assert body["channels_processed"] == 1
    assert body["videos_added"] == 1


def test_fetch_caps_videos_fetched_per_channel():
    # A channel with far more uploads than MAX_VIDEOS_PER_CHANNEL must not have
    # metadata fetched (or stored) for all of them - only the most recent slice.
    fake_db = FakeDB(channels={"prolific": {"_id": "prolific"}})
    all_video_ids = [f"v{i}" for i in range(250)]

    def fake_get_metadata(api_key, video_ids):
        return [make_raw_video(vid) for vid in video_ids]

    with (
        patch("app.routers.fetch.get_db", return_value=fake_db),
        patch("app.routers.fetch.get_uploads_playlist_id", return_value="UUprolific"),
        patch("app.routers.fetch.list_playlist_video_ids", return_value=all_video_ids),
        patch("app.routers.fetch.get_videos_metadata", side_effect=fake_get_metadata) as mock_get_metadata,
    ):
        response = post_fetch()

    assert response.status_code == 200
    assert response.json()["videos_added"] == 100
    requested_ids = mock_get_metadata.call_args.args[1]
    assert requested_ids == all_video_ids[:100]


def test_fetch_isolates_http_error_from_youtube_api():
    fake_db = FakeDB(channels={"quota-blocked": {"_id": "quota-blocked"}})
    http_error = HTTPError("url", 403, "quotaExceeded", hdrs=None, fp=None)  # type: ignore[arg-type]
    with (
        patch("app.routers.fetch.get_db", return_value=fake_db),
        patch("app.routers.fetch.get_uploads_playlist_id", side_effect=http_error),
    ):
        response = post_fetch()
    body = response.json()
    assert response.status_code == 200
    assert body["channels_failed"] == ["quota-blocked"]


# --- security: the API key must never appear in a response body ---


def test_fetch_success_response_never_contains_api_key():
    fake_db = FakeDB(channels={"UCabc": {"_id": "UCabc"}})
    with (
        patch("app.routers.fetch.get_db", return_value=fake_db),
        patch("app.routers.fetch.get_uploads_playlist_id", return_value="UUabc"),
        patch("app.routers.fetch.list_playlist_video_ids", return_value=["v1"]),
        patch("app.routers.fetch.get_videos_metadata", return_value=[make_raw_video("v1")]),
    ):
        response = post_fetch("SUPER_SECRET_KEY")
    assert response.status_code == 200
    assert "SUPER_SECRET_KEY" not in response.text


def test_fetch_failure_response_never_contains_api_key():
    fake_db = FakeDB(channels={"bad": {"_id": "bad"}})
    with (
        patch("app.routers.fetch.get_db", return_value=fake_db),
        patch("app.routers.fetch.get_uploads_playlist_id", side_effect=ValueError("No channel found for ID bad")),
    ):
        response = post_fetch("SUPER_SECRET_KEY")
    assert response.status_code == 200
    assert "SUPER_SECRET_KEY" not in response.text
