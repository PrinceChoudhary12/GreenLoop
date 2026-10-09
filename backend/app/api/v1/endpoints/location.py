"""Geospatial map and live location API endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.location import (
    ConsentTogglePayload,
    LocationUpdatePayload,
    MapDataResponse,
    UserLocationResponse,
)
from backend.app.services.location_service import LocationService

router = APIRouter(prefix="/location", tags=["Geospatial & Live Location"])


@router.get(
    "/map-data",
    response_model=MapDataResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Geospatial Map Payload",
    description="Retrieve authorized report, pickup, and collector map markers.",
)
def get_map_data(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MapDataResponse:
    """Fetch map data points."""
    return LocationService.get_map_data(db=db, current_user=current_user)


@router.get(
    "/me",
    response_model=UserLocationResponse,
    status_code=status.HTTP_200_OK,
    summary="Get My Location Status",
    description="Fetch authenticated user's location consent state and last position.",
)
def get_my_location(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserLocationResponse:
    """Get location status for current user."""
    return LocationService.get_my_location(db=db, current_user=current_user)


@router.post(
    "/update",
    response_model=UserLocationResponse,
    status_code=status.HTTP_200_OK,
    summary="Update GPS Coordinates",
    description="Record consented GPS location update for the authenticated user.",
)
def update_location(
    payload: LocationUpdatePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserLocationResponse:
    """Update user GPS position."""
    return LocationService.update_location(db=db, current_user=current_user, payload=payload)


@router.post(
    "/consent",
    response_model=UserLocationResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle Location Consent",
    description="Enable or disable active location sharing consent.",
)
def toggle_consent(
    payload: ConsentTogglePayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserLocationResponse:
    """Toggle consent state."""
    return LocationService.update_consent(db=db, current_user=current_user, payload=payload)
