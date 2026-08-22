from datetime import UTC, datetime

from pydantic import BaseModel, Field


class ChannelCreate(BaseModel):
    id: str = Field(..., description="YouTube channel ID (e.g. UCxxxx)")
    title: str
    thumbnail_url: str | None = None


class Channel(BaseModel):
    id: str = Field(..., alias="_id", serialization_alias="id")
    title: str
    thumbnail_url: str | None = None
    added_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = {"populate_by_name": True}
