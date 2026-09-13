"""Repository for Pickup database operations."""

from typing import List, Optional
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.enums import PickupStatus
from backend.app.models.pickup import Pickup
from backend.app.models.report import WasteReport
from backend.app.models.user import User
from backend.app.repositories.base import BaseRepository

ACTIVE_PICKUP_STATUSES = [
    PickupStatus.REQUESTED,
    PickupStatus.SCHEDULED,
    PickupStatus.ASSIGNED,
    PickupStatus.ACCEPTED,
    PickupStatus.IN_PROGRESS,
]


class PickupRepository(BaseRepository[Pickup]):
    """Repository handling queries for waste pickup workflows."""

    def __init__(self, db: Session):
        super().__init__(Pickup, db)

    def get_by_id_with_relations(self, pickup_id: int) -> Optional[Pickup]:
        """Fetch a pickup with eager-loaded report, user, collector, and cancelled_by entities."""
        stmt = (
            select(Pickup)
            .where(Pickup.id == pickup_id)
            .options(
                selectinload(Pickup.report),
                selectinload(Pickup.user),
                selectinload(Pickup.collector),
                selectinload(Pickup.cancelled_by),
            )
        )
        return self.db.scalar(stmt)

    def get_active_pickup_for_report(self, report_id: int) -> Optional[Pickup]:
        """Check if an active pickup request already exists for a report."""
        stmt = (
            select(Pickup)
            .where(
                Pickup.report_id == report_id,
                Pickup.status.in_(ACTIVE_PICKUP_STATUSES),
            )
        )
        return self.db.scalar(stmt)

    def get_by_user_id(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Pickup]:
        """Fetch pickup requests created by a specific citizen."""
        stmt = (
            select(Pickup)
            .where(Pickup.user_id == user_id)
            .options(
                selectinload(Pickup.report),
                selectinload(Pickup.collector),
            )
            .order_by(Pickup.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_by_collector_id(
        self,
        collector_id: int,
        status: Optional[PickupStatus] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Pickup]:
        """Fetch pickups assigned to a specific collector."""
        stmt = (
            select(Pickup)
            .where(Pickup.collector_id == collector_id)
            .options(
                selectinload(Pickup.report),
                selectinload(Pickup.user),
            )
        )
        if status is not None:
            stmt = stmt.where(Pickup.status == status)
        stmt = stmt.order_by(Pickup.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def get_all_pickups(
        self,
        status: Optional[PickupStatus] = None,
        collector_id: Optional[int] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Pickup]:
        """Fetch all platform pickups with administrative filtering and search."""
        stmt = (
            select(Pickup)
            .options(
                selectinload(Pickup.report),
                selectinload(Pickup.user),
                selectinload(Pickup.collector),
                selectinload(Pickup.cancelled_by),
            )
        )
        if status is not None:
            stmt = stmt.where(Pickup.status == status)
        if collector_id is not None:
            stmt = stmt.where(Pickup.collector_id == collector_id)
        if search and search.strip():
            term = f"%{search.strip()}%"
            stmt = stmt.join(Pickup.report).where(
                or_(
                    WasteReport.description.ilike(term),
                    WasteReport.location.ilike(term),
                    Pickup.notes.ilike(term),
                    Pickup.contact_phone.ilike(term),
                )
            )
        stmt = stmt.order_by(Pickup.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_by_status(self, status: Optional[PickupStatus] = None) -> int:
        """Count pickups with optional status filter."""
        from sqlalchemy import func
        stmt = select(func.count(Pickup.id))
        if status is not None:
            stmt = stmt.where(Pickup.status == status)
        return self.db.scalar(stmt) or 0
