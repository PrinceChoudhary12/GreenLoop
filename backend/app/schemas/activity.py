"""Pydantic schemas for activity logging and audit trails."""

import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict

from backend.app.models.enums import ActivityAction


class ActivityLogResponse(BaseModel):
    """Activity log item response."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    actor_id: Optional[int] = None
    actor_name: Optional[str] = None
    actor_role: Optional[str] = None
    action: ActivityAction
    entity_type: str
    entity_id: int
    target_user_id: Optional[int] = None
    target_user_name: Optional[str] = None
    details: Optional[str] = None
    created_at: datetime.datetime


class ActivityListResponse(BaseModel):
    """Paginated activity log list response."""
    items: List[ActivityLogResponse]
    total: int
