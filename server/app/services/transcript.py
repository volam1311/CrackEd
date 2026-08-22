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


def generate_transcript(api_key: str, file_path: str) -> list[dict]:
    """Transcribe a local video/audio file, returning timestamped segments."""
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"No such file: {file_path}")

    with tempfile.TemporaryDirectory() as tmp_dir:
        audio_path = str(Path(tmp_dir) / "audio.mp3")
        _extract_audio(str(path), audio_path)
        file_bytes = Path(audio_path).read_bytes()
        body, content_type = _encode_multipart(
            {"model": MODEL, "response_format": "verbose_json"}, "audio.mp3", file_bytes
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
