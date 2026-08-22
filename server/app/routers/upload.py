import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

UPLOADS_DIR = Path("/app/uploads")

router = APIRouter(tags=["upload"])


@router.post("/api/upload")
async def upload_file(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    suffix = Path(file.filename).suffix
    saved_name = f"{uuid.uuid4().hex}{suffix}"
    dest = UPLOADS_DIR / saved_name

    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    with open(dest, "wb") as f:  # noqa: ASYNC230 - streaming write, acceptable for hackathon scope
        while chunk := await file.read(1024 * 1024):
            f.write(chunk)

    return {"filename": saved_name, "url": f"/api/uploads/{saved_name}"}


@router.get("/api/uploads/{filename}")
async def stream_file(filename: str):
    safe_name = Path(filename).name
    file_path = UPLOADS_DIR / safe_name

    if not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        media_type="video/mp4",
        filename=safe_name,
    )
