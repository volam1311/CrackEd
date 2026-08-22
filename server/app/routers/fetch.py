"""Fetch pipeline: pull fresh videos for every whitelisted channel and store new ones."""

import os
from datetime import datetime, timezone
from urllib.error import HTTPError

from fastapi import APIRouter, HTTPException

from app.db import get_db
from app.services.youtube_client import (
    get_uploads_playlist_id,
    get_videos_metadata,
    list_playlist_video_ids,
)
from app.services.youtube_ingest import filter_and_normalize_videos

router = APIRouter(prefix="/api/fetch", tags=["fetch"])


def _get_api_key() -> str:
    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="YOUTUBE_API_KEY not configured")
    return api_key


def _to_video_doc(video: dict) -> dict:
    """Shape a normalized video dict into the Mongo document app/routers/videos.py writes."""
    doc = dict(video)
    doc["_id"] = doc.pop("id")
    doc.setdefault("display_title", None)
    doc.setdefault("file_path", None)
    doc["created_at"] = datetime.now(timezone.utc)
    return doc


@router.post("")
async def fetch_whitelisted_channels() -> dict:
    """Refetch every whitelisted channel's uploads; insert videos we haven't stored yet."""
    api_key = _get_api_key()
    db = get_db()
    channels = [c async for c in db.channels.find()]

    added = 0
    skipped = 0
    failed_channels: list[str] = []

    for channel in channels:
        channel_id = channel["_id"]
        try:
            playlist_id = get_uploads_playlist_id(api_key, channel_id)
            video_ids = list_playlist_video_ids(api_key, playlist_id)
            raw_videos = get_videos_metadata(api_key, video_ids)
        except (ValueError, HTTPError):
            failed_channels.append(channel_id)
            continue

        for video in filter_and_normalize_videos(raw_videos):
            existing = await db.videos.find_one({"_id": video["id"]})
            if existing:
                skipped += 1
                continue
            await db.videos.insert_one(_to_video_doc(video))
            added += 1

    return {
        "channels_processed": len(channels) - len(failed_channels),
        "channels_failed": failed_channels,
        "videos_added": added,
        "videos_skipped": skipped,
    }
