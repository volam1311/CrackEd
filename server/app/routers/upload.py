import mimetypes
import subprocess
import uuid
from pathlib import Path

import anyio
from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

UPLOADS_DIR = Path("/app/uploads")

router = APIRouter(tags=["upload"])

# The upload UI accepts .mp4/.mov/.mkv, so the stream endpoint must not claim
# every file is video/mp4 — a mislabelled container is one of the ways playback
# fails silently with a black player.
MEDIA_TYPES = {
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".webm": "video/webm",
}


# Only ISO-BMFF containers have a moov atom to relocate; +faststart is
# meaningless (and rejected) for Matroska/WebM.
FASTSTART_SUFFIXES = {".mp4", ".m4v", ".mov"}


def _remux_faststart(path: Path) -> bool:
    """Rewrite the file with its moov atom at the front. Returns True if it changed.

    A recording whose moov atom trails the media data cannot be progressively
    played: the browser has no index until the whole file arrives, so <video>
    sits at readyState 0 showing a black frame and never even fires an error.
    This is a stream copy, so it costs no quality and no re-encode.
    """
    if path.suffix.lower() not in FASTSTART_SUFFIXES:
        return False

    remuxed = path.with_name(f"{path.stem}.faststart{path.suffix}")
    try:
        subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", str(path),
                "-c", "copy",
                "-movflags", "+faststart",
                str(remuxed),
            ],
            check=True,
            capture_output=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError, OSError):
        # Keep whatever was uploaded: a file that might not stream still beats
        # losing the upload outright.
        remuxed.unlink(missing_ok=True)
        return False

    remuxed.replace(path)
    return True


@router.post("/api/upload")
async def upload_file(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    suffix = Path(file.filename).suffix
    saved_name = f"{uuid.uuid4().hex}{suffix}"
    dest = UPLOADS_DIR / saved_name

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    # Async file IO: a blocking write would stall the event loop for the whole
    # upload, and this endpoint accepts files up to several GB.
    async with await anyio.open_file(dest, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            await f.write(chunk)

    # Run off the event loop: ffmpeg is a blocking subprocess.
    await anyio.to_thread.run_sync(_remux_faststart, dest)

    return {"filename": saved_name, "url": f"/api/uploads/{saved_name}"}


@router.get("/api/uploads/{filename}")
async def stream_file(filename: str):
    safe_name = Path(filename).name
    file_path = UPLOADS_DIR / safe_name

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    suffix = file_path.suffix.lower()
    media_type = (
        MEDIA_TYPES.get(suffix)
        or mimetypes.guess_type(safe_name)[0]
        or "application/octet-stream"
    )

    # No `filename=` argument: passing one makes Starlette send
    # `Content-Disposition: attachment`, which asks the browser to download the
    # file rather than play it inline.
    return FileResponse(path=file_path, media_type=media_type)
