from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class FakeCollection:
    def __init__(self, docs: dict | None = None):
        self.docs = docs or {}

    async def insert_one(self, doc):
        self.docs[doc["_id"]] = doc


class FakeDB:
    def __init__(self):
        self.videos = FakeCollection()


# --- POST /api/uploads/preprocess ---


def test_preprocess_missing_file_returns_404():
    with patch("app.routers.preprocess.UPLOADS_DIR", Path("/nonexistent/uploads")):
        response = client.post(
            "/api/uploads/preprocess",
            json={
                "filename": "missing.mp4",
                "transcript_api_key": "groq-key",
                "title_provider": "openai",
                "title_api_key": "openai-key",
            },
        )
    assert response.status_code == 404


def test_preprocess_happy_path_returns_clips_with_flat_filenames(tmp_path):
    uploads_dir = tmp_path / "uploads"
    uploads_dir.mkdir()
    source = uploads_dir / "lecture.mp4"
    source.write_bytes(b"fake video")

    fake_transcript = [{"start": 0.0, "end": 5.0, "text": "hello"}]
    fake_boundaries = [{"start_seconds": 0.0, "end_seconds": 5.0, "title": "Intro"}]

    def fake_cut_clips(source_path, clips, output_dir):
        out = Path(output_dir) / "clip_00.mp4"
        out.write_bytes(b"fake clip")
        return [{**clips[0], "file_path": str(out)}]

    with (
        patch("app.routers.preprocess.UPLOADS_DIR", uploads_dir),
        patch("app.routers.preprocess.generate_transcript", return_value=fake_transcript),
        patch("app.routers.preprocess.segment_transcript", return_value=fake_boundaries),
        patch("app.routers.preprocess.cut_clips", side_effect=fake_cut_clips),
    ):
        response = client.post(
            "/api/uploads/preprocess",
            json={
                "filename": "lecture.mp4",
                "transcript_api_key": "groq-key",
                "title_provider": "openai",
                "title_api_key": "openai-key",
            },
        )

    assert response.status_code == 200
    body = response.json()
    assert len(body["clips"]) == 1
    clip = body["clips"][0]
    assert clip["title"] == "Intro"
    assert (uploads_dir / clip["filename"]).exists()


def test_preprocess_filename_path_traversal_is_stripped_to_basename(tmp_path):
    uploads_dir = tmp_path / "uploads"
    uploads_dir.mkdir()
    with patch("app.routers.preprocess.UPLOADS_DIR", uploads_dir):
        response = client.post(
            "/api/uploads/preprocess",
            json={
                "filename": "../../etc/passwd",
                "transcript_api_key": "k",
                "title_provider": "openai",
                "title_api_key": "k",
            },
        )
    # basenamed to "passwd" inside uploads_dir, which doesn't exist -> 404, not a traversal read
    assert response.status_code == 404


def test_preprocess_pipeline_failure_returns_502_not_500(tmp_path):
    uploads_dir = tmp_path / "uploads"
    uploads_dir.mkdir()
    (uploads_dir / "lecture.mp4").write_bytes(b"x")
    with (
        patch("app.routers.preprocess.UPLOADS_DIR", uploads_dir),
        patch("app.routers.preprocess.generate_transcript", side_effect=ValueError("boom")),
    ):
        response = client.post(
            "/api/uploads/preprocess",
            json={
                "filename": "lecture.mp4",
                "transcript_api_key": "k",
                "title_provider": "openai",
                "title_api_key": "k",
            },
        )
    assert response.status_code == 502


def test_preprocess_invalid_title_provider_returns_422(tmp_path):
    uploads_dir = tmp_path / "uploads"
    uploads_dir.mkdir()
    (uploads_dir / "lecture.mp4").write_bytes(b"x")
    with patch("app.routers.preprocess.UPLOADS_DIR", uploads_dir):
        response = client.post(
            "/api/uploads/preprocess",
            json={
                "filename": "lecture.mp4",
                "transcript_api_key": "k",
                "title_provider": "made-up",
                "title_api_key": "k",
            },
        )
    assert response.status_code == 422


# --- security: API keys must never appear in the response ---


def test_preprocess_keys_never_appear_in_response(tmp_path):
    uploads_dir = tmp_path / "uploads"
    uploads_dir.mkdir()
    (uploads_dir / "lecture.mp4").write_bytes(b"x")
    with (
        patch("app.routers.preprocess.UPLOADS_DIR", uploads_dir),
        patch("app.routers.preprocess.generate_transcript", side_effect=ValueError("boom")),
    ):
        response = client.post(
            "/api/uploads/preprocess",
            json={
                "filename": "lecture.mp4",
                "transcript_api_key": "GROQ_SECRET",
                "title_provider": "openai",
                "title_api_key": "OPENAI_SECRET",
            },
        )
    assert "GROQ_SECRET" not in response.text
    assert "OPENAI_SECRET" not in response.text


# --- POST /api/uploads/publish ---


def test_publish_persists_each_clip_as_a_separate_video():
    fake_db = FakeDB()
    with patch("app.routers.preprocess.get_db", return_value=fake_db):
        response = client.post(
            "/api/uploads/publish",
            json={
                "clips": [
                    {"title": "Part 1", "start_seconds": 0, "end_seconds": 300, "filename": "a.mp4"},
                    {"title": "Part 2", "start_seconds": 300, "end_seconds": 600, "filename": "b.mp4"},
                ]
            },
        )
    assert response.status_code == 200
    assert len(fake_db.videos.docs) == 2
    titles = {doc["original_title"] for doc in fake_db.videos.docs.values()}
    assert titles == {"Part 1", "Part 2"}


def test_publish_empty_clips_persists_nothing():
    fake_db = FakeDB()
    with patch("app.routers.preprocess.get_db", return_value=fake_db):
        response = client.post("/api/uploads/publish", json={"clips": []})
    assert response.status_code == 200
    assert fake_db.videos.docs == {}


def test_publish_stores_source_as_upload_and_computed_duration():
    fake_db = FakeDB()
    with patch("app.routers.preprocess.get_db", return_value=fake_db):
        client.post(
            "/api/uploads/publish",
            json={"clips": [{"title": "Part 1", "start_seconds": 10, "end_seconds": 130, "filename": "a.mp4"}]},
        )
    doc = next(iter(fake_db.videos.docs.values()))
    assert doc["source"] == "upload"
    assert doc["duration_seconds"] == 120
    assert doc["file_path"] == "a.mp4"
