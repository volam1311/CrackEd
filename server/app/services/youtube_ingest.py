"""Turn raw videos.list API responses into clean records for the feed."""

import re

DURATION_RE = re.compile(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?")


def parse_duration(iso_duration: str) -> int:
    """Convert an ISO 8601 duration (e.g. 'PT1M34S') into total seconds."""
    match = DURATION_RE.fullmatch(iso_duration)
    if not match:
        raise ValueError(f"Unrecognized duration format: {iso_duration}")
    hours, minutes, seconds = (int(g) if g else 0 for g in match.groups())
    return hours * 3600 + minutes * 60 + seconds


def is_allowed(video: dict) -> bool:
    """A video is usable in the feed only if it's public and embeddable."""
    status = video.get("status", {})
    return status.get("embeddable", False) and status.get("privacyStatus") == "public"


def normalize_video(video: dict) -> dict:
    """Flatten a raw videos.list item into VideoCreate-shaped fields (see app/models/video.py)."""
    snippet = video["snippet"]
    thumbnails = snippet["thumbnails"]
    thumbnail_url = thumbnails.get("high", thumbnails.get("medium", thumbnails.get("default")))["url"]
    return {
        "id": video["id"],
        "source": "youtube",
        "original_title": snippet["title"],
        "description": snippet["description"],
        "channel_id": snippet["channelId"],
        "channel_title": snippet["channelTitle"],
        "published_at": snippet["publishedAt"],
        "thumbnail_url": thumbnail_url,
        "duration_seconds": parse_duration(video["contentDetails"]["duration"]),
        "embeddable": True,  # only allowed videos reach here, see is_allowed()
    }


def filter_and_normalize_videos(videos: list[dict]) -> list[dict]:
    """Drop non-embeddable/non-public videos, flatten the rest for storage.

    A single malformed item (missing fields YouTube usually guarantees) is
    skipped rather than raised, so it can't take down an entire batch fetch.
    """
    normalized = []
    for v in videos:
        if not is_allowed(v):
            continue
        try:
            normalized.append(normalize_video(v))
        except (KeyError, TypeError):
            continue
    return normalized
