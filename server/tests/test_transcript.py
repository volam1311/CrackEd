import json
from pathlib import Path
from unittest.mock import patch

from app.services.transcript import generate_transcript


class FakeResponse:
    def __init__(self, data: dict):
        self._data = json.dumps(data).encode()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self) -> bytes:
        return self._data


def fake_extract_audio(video_path: str, audio_path: str) -> None:
    """Stand-in for ffmpeg - just writes placeholder bytes to where the real
    extraction would have written the audio file."""
    Path(audio_path).write_bytes(b"fake audio bytes")


def test_generate_transcript_happy_path(tmp_path):
    video = tmp_path / "lecture.mp4"
    video.write_bytes(b"fake video bytes")
    payload = {
        "segments": [
            {"start": 0.0, "end": 4.2, "text": " Welcome to the lecture. "},
            {"start": 4.2, "end": 9.8, "text": " Today we cover linear regression. "},
        ]
    }
    with (
        patch("app.services.transcript._extract_audio", side_effect=fake_extract_audio),
        patch("urllib.request.urlopen", return_value=FakeResponse(payload)),
    ):
        result = generate_transcript("key", str(video))
    assert result == [
        {"start": 0.0, "end": 4.2, "text": "Welcome to the lecture."},
        {"start": 4.2, "end": 9.8, "text": "Today we cover linear regression."},
    ]


def test_generate_transcript_empty_segments_returns_empty_list(tmp_path):
    video = tmp_path / "silent.mp4"
    video.write_bytes(b"x")
    with (
        patch("app.services.transcript._extract_audio", side_effect=fake_extract_audio),
        patch("urllib.request.urlopen", return_value=FakeResponse({"segments": []})),
    ):
        assert generate_transcript("key", str(video)) == []


def test_generate_transcript_missing_segments_key_returns_empty_list(tmp_path):
    # Defends against an unexpected/error-shaped API response not crashing the caller.
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x")
    with (
        patch("app.services.transcript._extract_audio", side_effect=fake_extract_audio),
        patch("urllib.request.urlopen", return_value=FakeResponse({"unexpected": "shape"})),
    ):
        assert generate_transcript("key", str(video)) == []


def test_generate_transcript_missing_file_raises_file_not_found():
    try:
        generate_transcript("key", "/nonexistent/path/video.mp4")
        assert False, "expected FileNotFoundError"
    except FileNotFoundError:
        pass


# --- security ---


def test_api_key_sent_as_header_not_in_request_body(tmp_path):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"fake bytes")
    with (
        patch("app.services.transcript._extract_audio", side_effect=fake_extract_audio),
        patch("urllib.request.urlopen", return_value=FakeResponse({"segments": []})) as mock_urlopen,
    ):
        generate_transcript("SUPER_SECRET_KEY", str(video))
    request = mock_urlopen.call_args.args[0]
    assert request.headers.get("Authorization") == "Bearer SUPER_SECRET_KEY"
    assert b"SUPER_SECRET_KEY" not in request.data


def test_uploaded_filename_is_always_audio_mp3_never_the_original_path(tmp_path):
    # The extracted audio is always written to a fixed temp filename, so a
    # caller-supplied path (however it's constructed) never reaches the
    # multipart filename field sent to the API.
    subdir = tmp_path / "uploads"
    subdir.mkdir()
    video = subdir / "..secret_dir_name..mp4"
    video.write_bytes(b"x")
    with (
        patch("app.services.transcript._extract_audio", side_effect=fake_extract_audio),
        patch("urllib.request.urlopen", return_value=FakeResponse({"segments": []})) as mock_urlopen,
    ):
        generate_transcript("key", str(video))
    request = mock_urlopen.call_args.args[0]
    assert b'filename="audio.mp3"' in request.data
    assert str(subdir).encode() not in request.data
