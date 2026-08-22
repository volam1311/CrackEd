"""Phase 1 check: chain the client functions and print what real metadata looks like."""

import json
import os
import sys

from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.services.youtube_client import (  # noqa: E402
    get_uploads_playlist_id,
    get_videos_metadata,
    list_playlist_video_ids,
)

TEST_CHANNEL_ID = "UC_x5XG1OV2P6uZZ5FSM9Ttw"  # Google for Developers


def main() -> int:
    load_dotenv()
    api_key = os.environ.get("YOUTUBE_API_KEY")
    if not api_key:
        print("YOUTUBE_API_KEY not set in server/.env")
        return 1

    playlist_id = get_uploads_playlist_id(api_key, TEST_CHANNEL_ID)
    print(f"Uploads playlist ID: {playlist_id}")

    video_ids = list_playlist_video_ids(api_key, playlist_id)
    print(f"Found {len(video_ids)} videos")

    metadata = get_videos_metadata(api_key, video_ids[:3])
    print(f"\nFull metadata for first video:\n{json.dumps(metadata[0], indent=2)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
