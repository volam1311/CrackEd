import mimetypes
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
