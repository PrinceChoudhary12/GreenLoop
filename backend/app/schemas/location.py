"""Pydantic schemas for geospatial map points and location tracking."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class LocationUpdatePayload(BaseModel):
    """Payload for updating user GPS coordinates with explicit consent."""

    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude degree (-90 to 90)")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude degree (-180 to 180)")
    is_sharing_active: Optional[bool] = Field(default=True, description="Active location sharing consent")


class ConsentTogglePayload(BaseModel):
    """Payload to toggle location sharing consent state."""

    is_sharing_active: bool = Field(..., description="Active consent toggle")


class UserLocationResponse(BaseModel):
    """User location status and last known position."""

    user_id: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_sharing_active: bool
    updated_at: datetime
    is_stale: bool = False

    class Config:
        from_attributes = True


class MapPointItem(BaseModel):
    """Geospatial point on the interactive map canvas."""

    id: str  # Unique map point ID, e.g. "report_10", "collector_2"
    point_type: str  # 'report', 'pickup', 'collector'
    entity_id: int
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    status: Optional[str] = None
    updated_at: datetime
    is_live: bool = False
    is_stale: bool = False

    class Config:
        from_attributes = True


class MapDataResponse(BaseModel):
    """Aggregated geospatial map payload for authenticated user."""

    points: List[MapPointItem]
    total_points: int
    user_location: Optional[UserLocationResponse] = None
