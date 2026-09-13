"""Repository for activity log database operations."""

from typing import List, Optional
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.activity import ActivityLog
from backend.app.models.enums import ActivityAction
from backend.app.repositories.base import BaseRepository


class ActivityRepository(BaseRepository[ActivityLog]):
    """Repository handling database queries for immutable activity logs."""

    def __init__(self, db: Session):
        super().__init__(ActivityLog, db)

    def get_for_user(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> List[ActivityLog]:
        """Fetch activity logs where user is either the actor or the target user."""
        stmt = (
            select(ActivityLog)
            .where(
                or_(
                    ActivityLog.actor_id == user_id,
                    ActivityLog.target_user_id == user_id,
                )
            )
            .options(
                selectinload(ActivityLog.actor),
                selectinload(ActivityLog.target_user),
            )
            .order_by(ActivityLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_for_user(self, user_id: int) -> int:
        """Count total activity logs for a user."""
        stmt = (
            select(func.count(ActivityLog.id))
            .where(
                or_(
                    ActivityLog.actor_id == user_id,
                    ActivityLog.target_user_id == user_id,
                )
            )
        )
        return self.db.scalar(stmt) or 0

    def get_for_collector(
        self,
        collector_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> List[ActivityLog]:
        """Fetch activity logs relevant to a collector's operations."""
        stmt = (
            select(ActivityLog)
            .where(
                or_(
                    ActivityLog.actor_id == collector_id,
                    ActivityLog.target_user_id == collector_id,
                )
            )
            .options(
                selectinload(ActivityLog.actor),
                selectinload(ActivityLog.target_user),
            )
            .order_by(ActivityLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_for_collector(self, collector_id: int) -> int:
        """Count total activity logs for a collector."""
        stmt = (
            select(func.count(ActivityLog.id))
            .where(
                or_(
                    ActivityLog.actor_id == collector_id,
                    ActivityLog.target_user_id == collector_id,
                )
            )
        )
        return self.db.scalar(stmt) or 0

    def get_admin_logs(
        self,
        action: Optional[ActivityAction] = None,
        entity_type: Optional[str] = None,
        actor_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[ActivityLog]:
        """Fetch platform-wide audit log for administrative view with optional filters."""
        stmt = select(ActivityLog).options(
            selectinload(ActivityLog.actor),
            selectinload(ActivityLog.target_user),
        )

        if action is not None:
            stmt = stmt.where(ActivityLog.action == action)
        if entity_type is not None:
            stmt = stmt.where(ActivityLog.entity_type == entity_type)
        if actor_id is not None:
            stmt = stmt.where(ActivityLog.actor_id == actor_id)

        stmt = stmt.order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_admin_logs(
        self,
        action: Optional[ActivityAction] = None,
        entity_type: Optional[str] = None,
        actor_id: Optional[int] = None,
    ) -> int:
        """Count total platform-wide activity logs matching filters."""
        stmt = select(func.count(ActivityLog.id))

        if action is not None:
            stmt = stmt.where(ActivityLog.action == action)
        if entity_type is not None:
            stmt = stmt.where(ActivityLog.entity_type == entity_type)
        if actor_id is not None:
            stmt = stmt.where(ActivityLog.actor_id == actor_id)

        return self.db.scalar(stmt) or 0
