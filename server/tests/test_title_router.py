from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class FakeCollection:
    def __init__(self, docs: dict | None = None):
        self.docs = docs or {}

    async def find_one(self, filt):
        return self.docs.get(filt["_id"])

    async def update_one(self, filt, update):
        doc = self.docs.get(filt["_id"])
        if doc is not None:
            doc.update(update["$set"])


class FakeDB:
    def __init__(self, videos: dict | None = None):
        self.videos = FakeCollection(videos)


def test_rewrite_title_video_not_found_returns_404():
    fake_db = FakeDB(videos={})
    with patch("app.routers.title.get_db", return_value=fake_db):
        response = client.post(
            "/api/videos/missing/title",
            json={"provider": "openai", "api_key": "user-key"},
        )
    assert response.status_code == 404


def test_rewrite_title_success_persists_display_title():
    fake_db = FakeDB(videos={"v1": {"_id": "v1", "original_title": "Boring Title", "description": "desc"}})
    with (
        patch("app.routers.title.get_db", return_value=fake_db),
        patch("app.routers.title.rewrite_title", return_value="Exciting New Title"),
    ):
        response = client.post(
            "/api/videos/v1/title",
            json={"provider": "gemini", "api_key": "user-key"},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["original_title"] == "Boring Title"
    assert body["display_title"] == "Exciting New Title"
    assert fake_db.videos.docs["v1"]["display_title"] == "Exciting New Title"


def test_rewrite_title_provider_failure_returns_502_not_500():
    fake_db = FakeDB(videos={"v1": {"_id": "v1", "original_title": "Title", "description": ""}})
    with (
        patch("app.routers.title.get_db", return_value=fake_db),
        patch("app.routers.title.rewrite_title", side_effect=ValueError("boom")),
    ):
        response = client.post(
            "/api/videos/v1/title",
            json={"provider": "openai", "api_key": "user-key"},
        )
    assert response.status_code == 502


def test_rewrite_title_invalid_provider_returns_422():
    fake_db = FakeDB(videos={"v1": {"_id": "v1", "original_title": "Title", "description": ""}})
    with patch("app.routers.title.get_db", return_value=fake_db):
        response = client.post(
            "/api/videos/v1/title",
            json={"provider": "made-up", "api_key": "user-key"},
        )
    assert response.status_code == 422


def test_rewrite_title_user_supplied_key_never_appears_in_response():
    fake_db = FakeDB(videos={"v1": {"_id": "v1", "original_title": "Title", "description": ""}})
    with (
        patch("app.routers.title.get_db", return_value=fake_db),
        patch("app.routers.title.rewrite_title", side_effect=ValueError("boom")),
    ):
        response = client.post(
            "/api/videos/v1/title",
            json={"provider": "openai", "api_key": "USER_SUPPLIED_SECRET"},
        )
    assert "USER_SUPPLIED_SECRET" not in response.text
