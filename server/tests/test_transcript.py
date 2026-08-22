import json
from pathlib import Path
from unittest.mock import patch

from app.services.transcript import CHUNK_SECONDS, generate_transcript


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


def make_fake_split(num_chunks: int):
    """Stand-in for ffmpeg's segment split - writes N placeholder chunk files."""

    def fake_split(audio_path: str, output_dir: str) -> list[str]:
        paths = []
        for i in range(num_chunks):
            chunk = Path(output_dir) / f"chunk_{i:03d}.mp3"
            chunk.write_bytes(f"fake chunk {i}".encode())
            paths.append(str(chunk))
        return paths

    return fake_split


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
        patch("app.services.transcript._split_audio", side_effect=make_fake_split(1)),
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
        patch("app.services.transcript._split_audio", side_effect=make_fake_split(1)),
        patch("urllib.request.urlopen", return_value=FakeResponse({"segments": []})),
    ):
        assert generate_transcript("key", str(video)) == []


def test_generate_transcript_missing_segments_key_returns_empty_list(tmp_path):
    # Defends against an unexpected/error-shaped API response not crashing the caller.
    video = tmp_path / "video.mp4"
    video.write_bytes(b"x")
    with (
        patch("app.services.transcript._extract_audio", side_effect=fake_extract_audio),
        patch("app.services.transcript._split_audio", side_effect=make_fake_split(1)),
        patch("urllib.request.urlopen", return_value=FakeResponse({"unexpected": "shape"})),
    ):
        assert generate_transcript("key", str(video)) == []


def test_generate_transcript_missing_file_raises_file_not_found():
    try:
        generate_transcript("key", "/nonexistent/path/video.mp4")
        assert False, "expected FileNotFoundError"
    except FileNotFoundError:
        pass


def test_generate_transcript_no_chunks_returns_empty_list(tmp_path):
    video = tmp_path / "empty.mp4"
    video.write_bytes(b"x")
    with (
        patch("app.services.transcript._extract_audio", side_effect=fake_extract_audio),
        patch("app.services.transcript._split_audio", side_effect=make_fake_split(0)),
    ):
        assert generate_transcript("key", str(video)) == []


# --- chunking: the actual bug fix (long audio exceeding Groq's upload limit) ---


def test_generate_transcript_multiple_chunks_offsets_timestamps_and_preserves_order(tmp_path):
    video = tmp_path / "long_lecture.mp4"
    video.write_bytes(b"x")
    chunk0_payload = {"segments": [{"start": 0.0, "end": 5.0, "text": "First chunk."}]}
    chunk1_payload = {"segments": [{"start": 0.0, "end": 3.0, "text": "Second chunk."}]}
    with (
        patch("app.services.transcript._extract_audio", side_effect=fake_extract_audio),
        patch("app.services.transcript._split_audio", side_effect=make_fake_split(2)),
        patch(
            "urllib.request.urlopen",
            side_effect=[FakeResponse(chunk0_payload), FakeResponse(chunk1_payload)],
        ),
    ):
        result = generate_transcript("key", str(video))
    assert result == [
        {"start": 0.0, "end": 5.0, "text": "First chunk."},
        {"start": CHUNK_SECONDS + 0.0, "end": CHUNK_SECONDS + 3.0, "text": "Second chunk."},
    ]


def test_generate_transcript_one_chunk_failing_fails_the_whole_call(tmp_path):
    # A failure partway through a long lecture must surface clearly rather than
    # silently returning a partial/corrupt transcript.
    video = tmp_path / "long_lecture.mp4"
    video.write_bytes(b"x")
    chunk0_payload = {"segments": [{"start": 0.0, "end": 5.0, "text": "First chunk."}]}
    with (
        patch("app.services.transcript._extract_audio", side_effect=fake_extract_audio),
        patch("app.services.transcript._split_audio", side_effect=make_fake_split(2)),
        patch(
            "urllib.request.urlopen",
            side_effect=[FakeResponse(chunk0_payload), ValueError("simulated chunk 2 failure")],
        ),
    ):
        try:
            generate_transcript("key", str(video))
            assert False, "expected the second chunk's failure to propagate"
        except ValueError:
            pass


# --- security ---


def test_api_key_sent_as_header_not_in_request_body(tmp_path):
    video = tmp_path / "video.mp4"
    video.write_bytes(b"fake bytes")
    with (
        patch("app.services.transcript._extract_audio", side_effect=fake_extract_audio),
        patch("app.services.transcript._split_audio", side_effect=make_fake_split(1)),
        patch("urllib.request.urlopen", return_value=FakeResponse({"segments": []})) as mock_urlopen,
    ):
        generate_transcript("SUPER_SECRET_KEY", str(video))
    request = mock_urlopen.call_args.args[0]
    assert request.headers.get("Authorization") == "Bearer SUPER_SECRET_KEY"
    assert b"SUPER_SECRET_KEY" not in request.data


def test_uploaded_filename_is_always_audio_mp3_never_the_original_path(tmp_path):
    # Each chunk is always uploaded under a fixed filename, so a caller-supplied
    # path (however it's constructed) never reaches the multipart filename field.
    subdir = tmp_path / "uploads"
    subdir.mkdir()
    video = subdir / "..secret_dir_name..mp4"
    video.write_bytes(b"x")
    with (
        patch("app.services.transcript._extract_audio", side_effect=fake_extract_audio),
        patch("app.services.transcript._split_audio", side_effect=make_fake_split(1)),
        patch("urllib.request.urlopen", return_value=FakeResponse({"segments": []})) as mock_urlopen,
    ):
        generate_transcript("key", str(video))
    request = mock_urlopen.call_args.args[0]
    assert b'filename="audio.mp3"' in request.data
    assert str(subdir).encode() not in request.data
