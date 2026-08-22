"""Phase 8 check: transcribe a real video via Groq and print a summary."""

import os
import sys
import time

from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.services.transcript import generate_transcript  # noqa: E402

VIDEO_PATH = "/Users/trung/crackEd_videos/segments/Electronics-s1-part00.mp4"


def main() -> int:
    load_dotenv()
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        print("GROQ_API_KEY not set in server/.env")
        return 1

    print(f"Transcribing {VIDEO_PATH} ...")
    start = time.time()
    segments = generate_transcript(api_key, VIDEO_PATH)
    elapsed = time.time() - start

    print(f"Done in {elapsed:.1f}s. Got {len(segments)} segments.\n")
    for seg in segments[:5]:
        print(f"[{seg['start']:.1f}s - {seg['end']:.1f}s] {seg['text']}")
    if len(segments) > 5:
        print(f"... ({len(segments) - 5} more segments)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
