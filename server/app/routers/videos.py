from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from app.db import get_db
from app.models.video import Video, VideoCreate, VideoSource

router = APIRouter(prefix="/api/videos", tags=["videos"])


@router.get("", response_model=list[Video])
async def list_videos(
    source: VideoSource | None = Query(None, description="Filter by source type"),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
):
    db = get_db()
    query: dict = {}
    if source:
        query["source"] = source.value

    cursor = db.videos.find(query).sort("created_at", -1).skip(skip).limit(limit)
    return [Video(**doc) async for doc in cursor]


@router.get("/{video_id}", response_model=Video)
async def get_video(video_id: str):
    db = get_db()
    doc = await db.videos.find_one({"_id": video_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Video not found")
    return Video(**doc)


@router.post("", response_model=Video, status_code=201)
async def create_video(payload: VideoCreate):
    db = get_db()
    existing = await db.videos.find_one({"_id": payload.id})
    if existing:
        raise HTTPException(status_code=409, detail="Video already exists")

    now = datetime.now(timezone.utc)
    doc = {
        "_id": payload.id,
        "source": payload.source.value,
        "original_title": payload.original_title,
        "display_title": payload.display_title,
        "description": payload.description,
        "channel_id": payload.channel_id,
        "channel_title": payload.channel_title,
        "thumbnail_url": payload.thumbnail_url,
        "duration_seconds": payload.duration_seconds,
        "published_at": payload.published_at,
        "embeddable": payload.embeddable,
        "file_path": payload.file_path,
        "created_at": now,
    }
    await db.videos.insert_one(doc)
    return Video(**doc)


@router.delete("/{video_id}", status_code=204)
async def delete_video(video_id: str):
    db = get_db()
    result = await db.videos.delete_one({"_id": video_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
