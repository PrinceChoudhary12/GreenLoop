"""Repository for location database operations."""

from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session

from backend.app.models.location import UserLocation
from backend.app.models.pickup import Pickup
from backend.app.models.report import WasteReport
from backend.app.models.user import User
from backend.app.models.enums import UserRole


class LocationRepository:
    """Encapsulates data access logic for GPS coordinates, consent, and geospatial queries."""

    @staticmethod
    def get_user_location(db: Session, user_id: int) -> Optional[UserLocation]:
        """Fetch location record for a specific user."""
        return db.query(UserLocation).filter(UserLocation.user_id == user_id).first()

    @staticmethod
    def upsert_user_location(
        db: Session,
        user_id: int,
        latitude: float,
        longitude: float,
        is_sharing_active: bool = True,
    ) -> UserLocation:
        """Create or update user location coordinates and timestamp."""
        now = datetime.utcnow()
        loc = db.query(UserLocation).filter(UserLocation.user_id == user_id).first()
        if not loc:
            loc = UserLocation(
                user_id=user_id,
                latitude=latitude,
                longitude=longitude,
                is_sharing_active=is_sharing_active,
                updated_at=now,
            )
            db.add(loc)
        else:
            loc.latitude = latitude
            loc.longitude = longitude
            loc.is_sharing_active = is_sharing_active
            loc.updated_at = now

        db.commit()
        db.refresh(loc)
        return loc

    @staticmethod
    def set_consent_state(db: Session, user_id: int, is_sharing_active: bool) -> UserLocation:
        """Update consent toggle for a user."""
        now = datetime.utcnow()
        loc = db.query(UserLocation).filter(UserLocation.user_id == user_id).first()
        if not loc:
            loc = UserLocation(
                user_id=user_id,
                is_sharing_active=is_sharing_active,
                updated_at=now,
            )
            db.add(loc)
        else:
            loc.is_sharing_active = is_sharing_active
            loc.updated_at = now

        db.commit()
        db.refresh(loc)
        return loc

    @staticmethod
    def get_active_collector_locations(db: Session) -> List[UserLocation]:
        """Fetch active collector locations with consent enabled."""
        return (
            db.query(UserLocation)
            .join(User)
            .filter(
                User.role == UserRole.COLLECTOR,
                User.is_active == True,  # noqa: E712
                UserLocation.is_sharing_active == True,  # noqa: E712
                UserLocation.latitude.isnot(None),
                UserLocation.longitude.isnot(None),
            )
            .all()
        )

    @staticmethod
    def get_authorized_reports(db: Session, current_user: User) -> List[WasteReport]:
        """Fetch waste reports accessible to current user for mapping."""
        if current_user.role == UserRole.ADMIN:
            return db.query(WasteReport).all()
        if current_user.role == UserRole.COLLECTOR:
            # Reports assigned to collector or unassigned submitted reports
            return (
                db.query(WasteReport)
                .filter(
                    (WasteReport.collector_id == current_user.id)
                    | (WasteReport.collector_id.is_(None))
                )
                .all()
            )
        # Citizen views their own reports
        return db.query(WasteReport).filter(WasteReport.user_id == current_user.id).all()

    @staticmethod
    def get_authorized_pickups(db: Session, current_user: User) -> List[Pickup]:
        """Fetch pickups accessible to current user for mapping."""
        if current_user.role == UserRole.ADMIN:
            return db.query(Pickup).all()
        if current_user.role == UserRole.COLLECTOR:
            return db.query(Pickup).filter(Pickup.collector_id == current_user.id).all()
        # Citizen views pickups for their reports
        user_report_ids = [
            r.id
            for r in db.query(WasteReport.id)
            .filter(WasteReport.user_id == current_user.id)
            .all()
        ]
        if not user_report_ids:
            return []
        return db.query(Pickup).filter(Pickup.report_id.in_(user_report_ids)).all()
