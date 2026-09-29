"""Platform analytics API endpoints."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_current_active_admin
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.analytics import (
    AnalyticsOverviewResponse,
    TimeRangeEnum,
)
from backend.app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Platform Analytics"])


@router.get(
    "/overview",
    response_model=AnalyticsOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Platform Analytics Overview KPIs",
    description="Retrieve high-level aggregated platform KPIs with date-range filtering. Admin only.",
)
def get_analytics_overview(
    time_range: TimeRangeEnum = Query(
        default=TimeRangeEnum.LAST_30_DAYS,
        description="Time filter window (7d, 30d, 90d, all)",
    ),
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> AnalyticsOverviewResponse:
    """Return platform overview KPIs for administrator inspection."""
    return AnalyticsService.get_overview(db=db, time_range=time_range)
