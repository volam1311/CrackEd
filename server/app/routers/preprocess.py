"""Review + publish endpoints tying transcript -> segmentation -> cutting together."""

import logging
import shutil
import tempfile
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import get_db
from app.services.segmentation import segment_transcript
from app.services.transcript import generate_transcript
from app.services.video_cutter import cut_clips

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/uploads", tags=["preprocess"])
UPLOADS_DIR = Path("/app/uploads")


class PreprocessRequest(BaseModel):
    filename: str
    transcript_api_key: str  # Groq key
    title_provider: Literal["openai", "anthropic", "gemini"]
    title_api_key: str


class ClipIn(BaseModel):
    title: str
    start_seconds: float
    end_seconds: float
    filename: str


class PublishRequest(BaseModel):
    clips: list[ClipIn]


@router.post("/preprocess")
def preprocess(request: PreprocessRequest) -> dict:
    """Run transcript -> segmentation -> cutting for an already-uploaded file.

    Nothing is persisted here - clips are suggestions for the user to review
    and edit before /publish saves the final set.
    """
    source_path = UPLOADS_DIR / Path(request.filename).name  # basename only, no traversal
    if not source_path.exists():
        raise HTTPException(status_code=404, detail="Uploaded file not found")

    try:
        transcript = generate_transcript(request.transcript_api_key, str(source_path))
        total_duration = transcript[-1]["end"] if transcript else 0.0
        boundaries = segment_transcript(
            request.title_provider, request.title_api_key, transcript, total_duration
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            cut = cut_clips(str(source_path), boundaries, tmp_dir)
            clips = []
            for c in cut:
                # flatten into UPLOADS_DIR with a unique name so the existing
                # GET /api/uploads/{filename} route can serve it unmodified
                flat_name = f"{uuid.uuid4().hex}.mp4"
                # tmp_dir and UPLOADS_DIR are separate mounts (volume vs tmpfs) in
                # Docker, so a plain rename() fails with EXDEV; shutil.move handles it.
                shutil.move(c["file_path"], str(UPLOADS_DIR / flat_name))
                clips.append(
                    {
                        "title": c["title"],
                        "start_seconds": c["start_seconds"],
                        "end_seconds": c["end_seconds"],
                        "filename": flat_name,
                    }
                )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Preprocessing failed for %s", request.filename)
        raise HTTPException(status_code=502, detail="Preprocessing failed") from e

    return {"clips": clips}


@router.post("/publish")
async def publish(request: PublishRequest) -> dict:
    """Persist the user-reviewed clip list as separate Video records."""
    db = get_db()
    now = datetime.now(UTC)
    created = []
    for clip in request.clips:
        doc = {
            "_id": uuid.uuid4().hex,
            "source": "upload",
            "original_title": clip.title,
            "display_title": clip.title,
            "description": None,
            "channel_id": None,
            "channel_title": None,
            "thumbnail_url": None,
            "duration_seconds": round(clip.end_seconds - clip.start_seconds),
            "published_at": now,
            "embeddable": True,
            "file_path": clip.filename,
            "created_at": now,
        }
        await db.videos.insert_one(doc)
        created.append(doc)
    return {"published": created}
