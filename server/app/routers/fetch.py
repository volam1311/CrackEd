"""Fetch pipeline: pull fresh videos for every whitelisted channel and store new ones."""

import re
import urllib.parse
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
MAX_VIDEOS_PER_CHANNEL = 20  # keep one prolific channel from flooding the feed/DB


class FetchRequest(BaseModel):
    youtube_api_key: str


class FetchVideoRequest(BaseModel):
    video: str  # a raw video ID or any youtube.com/youtu.be URL
    youtube_api_key: str


def extract_video_id(value: str) -> str:
    """Accept either a bare video ID or a youtube.com/youtu.be URL."""
    value = value.strip()
    if "youtube.com" not in value and "youtu.be" not in value:
        return value

    parsed = urllib.parse.urlparse(value)
    if parsed.hostname and "youtu.be" in parsed.hostname:
        return parsed.path.strip("/")

    query_id = urllib.parse.parse_qs(parsed.query).get("v")
    if query_id:
        return query_id[0]

    # /embed/<id> or /v/<id>
    parts = [p for p in parsed.path.split("/") if p]
    return parts[-1] if parts else value


VIDEO_ID_RE = re.compile(r"^[\w-]{11}$")


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


@router.post("/video")
async def fetch_single_video(request: FetchVideoRequest) -> dict:
    """Add one specific video directly, bypassing channel whitelisting and the
    per-channel cap - for pinning a video (e.g. one a quiz depends on) that a
    channel's most-recent-100 fetch might not include.
    """
    video_id = extract_video_id(request.video)
    if not VIDEO_ID_RE.match(video_id):
        # Validated up front rather than relying solely on urlencode further
        # down - a malformed ID is rejected before it ever reaches the API call.
        raise HTTPException(status_code=400, detail="That doesn't look like a valid YouTube video ID or URL")

    db = get_db()
    existing = await db.videos.find_one({"_id": video_id})
    if existing:
        return {"status": "already_present", "video_id": video_id}

    try:
        raw_videos = get_videos_metadata(request.youtube_api_key, [video_id])
    except HTTPError as e:
        raise HTTPException(status_code=502, detail=f"YouTube API error: {e.code}") from e

    normalized = filter_and_normalize_videos(raw_videos)
    if not normalized:
        raise HTTPException(status_code=404, detail="Video not found, private, or not embeddable")

    await db.videos.insert_one(_to_video_doc(normalized[0]))
    return {"status": "added", "video_id": video_id}
