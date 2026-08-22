import re
from datetime import UTC, datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class VideoSource(StrEnum):
    YOUTUBE = "youtube"
    UPLOAD = "upload"


def parse_iso8601_duration(duration: str) -> int:
    """Parse ISO 8601 duration (e.g. 'PT1H2M34S') to total seconds."""
    match = re.match(
        r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", duration, re.IGNORECASE
    )
    if not match:
        return 0
    hours = int(match.group(1) or 0)
    minutes = int(match.group(2) or 0)
    seconds = int(match.group(3) or 0)
    return hours * 3600 + minutes * 60 + seconds


class VideoCreate(BaseModel):
    id: str = Field(..., description="YouTube video ID or generated UUID for uploads")
    source: VideoSource
    original_title: str
    display_title: str | None = None
    description: str | None = None
    channel_id: str | None = None
    channel_title: str | None = None
    thumbnail_url: str | None = None
    duration_seconds: int = 0
    published_at: datetime | None = None
    embeddable: bool = True
    file_path: str | None = None
    # Set together for clips produced by splitting one upload into parts; left
    # unset for a single video (YouTube or a non-split upload).
    series_id: str | None = Field(None, description="Shared by every clip cut from the same upload")
    part_number: int | None = Field(None, description="1-indexed position within the series")
    total_parts: int | None = Field(None, description="Total number of clips in the series")


class Video(BaseModel):
    id: str = Field(..., alias="_id", serialization_alias="id")
    source: VideoSource
    original_title: str
    display_title: str | None = None
    description: str | None = None
    channel_id: str | None = None
    channel_title: str | None = None
    thumbnail_url: str | None = None
    duration_seconds: int = 0
    published_at: datetime | None = None
    embeddable: bool = True
    file_path: str | None = None
    series_id: str | None = None
    part_number: int | None = None
    total_parts: int | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = {"populate_by_name": True}
