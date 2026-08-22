import re
from datetime import UTC, datetime
from itertools import zip_longest
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.db import get_db
from app.models.video import Video, VideoCreate, VideoSource

router = APIRouter(prefix="/api/videos", tags=["videos"])


@router.get("/count")
async def count_videos(
    source: Annotated[VideoSource | None, Query(description="Filter by source type")] = None,
    channel_id: Annotated[str | None, Query(description="Filter by channel")] = None,
):
    db = get_db()
    query: dict = {}
    if source:
        query["source"] = source.value
    if channel_id:
        query["channel_id"] = channel_id
    total = await db.videos.count_documents(query)
    return {"total": total}


@router.get("", response_model=list[Video])
async def list_videos(
    source: Annotated[
        VideoSource | None, Query(description="Filter by source type")
    ] = None,
    channel_id: Annotated[str | None, Query(description="Filter by channel")] = None,
    q: Annotated[str | None, Query(description="Case-insensitive title/channel search")] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    skip: Annotated[int, Query(ge=0)] = 0,
    order: Annotated[str, Query(description="Order: recent or random")] = "random",
    distribute: Annotated[bool, Query(description="Uniform distribution across channels")] = False,
):
    db = get_db()
    query: dict = {}
    if source:
        query["source"] = source.value
    if channel_id:
        query["channel_id"] = channel_id

    term = (q or "").strip()
    if term:
        # re.escape so the user's input is matched literally -- otherwise a stray
        # "(" or "*" from a search box either errors or silently matches nothing.
        pattern = re.escape(term)
        query["$or"] = [
            {"display_title": {"$regex": pattern, "$options": "i"}},
            {"original_title": {"$regex": pattern, "$options": "i"}},
            {"channel_title": {"$regex": pattern, "$options": "i"}},
        ]

        # Rank by which field matched: the CrackEd title first, since that is what
        # the viewer actually sees, then the source title as a safety net for
        # videos nobody has renamed, then the channel. Search results also bypass
        # the random sampling and channel interleaving used for the feed.
        def matches(field: str) -> dict:
            return {
                "$regexMatch": {
                    "input": {"$ifNull": [f"${field}", ""]},
                    "regex": pattern,
                    "options": "i",
                }
            }

        pipeline = [
            {"$match": query},
            {
                "$addFields": {
                    "_rank": {
                        "$switch": {
                            "branches": [
                                {"case": matches("display_title"), "then": 0},
                                {"case": matches("original_title"), "then": 1},
                            ],
                            "default": 2,
                        }
                    }
                }
            },
            {"$sort": {"_rank": 1, "created_at": -1}},
            {"$skip": skip},
            {"$limit": limit},
            {"$unset": "_rank"},
        ]
        return [Video(**doc) async for doc in db.videos.aggregate(pipeline)]

    if distribute:
        channel_ids = await db.videos.distinct("channel_id", query)
        channel_ids = [c for c in channel_ids if c is not None]
        if not channel_ids:
            cursor = db.videos.find(query).sort("created_at", -1).skip(skip).limit(limit)
            return [Video(**doc) async for doc in cursor]

        per_channel = max(1, limit // len(channel_ids))
        per_channel_skip = skip // len(channel_ids)

        buckets: list[list[dict]] = []
        for ch_id in channel_ids:
            ch_query = {**query, "channel_id": ch_id}
            cursor = db.videos.find(ch_query).sort("created_at", -1).skip(per_channel_skip).limit(per_channel)
            bucket = [doc async for doc in cursor]
            buckets.append(bucket)

        interleaved: list[dict] = []
        for group in zip_longest(*buckets):
            for doc in group:
                if doc is not None:
                    interleaved.append(doc)

        return [Video(**doc) for doc in interleaved[:limit]]

    if order == "random":
        pipeline: list[dict] = []
        if query:
            pipeline.append({"$match": query})
        pipeline.append({"$sample": {"size": limit}})
        return [Video(**doc) async for doc in db.videos.aggregate(pipeline)]

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

    now = datetime.now(UTC)
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
