"""Speech-to-text for uploaded videos, via the user's own Groq key (BYOK).

Groq's endpoint mirrors OpenAI's Whisper API exactly (same request/response
shape), just far faster and with a generous free tier. Anthropic has no audio
endpoint, and Gemini's audio path needs its separate Files API - can be added
later if needed.
"""

import json
import subprocess
import tempfile
import urllib.request
import uuid
from pathlib import Path

GROQ_TRANSCRIPTION_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
MODEL = "whisper-large-v3-turbo"
CHUNK_SECONDS = 600  # ~4.7MB at 64kbps mono - comfortably under Groq's upload limit


def _extract_audio(video_path: str, audio_path: str) -> None:
    """Pull just the audio track out as low-bitrate mono mp3 - Whisper only needs
    speech, and this keeps uploads well under Groq's file size limit."""
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", video_path,
            "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k",
            audio_path,
        ],
        check=True,
        capture_output=True,
    )


def _split_audio(audio_path: str, output_dir: str) -> list[str]:
    """Split audio into fixed-length chunks - a single long lecture's full audio
    can still exceed the upload limit even after compression, so it's chunked
    regardless of length rather than only when it happens to be too big."""
    pattern = str(Path(output_dir) / "chunk_%03d.mp3")
    subprocess.run(
        ["ffmpeg", "-y", "-i", audio_path, "-f", "segment", "-segment_time", str(CHUNK_SECONDS), "-c", "copy", pattern],
        check=True,
        capture_output=True,
    )
    return sorted(str(p) for p in Path(output_dir).glob("chunk_*.mp3"))


def _encode_multipart(fields: dict[str, str], filename: str, file_bytes: bytes) -> tuple[bytes, str]:
    boundary = uuid.uuid4().hex
    parts: list[bytes] = []
    for key, value in fields.items():
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
    parts.append(
        f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: application/octet-stream\r\n\r\n".encode()
    )
    parts.append(file_bytes)
    parts.append(f"\r\n--{boundary}--\r\n".encode())
    return b"".join(parts), f"multipart/form-data; boundary={boundary}"


def _transcribe_chunk(api_key: str, chunk_bytes: bytes) -> list[dict]:
    body, content_type = _encode_multipart(
        {"model": MODEL, "response_format": "verbose_json"}, "audio.mp3", chunk_bytes
    )
    req = urllib.request.Request(
        GROQ_TRANSCRIPTION_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": content_type,
            # urllib's default UA reads as bot-like to some edges/WAFs; a normal
            # browser-style UA avoids getting blocked before the request is even routed.
            "User-Agent": "Mozilla/5.0 (compatible; CrackEd/1.0)",
        },
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
    return [
        {"start": seg["start"], "end": seg["end"], "text": seg["text"].strip()}
        for seg in data.get("segments", [])
    ]


def generate_transcript(api_key: str, file_path: str) -> list[dict]:
    """Transcribe a local video/audio file, returning timestamped segments."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"No such file: {file_path}")

    with tempfile.TemporaryDirectory() as tmp_dir:
        audio_path = str(Path(tmp_dir) / "audio.mp3")
        _extract_audio(str(path), audio_path)
        chunk_paths = _split_audio(audio_path, tmp_dir)

        transcript: list[dict] = []
        for i, chunk_path in enumerate(chunk_paths):
            offset = i * CHUNK_SECONDS
            chunk_bytes = Path(chunk_path).read_bytes()
            for seg in _transcribe_chunk(api_key, chunk_bytes):
                transcript.append({"start": seg["start"] + offset, "end": seg["end"] + offset, "text": seg["text"]})

    return transcript
