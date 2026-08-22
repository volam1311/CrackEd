"""Phase 9 check: transcribe a real clip via Groq, then segment it via OpenAI."""

import os
import sys
import time

from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.services.segmentation import segment_transcript
from app.services.transcript import generate_transcript

VIDEO_PATH = "/Users/trung/crackEd_videos/segments/Electronics-s1-part00.mp4"


def main() -> int:
    load_dotenv()
    groq_key = os.environ.get("GROQ_API_KEY")
    openai_key = os.environ.get("OPEN_API_KEY")
    if not groq_key or not openai_key:
        print("GROQ_API_KEY and/or OPEN_API_KEY not set in server/.env")
        return 1

    print("Transcribing via Groq ...")
    transcript = generate_transcript(groq_key, VIDEO_PATH)
    total_duration = transcript[-1]["end"] if transcript else 0
    print(f"Got {len(transcript)} segments, total duration {total_duration:.1f}s\n")

    print("Segmenting via OpenAI ...")
    start = time.time()
    clips = segment_transcript("openai", openai_key, transcript, total_duration)
    elapsed = time.time() - start

    print(f"Done in {elapsed:.1f}s. Got {len(clips)} clips.\n")
    for clip in clips:
        duration_min = (clip["end_seconds"] - clip["start_seconds"]) / 60
        print(f"[{clip['start_seconds']}s - {clip['end_seconds']}s] ({duration_min:.1f} min) {clip['title']}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
