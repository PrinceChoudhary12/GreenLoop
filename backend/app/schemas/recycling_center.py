"""Recycling center Pydantic schemas."""

import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


def _normalise_categories(v: object) -> Optional[str]:
    """Accept a list or a comma-separated string and normalise to CSV uppercase string."""
    if v is None:
        return None
    if isinstance(v, list):
        return ",".join(str(item).strip().upper() for item in v if item)
    if isinstance(v, str):
        return ",".join(part.strip().upper() for part in v.split(",") if part.strip())
    return str(v)


class RecyclingCenterCreate(BaseModel):
    """Payload to create a new recycling center (admin only)."""

    name: str = Field(..., min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    address: str = Field(..., min_length=5, max_length=500)
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    phone: Optional[str] = Field(default=None, max_length=30)
    email: Optional[str] = Field(default=None, max_length=254)
    website: Optional[str] = Field(default=None, max_length=500)
    # Accepted categories: list or CSV string, e.g. ["PLASTIC","GLASS"] or "PLASTIC,GLASS"
    accepted_categories: Optional[object] = None
    opening_hours: Optional[str] = Field(default=None, max_length=500)
    is_active: bool = Field(default=True)

    @field_validator("name", "address", mode="before")
    @classmethod
    def strip_strings(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("Field cannot be empty or whitespace only")
        return stripped

    @field_validator("accepted_categories", mode="before")
    @classmethod
    def normalise_categories(cls, v: object) -> Optional[str]:
        return _normalise_categories(v)


class RecyclingCenterUpdate(BaseModel):
    """Partial update payload for a recycling center (admin only)."""

    name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    description: Optional[str] = Field(default=None, max_length=2000)
    address: Optional[str] = Field(default=None, min_length=5, max_length=500)
    latitude: Optional[float] = Field(default=None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(default=None, ge=-180.0, le=180.0)
    phone: Optional[str] = Field(default=None, max_length=30)
    email: Optional[str] = Field(default=None, max_length=254)
    website: Optional[str] = Field(default=None, max_length=500)
    accepted_categories: Optional[object] = None
    opening_hours: Optional[str] = Field(default=None, max_length=500)
    is_active: Optional[bool] = None

    @field_validator("accepted_categories", mode="before")
    @classmethod
    def normalise_categories(cls, v: object) -> Optional[str]:
        return _normalise_categories(v)


class RecyclingCenterResponse(BaseModel):
    """Full recycling center response returned to clients."""

    id: int
    name: str
    description: Optional[str] = None
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    accepted_categories: Optional[str] = None
    opening_hours: Optional[str] = None
    is_active: bool
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)

    @property
    def accepted_categories_list(self) -> List[str]:
        """Parse accepted_categories CSV into a list."""
        if not self.accepted_categories:
            return []
        return [c.strip() for c in self.accepted_categories.split(",") if c.strip()]
