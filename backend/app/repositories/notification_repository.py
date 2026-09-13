"""Repository for user notification operations."""

import datetime
from typing import List, Optional
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from backend.app.models.notification import Notification
from backend.app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    """Repository handling database interactions for notifications."""

    def __init__(self, db: Session):
        super().__init__(Notification, db)

    def get_by_id_and_user(self, notification_id: int, user_id: int) -> Optional[Notification]:
        """Fetch a specific notification ensuring strict user ownership."""
        stmt = (
            select(Notification)
            .where(
                Notification.id == notification_id,
                Notification.user_id == user_id,
            )
        )
        return self.db.scalar(stmt)

    def get_user_notifications(
        self,
        user_id: int,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Notification]:
        """Fetch notifications for a user, ordered from newest to oldest."""
        stmt = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            stmt = stmt.where(Notification.is_read.is_(False))
        stmt = stmt.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
        return list(self.db.scalars(stmt).all())

    def count_user_notifications(self, user_id: int, unread_only: bool = False) -> int:
        """Count total notifications matching filter for user."""
        stmt = select(func.count(Notification.id)).where(Notification.user_id == user_id)
        if unread_only:
            stmt = stmt.where(Notification.is_read.is_(False))
        return self.db.scalar(stmt) or 0

    def count_unread(self, user_id: int) -> int:
        """Count unread notifications for user."""
        return self.count_user_notifications(user_id=user_id, unread_only=True)

    def mark_as_read(self, notification_id: int, user_id: int) -> Optional[Notification]:
        """Mark a single notification as read if owned by the user."""
        notification = self.get_by_id_and_user(notification_id, user_id)
        if not notification:
            return None
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.datetime.now(datetime.timezone.utc)
            self.db.commit()
            self.db.refresh(notification)
        return notification

    def mark_all_read_for_user(self, user_id: int) -> int:
        """Mark all unread notifications as read for a user."""
        now = datetime.datetime.now(datetime.timezone.utc)
        stmt = (
            update(Notification)
            .where(
                Notification.user_id == user_id,
                Notification.is_read.is_(False),
            )
            .values(
                is_read=True,
                read_at=now,
            )
        )
        result = self.db.execute(stmt)
        self.db.commit()
        return result.rowcount
