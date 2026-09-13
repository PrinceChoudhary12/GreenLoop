"""Activity and audit trail API endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.deps import (
    get_current_active_admin,
    get_current_active_citizen,
    get_current_active_collector,
)
from backend.app.db.session import get_db
from backend.app.models.enums import ActivityAction
from backend.app.models.user import User
from backend.app.schemas.activity import ActivityListResponse
from backend.app.services.activity_service import ActivityService

router = APIRouter(prefix="/activity", tags=["Activity & Audit Logs"])


@router.get(
    "/me",
    response_model=ActivityListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Citizen Activity Timeline",
    description="Retrieve personal activity history related to waste reports and pickups.",
)
def get_citizen_activity(
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit (max 100)"),
    current_user: User = Depends(get_current_active_citizen),
    db: Session = Depends(get_db),
) -> ActivityListResponse:
    """Fetch personal activity stream for the authenticated citizen."""
    return ActivityService.get_citizen_activity(
        db=db,
        citizen_id=current_user.id,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/collector",
    response_model=ActivityListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Collector Activity History",
    description="Retrieve activity history for the authenticated collector's tasks and assignments.",
)
def get_collector_activity(
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit (max 100)"),
    current_user: User = Depends(get_current_active_collector),
    db: Session = Depends(get_db),
) -> ActivityListResponse:
    """Fetch operational activity history for the collector."""
    return ActivityService.get_collector_activity(
        db=db,
        collector_id=current_user.id,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/admin",
    response_model=ActivityListResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Platform-Wide Audit Logs",
    description="Retrieve platform-wide activity and audit log entries with filtering options.",
)
def get_admin_audit_logs(
    action: Optional[ActivityAction] = Query(default=None, description="Filter by activity action"),
    entity_type: Optional[str] = Query(default=None, description="Filter by entity type ('report', 'pickup', 'user')"),
    actor_id: Optional[int] = Query(default=None, description="Filter by actor user ID"),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit (max 100)"),
    current_user: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> ActivityListResponse:
    """Fetch system-wide audit logs for administrator review."""
    return ActivityService.get_admin_activity(
        db=db,
        action=action,
        entity_type=entity_type,
        actor_id=actor_id,
        skip=skip,
        limit=limit,
    )
