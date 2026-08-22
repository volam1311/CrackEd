"""Phase 0 check: confirm the YouTube API key can successfully call channels.list."""

import json
import os
import sys
import urllib.request
from urllib.error import HTTPError

from dotenv import load_dotenv

# Google Developers channel: a stable, well-known channel ID for smoke testing.
TEST_CHANNEL_ID = "UC_x5XG1OV2P6uZZ5FSM9Ttw"
API_URL = "https://www.googleapis.com/youtube/v3/channels"


def fetch_channel(api_key: str, channel_id: str) -> dict:
    params = f"part=contentDetails,snippet&id={channel_id}&key={api_key}"
    req = urllib.request.Request(f"{API_URL}?{params}")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def main() -> int:
    load_dotenv()
    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        print("YOUTUBE_API_KEY not set in server/.env")
        return 1

    try:
        data = fetch_channel(api_key, TEST_CHANNEL_ID)
    except HTTPError as e:
        print(f"API call failed: HTTP {e.code} - {e.read().decode()}")
        return 1

    items = data.get("items", [])
    if not items:
        print(f"No channel found for ID {TEST_CHANNEL_ID}. Response: {data}")
        return 1

    channel = items[0]
    uploads_playlist_id = channel["contentDetails"]["relatedPlaylists"]["uploads"]
    print(f"Success. Channel: {channel['snippet']['title']}")
    print(f"Uploads playlist ID: {uploads_playlist_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
