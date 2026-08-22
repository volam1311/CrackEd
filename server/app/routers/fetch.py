from fastapi import APIRouter

from app.db import get_db

router = APIRouter(prefix="/api/fetch", tags=["fetch"])


@router.post("")
async def fetch_videos():
    """Trigger a fetch of videos from all whitelisted channels.

    Currently a stub — returns the list of channels that would be processed.
    Replace with actual YouTube Data API integration later.
    """
    db = get_db()
    channels = [doc async for doc in db.channels.find()]

    # TODO: For each channel, call YouTube Data API to get recent videos,
    # parse metadata, and upsert into the videos collection.

    return {
        "status": "ok",
        "channels_processed": len(channels),
        "channels": [{"id": ch["_id"], "title": ch["title"]} for ch in channels],
        "message": "YouTube Data API integration pending — channels listed for reference.",
    }
