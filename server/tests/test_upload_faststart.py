"""The upload endpoint must leave stored files progressively playable."""

import subprocess
from pathlib import Path
from unittest.mock import patch

from app.routers.upload import _remux_faststart


def test_skips_containers_without_a_moov_atom(tmp_path: Path):
    """+faststart is an MP4/MOV concept; Matroska and WebM must be left alone."""
    for name in ("clip.mkv", "clip.webm"):
        path = tmp_path / name
        path.write_bytes(b"not really a video")
        with patch("app.routers.upload.subprocess.run") as run:
            assert _remux_faststart(path) is False
            run.assert_not_called()


def test_remuxes_mp4_with_faststart_flag(tmp_path: Path):
    path = tmp_path / "clip.mp4"
    path.write_bytes(b"original bytes")

    def fake_run(cmd, **_kwargs):
        # ffmpeg writes to the temp output path, which is the final argument.
        Path(cmd[-1]).write_bytes(b"remuxed bytes")
        return subprocess.CompletedProcess(cmd, 0)

    with patch("app.routers.upload.subprocess.run", side_effect=fake_run) as run:
        assert _remux_faststart(path) is True

    cmd = run.call_args[0][0]
    assert "-movflags" in cmd
    assert cmd[cmd.index("-movflags") + 1] == "+faststart"
    assert "-c" in cmd and cmd[cmd.index("-c") + 1] == "copy"  # stream copy, no re-encode
    # The remuxed output replaces the original, leaving no stray temp file.
    assert path.read_bytes() == b"remuxed bytes"
    assert list(tmp_path.iterdir()) == [path]


def test_keeps_the_upload_when_ffmpeg_fails(tmp_path: Path):
    """A remux failure must never cost the user their upload."""
    path = tmp_path / "clip.mp4"
    path.write_bytes(b"original bytes")

    with patch(
        "app.routers.upload.subprocess.run",
        side_effect=subprocess.CalledProcessError(1, "ffmpeg"),
    ):
        assert _remux_faststart(path) is False

    assert path.read_bytes() == b"original bytes"
    assert list(tmp_path.iterdir()) == [path]


def test_keeps_the_upload_when_ffmpeg_is_missing(tmp_path: Path):
    path = tmp_path / "clip.mp4"
    path.write_bytes(b"original bytes")

    with patch("app.routers.upload.subprocess.run", side_effect=FileNotFoundError):
        assert _remux_faststart(path) is False

    assert path.read_bytes() == b"original bytes"
