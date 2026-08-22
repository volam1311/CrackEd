"""Cut a source video into separate files at the boundaries segmentation.py found."""

import subprocess
from pathlib import Path


def _cut_single_clip(source_path: str, start: float, end: float, output_path: str) -> None:
    # -ss/-to as input options (both before -i) seek and stop against the same
    # timeline; -c copy avoids re-encoding, trading a little precision (snaps
    # to the nearest keyframe) for speed.
    subprocess.run(
        ["ffmpeg", "-y", "-ss", str(start), "-to", str(end), "-i", source_path, "-c", "copy", output_path],
        check=True,
        capture_output=True,
    )


def cut_clips(source_path: str, clips: list[dict], output_dir: str) -> list[dict]:
    """Cut source_path per clip boundary; returns each clip dict plus its file_path."""
    if not Path(source_path).exists():
        raise FileNotFoundError(f"No such file: {source_path}")
    if not clips:
        return []

    Path(output_dir).mkdir(parents=True, exist_ok=True)
    results = []
    for i, clip in enumerate(clips):
        output_path = str(Path(output_dir) / f"clip_{i:02d}.mp4")
        _cut_single_clip(source_path, clip["start_seconds"], clip["end_seconds"], output_path)
        results.append({**clip, "file_path": output_path})
    return results
