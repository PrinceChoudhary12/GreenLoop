"""Platform analytics API endpoints."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_current_active_admin
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.analytics import (
    AnalyticsOverviewResponse,
    CategoryAnalyticsResponse,
    TimeRangeEnum,
    TrendAnalyticsResponse,
    TrendIntervalEnum,
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


@router.get(
    "/categories",
    response_model=CategoryAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Waste Category Distribution Analytics",
    description="Retrieve distribution and resolution metrics aggregated across all waste categories. Admin only.",
)
def get_analytics_categories(
    time_range: TimeRangeEnum = Query(
        default=TimeRangeEnum.LAST_30_DAYS,
        description="Time filter window (7d, 30d, 90d, all)",
    ),
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> CategoryAnalyticsResponse:
    """Return category distribution analytics for administrator inspection."""
    return AnalyticsService.get_categories(db=db, time_range=time_range)


@router.get(
    "/trends",
    response_model=TrendAnalyticsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Platform Time-Series Trends",
    description="Retrieve chronological timeline trends for reports and pickups. Admin only.",
)
def get_analytics_trends(
    interval: TrendIntervalEnum = Query(
        default=TrendIntervalEnum.DAY,
        description="Trend bucket interval (day, week, month)",
    ),
    time_range: TimeRangeEnum = Query(
        default=TimeRangeEnum.LAST_30_DAYS,
        description="Time filter window (7d, 30d, 90d, all)",
    ),
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> TrendAnalyticsResponse:
    """Return time-series trend analytics for administrator inspection."""
    return AnalyticsService.get_trends(
        db=db,
        interval=interval,
        time_range=time_range,
    )
