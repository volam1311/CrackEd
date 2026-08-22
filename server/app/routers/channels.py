from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException

from app.db import get_db
from app.models.channel import Channel, ChannelCreate

router = APIRouter(prefix="/api/channels", tags=["channels"])


@router.get("", response_model=list[Channel])
async def list_channels():
    db = get_db()
    cursor = db.channels.find()
    return [Channel(**doc) async for doc in cursor]


@router.post("", response_model=Channel, status_code=201)
async def add_channel(payload: ChannelCreate):
    db = get_db()
    existing = await db.channels.find_one({"_id": payload.id})
    if existing:
        raise HTTPException(status_code=409, detail="Channel already exists")

    doc = {
        "_id": payload.id,
        "title": payload.title,
        "thumbnail_url": payload.thumbnail_url,
        "added_at": datetime.now(UTC),
    }
    await db.channels.insert_one(doc)
    return Channel(**doc)


@router.delete("/{channel_id}", status_code=204)
async def delete_channel(channel_id: str):
    db = get_db()
    result = await db.channels.delete_one({"_id": channel_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Channel not found")
