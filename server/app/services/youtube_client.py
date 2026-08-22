"""Thin wrapper around the YouTube Data API v3 endpoints we need.

No parsing/filtering here - these functions just fetch raw API data.
"""

import json
import urllib.parse
import urllib.request

API_BASE = "https://www.googleapis.com/youtube/v3"
BATCH_SIZE = 50  # max video IDs per videos.list call


def _get(endpoint: str, params: dict[str, str]) -> dict:
    query = urllib.parse.urlencode(params)
    with urllib.request.urlopen(f"{API_BASE}/{endpoint}?{query}") as resp:
        return json.loads(resp.read())


def get_uploads_playlist_id(api_key: str, channel_id: str) -> str:
    """Return the channel's 'uploads' playlist ID."""
    data = _get(
        "channels",
        {"part": "contentDetails", "id": channel_id, "key": api_key},
    )
    items = data.get("items", [])
    if not items:
        raise ValueError(f"No channel found for ID {channel_id}")
    return items[0]["contentDetails"]["relatedPlaylists"]["uploads"]


def list_playlist_video_ids(api_key: str, playlist_id: str) -> list[str]:
    """Return every video ID in a playlist, paginating until exhausted."""
    video_ids: list[str] = []
    page_token = ""
    while True:
        params = {
            "part": "contentDetails",
            "playlistId": playlist_id,
            "maxResults": "50",
            "key": api_key,
        }
        if page_token:
            params["pageToken"] = page_token
        data = _get("playlistItems", params)
        video_ids.extend(item["contentDetails"]["videoId"] for item in data.get("items", []))
        page_token = data.get("nextPageToken", "")
        if not page_token:
            break
    return video_ids


def get_videos_metadata(api_key: str, video_ids: list[str]) -> list[dict]:
    """Return raw snippet/contentDetails/status metadata for each video ID, batched by 50."""
    results: list[dict] = []
    for i in range(0, len(video_ids), BATCH_SIZE):
        batch = video_ids[i : i + BATCH_SIZE]
        data = _get(
            "videos",
            {
                "part": "snippet,contentDetails,status",
                "id": ",".join(batch),
                "key": api_key,
            },
        )
        results.extend(data.get("items", []))
    return results
