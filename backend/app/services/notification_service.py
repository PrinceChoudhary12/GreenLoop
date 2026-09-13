"""Service handling in-app notifications lifecycle and queries."""

from typing import Optional
from fastapi import status
from sqlalchemy.orm import Session

from backend.app.core.exceptions import AppException
from backend.app.core.logging import get_logger
from backend.app.models.enums import NotificationType
from backend.app.models.notification import Notification
from backend.app.repositories.notification_repository import NotificationRepository
from backend.app.schemas.notification import (
    NotificationCountResponse,
    NotificationListResponse,
    NotificationResponse,
)

logger = get_logger(__name__)


class NotificationService:
    """Business logic for notifications."""

    @staticmethod
    def create_notification(
        db: Session,
        user_id: int,
        notification_type: NotificationType,
        title: str,
        message: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        actor_id: Optional[int] = None,
    ) -> Notification:
        """Create and persist a new user notification."""
        repo = NotificationRepository(db)
        notification = Notification(
            user_id=user_id,
            actor_id=actor_id,
            type=notification_type,
            title=title.strip(),
            message=message.strip(),
            entity_type=entity_type,
            entity_id=entity_id,
            is_read=False,
        )
        created = repo.create(notification)
        logger.info(f"Notification #{created.id} ({notification_type.value}) created for User #{user_id}")
        return created

    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: int,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> NotificationListResponse:
        """Fetch paginated notifications and total/unread counts for a user."""
        repo = NotificationRepository(db)
        # Cap limit to safe maximum
        safe_limit = min(max(1, limit), 100)
        items = repo.get_user_notifications(
            user_id=user_id,
            unread_only=unread_only,
            skip=skip,
            limit=safe_limit,
        )
        total = repo.count_user_notifications(user_id=user_id, unread_only=unread_only)
        unread_count = repo.count_unread(user_id=user_id)

        return NotificationListResponse(
            items=[NotificationResponse.model_validate(item) for item in items],
            total=total,
            unread_count=unread_count,
        )

    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> NotificationCountResponse:
        """Get unread notification count for the user."""
        repo = NotificationRepository(db)
        count = repo.count_unread(user_id=user_id)
        return NotificationCountResponse(unread_count=count)

    @staticmethod
    def mark_as_read(
        db: Session,
        user_id: int,
        notification_id: int,
    ) -> NotificationResponse:
        """Mark a notification as read with ownership verification."""
        repo = NotificationRepository(db)
        notification = repo.get_by_id_and_user(notification_id=notification_id, user_id=user_id)
        if not notification:
            # Check if notification exists at all for better error messages
            existing = repo.get_by_id(notification_id)
            if existing and existing.user_id != user_id:
                raise AppException(
                    message="You do not have permission to modify this notification.",
                    status_code=status.HTTP_403_FORBIDDEN,
                    error_code="FORBIDDEN_OWNERSHIP",
                )
            raise AppException(
                message="Notification not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="NOTIFICATION_NOT_FOUND",
            )

        updated = repo.mark_as_read(notification_id=notification_id, user_id=user_id)
        return NotificationResponse.model_validate(updated)

    @staticmethod
    def mark_all_read(db: Session, user_id: int) -> int:
        """Mark all unread notifications for a user as read."""
        repo = NotificationRepository(db)
        count = repo.mark_all_read_for_user(user_id=user_id)
        logger.info(f"Marked {count} notifications as read for User #{user_id}")
        return count
