"""BYOK title rewrite for stored videos (YouTube-fetched or uploaded)."""

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import get_db
from app.services.title_rewrite import rewrite_title

router = APIRouter(prefix="/api/videos", tags=["videos"])


class RewriteTitleRequest(BaseModel):
    provider: Literal["openai", "anthropic", "gemini"]
    api_key: str


@router.post("/{video_id}/title")
async def rewrite_video_title(video_id: str, request: RewriteTitleRequest) -> dict:
    """Rewrite a stored video's title using the caller's own LLM key; persists to display_title."""
    db = get_db()
    video = await db.videos.find_one({"_id": video_id})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")

    try:
        new_title = rewrite_title(
            request.provider,
            request.api_key,
            video["original_title"],
            video.get("description") or "",
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail="Title rewrite failed") from e

    await db.videos.update_one({"_id": video_id}, {"$set": {"display_title": new_title}})
    return {"original_title": video["original_title"], "display_title": new_title}
