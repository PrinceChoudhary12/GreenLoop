"""Notification API endpoints for authenticated users."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.notification import (
    NotificationCountResponse,
    NotificationListResponse,
    NotificationResponse,
)
from backend.app.services.notification_service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get(
    "",
    response_model=NotificationListResponse,
    status_code=status.HTTP_200_OK,
    summary="List User Notifications",
    description="Retrieve paginated in-app notifications for the authenticated user.",
)
def list_notifications(
    unread_only: bool = Query(default=False, description="Filter only unread notifications"),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit (max 100)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationListResponse:
    """Fetch notifications for the current user."""
    return NotificationService.get_user_notifications(
        db=db,
        user_id=current_user.id,
        unread_only=unread_only,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/unread-count",
    response_model=NotificationCountResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Unread Notification Count",
    description="Retrieve the total count of unread notifications for the authenticated user.",
)
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationCountResponse:
    """Fetch unread notifications count for badge display."""
    return NotificationService.get_unread_count(db=db, user_id=current_user.id)


@router.patch(
    "/{notification_id}/read",
    response_model=NotificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Mark Notification as Read",
    description="Mark a single notification as read. Enforces user ownership.",
)
def mark_notification_as_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> NotificationResponse:
    """Mark single notification as read."""
    return NotificationService.mark_as_read(
        db=db,
        user_id=current_user.id,
        notification_id=notification_id,
    )


@router.post(
    "/mark-all-read",
    status_code=status.HTTP_200_OK,
    summary="Mark All Notifications as Read",
    description="Mark all unread notifications as read for the authenticated user.",
)
def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    """Mark all unread notifications as read."""
    marked_count = NotificationService.mark_all_read(db=db, user_id=current_user.id)
    return {"success": True, "marked_count": marked_count}
