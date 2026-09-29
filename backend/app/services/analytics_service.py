"""Business logic service for platform analytics and operational reporting."""

import datetime
from sqlalchemy.orm import Session

from backend.app.repositories.analytics_repository import AnalyticsRepository
from backend.app.schemas.analytics import (
    AnalyticsOverviewResponse,
    TimeRangeEnum,
)


class AnalyticsService:
    """Service handling aggregation of system KPIs and analytics."""

    @staticmethod
    def get_overview(
        db: Session,
        time_range: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
    ) -> AnalyticsOverviewResponse:
        """Fetch platform-wide high-level KPI metrics filtered by time range."""
        repo = AnalyticsRepository(db)
        start_date = repo.get_time_boundary(time_range)
        end_date = datetime.datetime.now(datetime.timezone.utc)

        metrics = repo.get_overview_metrics(start_date=start_date)

        return AnalyticsOverviewResponse(
            time_range=time_range,
            start_date=start_date,
            end_date=end_date,
            total_reports=metrics["total_reports"],
            resolved_reports=metrics["resolved_reports"],
            resolution_rate=metrics["resolution_rate"],
            total_pickups=metrics["total_pickups"],
            completed_pickups=metrics["completed_pickups"],
            pickup_completion_rate=metrics["pickup_completion_rate"],
            avg_resolution_turnaround_hours=metrics["avg_resolution_turnaround_hours"],
            active_collectors=metrics["active_collectors"],
            active_citizens=metrics["active_citizens"],
        )
