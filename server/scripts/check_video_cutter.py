"""Phase 10 check: full pipeline - transcribe, segment, then actually cut the clips."""

import os
import sys

from dotenv import load_dotenv

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from app.services.segmentation import segment_transcript  # noqa: E402
from app.services.transcript import generate_transcript  # noqa: E402
from app.services.video_cutter import cut_clips  # noqa: E402

VIDEO_PATH = "/Users/trung/crackEd_videos/segments/Electronics-s1-part00.mp4"
OUTPUT_DIR = "/Users/trung/crackEd_videos/cut_clips"


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

    print("Segmenting via OpenAI ...")
    clips = segment_transcript("openai", openai_key, transcript, total_duration)

    print(f"Cutting {len(clips)} clips ...")
    results = cut_clips(VIDEO_PATH, clips, OUTPUT_DIR)

    for r in results:
        size_mb = os.path.getsize(r["file_path"]) / (1024 * 1024)
        print(f"[{r['start_seconds']}s-{r['end_seconds']}s] {r['title']} -> {r['file_path']} ({size_mb:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
