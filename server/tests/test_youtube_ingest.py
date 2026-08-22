import pytest

from app.services.youtube_ingest import (
    filter_and_normalize_videos,
    is_allowed,
    normalize_video,
    parse_duration,
)


def make_video(**overrides) -> dict:
    """Build a raw videos.list-shaped item, based on real API output, with overrides."""
    video = {
        "id": "Z8ycfJosB-o",
        "snippet": {
            "publishedAt": "2026-08-18T16:00:07Z",
            "channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw",
            "title": "Build a live translation broadcast app",
            "description": "Learn how to build a real-time app.",
            "thumbnails": {
                "medium": {"url": "https://i.ytimg.com/vi/Z8ycfJosB-o/mqdefault.jpg"},
                "high": {"url": "https://i.ytimg.com/vi/Z8ycfJosB-o/hqdefault.jpg"},
            },
            "channelTitle": "Google for Developers",
        },
        "contentDetails": {"duration": "PT1M34S"},
        "status": {"embeddable": True, "privacyStatus": "public"},
    }
    video.update(overrides)
    return video


def test_parse_duration_minutes_and_seconds():
    assert parse_duration("PT1M34S") == 94


def test_parse_duration_hours_minutes_seconds():
    assert parse_duration("PT2H5M10S") == 7510


def test_parse_duration_seconds_only():
    assert parse_duration("PT45S") == 45


def test_is_allowed_true_for_public_embeddable():
    assert is_allowed(make_video()) is True


def test_is_allowed_false_when_not_embeddable():
    video = make_video(status={"embeddable": False, "privacyStatus": "public"})
    assert is_allowed(video) is False


def test_is_allowed_false_when_not_public():
    video = make_video(status={"embeddable": True, "privacyStatus": "unlisted"})
    assert is_allowed(video) is False


def test_normalize_video_has_expected_fields():
    normalized = normalize_video(make_video())
    assert normalized == {
        "id": "Z8ycfJosB-o",
        "source": "youtube",
        "original_title": "Build a live translation broadcast app",
        "description": "Learn how to build a real-time app.",
        "channel_id": "UC_x5XG1OV2P6uZZ5FSM9Ttw",
        "channel_title": "Google for Developers",
        "published_at": "2026-08-18T16:00:07Z",
        "thumbnail_url": "https://i.ytimg.com/vi/Z8ycfJosB-o/hqdefault.jpg",
        "duration_seconds": 94,
        "embeddable": True,
    }


def test_filter_and_normalize_drops_non_embeddable():
    videos = [
        make_video(),
        make_video(id="blocked", status={"embeddable": False, "privacyStatus": "public"}),
    ]
    result = filter_and_normalize_videos(videos)
    assert len(result) == 1
    assert result[0]["id"] == "Z8ycfJosB-o"


# --- edge cases ---


def test_parse_duration_zero_seconds():
    assert parse_duration("PT0S") == 0


def test_parse_duration_rejects_unrecognized_format():
    with pytest.raises(ValueError):
        parse_duration("not-a-duration")


def test_parse_duration_rejects_date_component():
    # YouTube durations are always PT..., never date-based (P1D); make sure we don't
    # silently misparse something we don't actually support.
    with pytest.raises(ValueError):
        parse_duration("P1D")


def test_is_allowed_false_when_status_missing_entirely():
    video = make_video()
    del video["status"]
    assert is_allowed(video) is False


def test_normalize_video_falls_back_to_default_thumbnail():
    video = make_video()
    video["snippet"]["thumbnails"] = {"default": {"url": "https://i.ytimg.com/vi/x/default.jpg"}}
    normalized = normalize_video(video)
    assert normalized["thumbnail_url"] == "https://i.ytimg.com/vi/x/default.jpg"


def test_normalize_video_preserves_special_characters_in_title():
    # Titles/descriptions are opaque data here - the backend must not execute or
    # mangle them. HTML/script-like content is a frontend rendering concern (escape
    # on render), not something this layer should interpret.
    video = make_video()
    video["snippet"]["title"] = '<script>alert(1)</script> & "quoted"'
    normalized = normalize_video(video)
    assert normalized["original_title"] == '<script>alert(1)</script> & "quoted"'


def test_filter_and_normalize_skips_malformed_video_without_crashing_batch():
    # A single video missing fields YouTube usually guarantees (e.g. no snippet)
    # must not take down the rest of the batch.
    malformed = {"id": "broken", "status": {"embeddable": True, "privacyStatus": "public"}}
    videos = [make_video(), malformed]
    result = filter_and_normalize_videos(videos)
    assert len(result) == 1
    assert result[0]["id"] == "Z8ycfJosB-o"


def test_filter_and_normalize_empty_input_returns_empty_list():
    assert filter_and_normalize_videos([]) == []


def test_filter_and_normalize_skips_video_with_no_thumbnails_at_all():
    # thumbnails={} triggers a TypeError (None["url"]), a different failure mode
    # than a missing key - both must be tolerated, not just KeyError.
    no_thumbnails = make_video(id="no-thumb")
    no_thumbnails["snippet"]["thumbnails"] = {}
    result = filter_and_normalize_videos([make_video(), no_thumbnails])
    assert len(result) == 1
    assert result[0]["id"] == "Z8ycfJosB-o"
