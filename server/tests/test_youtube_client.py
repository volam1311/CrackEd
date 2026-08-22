import json
from unittest.mock import patch

from app.services.youtube_client import (
    get_uploads_playlist_id,
    get_videos_metadata,
    list_playlist_video_ids,
)


class FakeResponse:
    """Mimics the context-manager object urllib.request.urlopen() returns."""

    def __init__(self, data: dict):
        self._data = json.dumps(data).encode()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self) -> bytes:
        return self._data


def test_get_uploads_playlist_id_happy_path():
    payload = {"items": [{"contentDetails": {"relatedPlaylists": {"uploads": "UUabc"}}}]}
    with patch("urllib.request.urlopen", return_value=FakeResponse(payload)):
        assert get_uploads_playlist_id("key", "UCabc") == "UUabc"


def test_get_uploads_playlist_id_raises_for_unknown_channel():
    with patch("urllib.request.urlopen", return_value=FakeResponse({"items": []})):
        try:
            get_uploads_playlist_id("key", "does-not-exist")
            assert False, "expected ValueError"
        except ValueError as e:
            assert "does-not-exist" in str(e)


def test_list_playlist_video_ids_paginates_across_pages():
    page1 = {
        "items": [{"contentDetails": {"videoId": "v1"}}, {"contentDetails": {"videoId": "v2"}}],
        "nextPageToken": "TOKEN2",
    }
    page2 = {"items": [{"contentDetails": {"videoId": "v3"}}]}
    with patch("urllib.request.urlopen", side_effect=[FakeResponse(page1), FakeResponse(page2)]) as mock_urlopen:
        result = list_playlist_video_ids("key", "PLxyz")
    assert result == ["v1", "v2", "v3"]
    second_call_url = mock_urlopen.call_args_list[1].args[0]
    assert "pageToken=TOKEN2" in second_call_url


def test_list_playlist_video_ids_empty_playlist():
    with patch("urllib.request.urlopen", return_value=FakeResponse({"items": []})):
        assert list_playlist_video_ids("key", "PLempty") == []


def test_get_videos_metadata_batches_over_fifty():
    video_ids = [f"v{i}" for i in range(51)]  # 51 -> two batches (50 + 1)
    batch1 = {"items": [{"id": f"v{i}"} for i in range(50)]}
    batch2 = {"items": [{"id": "v50"}]}
    with patch("urllib.request.urlopen", side_effect=[FakeResponse(batch1), FakeResponse(batch2)]) as mock_urlopen:
        result = get_videos_metadata("key", video_ids)
    assert len(result) == 51
    assert mock_urlopen.call_count == 2


def test_get_videos_metadata_empty_list_makes_no_request():
    with patch("urllib.request.urlopen") as mock_urlopen:
        assert get_videos_metadata("key", []) == []
    mock_urlopen.assert_not_called()


# --- security: query-parameter injection via user-controlled channel_id ---


def test_channel_id_special_characters_are_percent_encoded_not_injected():
    # A channel_id containing '&maxResults=9999' must not smuggle in an extra
    # query param - urlencode must percent-encode it as a single opaque value.
    payload = {"items": [{"contentDetails": {"relatedPlaylists": {"uploads": "UUabc"}}}]}
    malicious_id = "UCabc&maxResults=9999&part=admin"
    with patch("urllib.request.urlopen", return_value=FakeResponse(payload)) as mock_urlopen:
        get_uploads_playlist_id("key", malicious_id)
    requested_url = mock_urlopen.call_args.args[0]
    assert "id=UCabc%26maxResults%3D9999%26part%3Dadmin" in requested_url
    assert "&maxResults=9999" not in requested_url


def test_api_key_not_leaked_in_channel_not_found_error():
    with patch("urllib.request.urlopen", return_value=FakeResponse({"items": []})):
        try:
            get_uploads_playlist_id("SECRET_TEST_KEY", "bad-channel")
            assert False, "expected ValueError"
        except ValueError as e:
            assert "SECRET_TEST_KEY" not in str(e)
