import subprocess
from pathlib import Path
from unittest.mock import patch

import pytest

from app.services.video_cutter import cut_clips


def get_duration(path: str) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", path],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


@pytest.fixture
def sample_video(tmp_path) -> str:
    """A tiny 12s synthetic video with a keyframe every frame, so -c copy cuts land exactly."""
    video_path = tmp_path / "source.mp4"
    subprocess.run(
        [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "color=c=blue:size=64x64:duration=12:rate=10",
            "-f", "lavfi", "-i", "sine=frequency=1000:duration=12",
            "-g", "1", "-c:v", "libx264", "-c:a", "aac",
            str(video_path),
        ],
        check=True,
        capture_output=True,
    )
    return str(video_path)


def test_cut_clips_produces_correct_number_of_files_with_correct_durations(sample_video, tmp_path):
    clips = [
        {"start_seconds": 0, "end_seconds": 4, "title": "Part 1"},
        {"start_seconds": 4, "end_seconds": 8, "title": "Part 2"},
        {"start_seconds": 8, "end_seconds": 12, "title": "Part 3"},
    ]
    output_dir = tmp_path / "clips"
    result = cut_clips(sample_video, clips, str(output_dir))

    assert len(result) == 3
    for expected_clip, produced in zip(clips, result):
        assert Path(produced["file_path"]).exists()
        expected_duration = expected_clip["end_seconds"] - expected_clip["start_seconds"]
        assert abs(get_duration(produced["file_path"]) - expected_duration) < 1.0


def test_cut_clips_preserves_title_alongside_file_path(sample_video, tmp_path):
    clips = [{"start_seconds": 0, "end_seconds": 4, "title": "Introduction"}]
    result = cut_clips(sample_video, clips, str(tmp_path / "clips"))
    assert result[0]["title"] == "Introduction"
    assert "file_path" in result[0]


# --- edge cases ---


def test_cut_clips_empty_list_returns_empty_and_makes_no_ffmpeg_calls(sample_video, tmp_path):
    with patch("app.services.video_cutter.subprocess.run") as mock_run:
        result = cut_clips(sample_video, [], str(tmp_path / "clips"))
    assert result == []
    mock_run.assert_not_called()


def test_cut_clips_missing_source_raises_file_not_found(tmp_path):
    with pytest.raises(FileNotFoundError):
        cut_clips("/nonexistent/video.mp4", [{"start_seconds": 0, "end_seconds": 1, "title": "x"}], str(tmp_path))


def test_cut_clips_ffmpeg_failure_propagates(sample_video, tmp_path):
    # A malformed clip (end before start) makes ffmpeg exit non-zero - this
    # must surface as a clear error, not silently produce a corrupt file.
    clips = [{"start_seconds": 10, "end_seconds": 2, "title": "Invalid"}]
    with pytest.raises(subprocess.CalledProcessError):
        cut_clips(sample_video, clips, str(tmp_path / "clips"))


# --- security ---


def test_cut_clips_invokes_ffmpeg_via_arg_list_not_shell_string(sample_video, tmp_path):
    # Confirms subprocess.run is always called with a list (argv), never a shell
    # string - this is what makes special characters in paths/titles inert
    # rather than a command-injection vector.
    clips = [{"start_seconds": 0, "end_seconds": 4, "title": "x"}]
    with patch("app.services.video_cutter.subprocess.run") as mock_run:
        mock_run.return_value = None
        cut_clips(sample_video, clips, str(tmp_path / "clips"))
    args, kwargs = mock_run.call_args
    assert isinstance(args[0], list)
    assert kwargs.get("shell", False) is False
