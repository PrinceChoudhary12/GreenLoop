"""Service layer for geospatial map processing, location updates, and privacy authorization."""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from backend.app.models.enums import UserRole
from backend.app.models.user import User
from backend.app.repositories.location_repository import LocationRepository
from backend.app.schemas.location import (
    ConsentTogglePayload,
    LocationUpdatePayload,
    MapDataResponse,
    MapPointItem,
    UserLocationResponse,
)

STALE_MINUTES = 15
DEFAULT_CENTER_LAT = 37.7749
DEFAULT_CENTER_LNG = -122.4194


def _is_stale(updated_at: datetime) -> bool:
    """Check if location update is older than STALE_MINUTES."""
    return datetime.utcnow() - updated_at > timedelta(minutes=STALE_MINUTES)


def _derive_report_coordinates(report_id: int, lat: Optional[float], lng: Optional[float]) -> tuple[float, float]:
    """Return actual report lat/lng if provided, or derive deterministic map pin location from report_id."""
    if lat is not None and lng is not None and -90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0:
        return lat, lng
    # Deterministic fallback offset based on report ID for visualization
    offset_lat = ((report_id * 17) % 100 - 50) * 0.003
    offset_lng = ((report_id * 23) % 100 - 50) * 0.003
    return DEFAULT_CENTER_LAT + offset_lat, DEFAULT_CENTER_LNG + offset_lng


def _derive_pickup_coordinates(pickup_id: int, report_lat: tuple[float, float]) -> tuple[float, float]:
    """Derive pickup pin near the report location."""
    offset_lat = ((pickup_id * 7) % 20 - 10) * 0.001
    offset_lng = ((pickup_id * 11) % 20 - 10) * 0.001
    return report_lat[0] + offset_lat, report_lat[1] + offset_lng


class LocationService:
    """Service handling GPS coordinate updates, consent state, and role-authorized map data aggregation."""

    @staticmethod
    def update_location(
        db: Session, current_user: User, payload: LocationUpdatePayload
    ) -> UserLocationResponse:
        """Update authenticated user's GPS coordinates with validation."""
        if not (-90.0 <= payload.latitude <= 90.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Latitude must be between -90 and 90 degrees.",
            )
        if not (-180.0 <= payload.longitude <= 180.0):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Longitude must be between -180 and 180 degrees.",
            )

        is_active = payload.is_sharing_active if payload.is_sharing_active is not None else True
        loc = LocationRepository.upsert_user_location(
            db=db,
            user_id=current_user.id,
            latitude=payload.latitude,
            longitude=payload.longitude,
            is_sharing_active=is_active,
        )

        return UserLocationResponse(
            user_id=loc.user_id,
            latitude=loc.latitude,
            longitude=loc.longitude,
            is_sharing_active=loc.is_sharing_active,
            updated_at=loc.updated_at,
            is_stale=_is_stale(loc.updated_at),
        )

    @staticmethod
    def update_consent(
        db: Session, current_user: User, payload: ConsentTogglePayload
    ) -> UserLocationResponse:
        """Toggle location sharing consent state for authenticated user."""
        loc = LocationRepository.set_consent_state(
            db=db, user_id=current_user.id, is_sharing_active=payload.is_sharing_active
        )
        return UserLocationResponse(
            user_id=loc.user_id,
            latitude=loc.latitude,
            longitude=loc.longitude,
            is_sharing_active=loc.is_sharing_active,
            updated_at=loc.updated_at,
            is_stale=_is_stale(loc.updated_at),
        )

    @staticmethod
    def get_my_location(db: Session, current_user: User) -> UserLocationResponse:
        """Fetch current user's location state and coordinates."""
        loc = LocationRepository.get_user_location(db=db, user_id=current_user.id)
        if not loc:
            now = datetime.utcnow()
            return UserLocationResponse(
                user_id=current_user.id,
                latitude=None,
                longitude=None,
                is_sharing_active=False,
                updated_at=now,
                is_stale=False,
            )

        return UserLocationResponse(
            user_id=loc.user_id,
            latitude=loc.latitude,
            longitude=loc.longitude,
            is_sharing_active=loc.is_sharing_active,
            updated_at=loc.updated_at,
            is_stale=_is_stale(loc.updated_at),
        )

    @staticmethod
    def get_map_data(db: Session, current_user: User) -> MapDataResponse:
        """Aggregate geospatial map points authorized for the current user's role."""
        map_points: List[MapPointItem] = []

        # 1. Process Waste Reports
        reports = LocationRepository.get_authorized_reports(db=db, current_user=current_user)
        report_coords_map = {}

        for r in reports:
            lat, lng = _derive_report_coordinates(r.id, r.latitude, r.longitude)
            report_coords_map[r.id] = (lat, lng)

            cat_val = r.category.value if hasattr(r.category, 'value') else str(r.category)
            status_val = r.status.value if hasattr(r.status, 'value') else str(r.status)

            map_points.append(
                MapPointItem(
                    id=f"report_{r.id}",
                    point_type="report",
                    entity_id=r.id,
                    title=f"Report #{r.id} ({cat_val})",
                    description=f"{r.description[:80]} - {r.location}",
                    latitude=lat,
                    longitude=lng,
                    status=status_val,
                    updated_at=r.updated_at,
                    is_live=False,
                    is_stale=False,
                )
            )

        # 2. Process Scheduled Pickups
        pickups = LocationRepository.get_authorized_pickups(db=db, current_user=current_user)
        for p in pickups:
            base_coords = report_coords_map.get(p.report_id, (DEFAULT_CENTER_LAT, DEFAULT_CENTER_LNG))
            p_lat, p_lng = _derive_pickup_coordinates(p.id, base_coords)
            status_val = p.status.value if hasattr(p.status, 'value') else str(p.status)

            map_points.append(
                MapPointItem(
                    id=f"pickup_{p.id}",
                    point_type="pickup",
                    entity_id=p.id,
                    title=f"Pickup #{p.id}",
                    description=f"Scheduled for {p.scheduled_date or 'TBD'} - Status: {status_val}",
                    latitude=p_lat,
                    longitude=p_lng,
                    status=status_val,
                    updated_at=p.updated_at,
                    is_live=False,
                    is_stale=False,
                )
            )

        # 3. Process Active Collectors (Only exposed to ADMINs or users with assigned pickups)
        if current_user.role == UserRole.ADMIN:
            collectors_loc = LocationRepository.get_active_collector_locations(db=db)
            for cl in collectors_loc:
                if cl.latitude is not None and cl.longitude is not None:
                    stale = _is_stale(cl.updated_at)
                    c_name = cl.user.name if cl.user else "Collector"
                    map_points.append(
                        MapPointItem(
                            id=f"collector_{cl.user_id}",
                            point_type="collector",
                            entity_id=cl.user_id,
                            title=f"Collector Fleet ({c_name})",
                            description=f"Active dispatch tracking - {'STALE' if stale else 'LIVE'}",
                            latitude=cl.latitude,
                            longitude=cl.longitude,
                            status="STALE" if stale else "ACTIVE",
                            updated_at=cl.updated_at,
                            is_live=not stale,
                            is_stale=stale,
                        )
                    )

        # Current user's location state
        user_loc_resp = LocationService.get_my_location(db=db, current_user=current_user)

        return MapDataResponse(
            points=map_points,
            total_points=len(map_points),
            user_location=user_loc_resp,
        )
