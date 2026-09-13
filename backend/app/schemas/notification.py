"""Pydantic schemas for user notifications."""

import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.app.models.enums import NotificationType


class NotificationResponse(BaseModel):
    """Notification response item."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    actor_id: Optional[int] = None
    type: NotificationType
    title: str
    message: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    is_read: bool
    read_at: Optional[datetime.datetime] = None
    created_at: datetime.datetime


class NotificationListResponse(BaseModel):
    """Paginated notification list response."""
    items: List[NotificationResponse]
    total: int
    unread_count: int


class NotificationCountResponse(BaseModel):
    """Unread notifications count response."""
    unread_count: int
