"""Fetch pipeline: pull fresh videos for every whitelisted channel and store new ones."""

from datetime import UTC, datetime
from urllib.error import HTTPError

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db import get_db
from app.services.youtube_client import (
    get_uploads_playlist_id,
    get_videos_metadata,
    list_playlist_video_ids,
)
from app.services.youtube_ingest import filter_and_normalize_videos

router = APIRouter(prefix="/api/fetch", tags=["fetch"])
MAX_VIDEOS_PER_CHANNEL = 100  # keep one prolific channel from flooding the feed/DB


class FetchRequest(BaseModel):
    youtube_api_key: str


def _to_video_doc(video: dict) -> dict:
    """Shape a normalized video dict into the Mongo document app/routers/videos.py writes."""
    doc = dict(video)
    doc["_id"] = doc.pop("id")
    doc.setdefault("display_title", None)
    doc.setdefault("file_path", None)
    doc["created_at"] = datetime.now(UTC)
    return doc


@router.post("")
async def fetch_whitelisted_channels(request: FetchRequest) -> dict:
    """Refetch every whitelisted channel's uploads; insert videos we haven't stored yet.

    The YouTube API key is provided by the caller (BYOK) and is not stored.
    """
    api_key = request.youtube_api_key
    db = get_db()
    channels = [c async for c in db.channels.find()]

    if not channels:
        raise HTTPException(status_code=400, detail="No whitelisted channels found. Add channels first.")

    added = 0
    skipped = 0
    failed_channels: list[str] = []

    for channel in channels:
        channel_id = channel["_id"]
        try:
            playlist_id = get_uploads_playlist_id(api_key, channel_id)
            video_ids = list_playlist_video_ids(api_key, playlist_id)
            # uploads playlists are ordered most-recent-first, so this keeps the
            # newest videos and skips fetching metadata we'd discard anyway
            video_ids = video_ids[:MAX_VIDEOS_PER_CHANNEL]
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
