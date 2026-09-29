"""Business logic service for platform analytics and operational reporting."""

import datetime
from sqlalchemy.orm import Session

from backend.app.repositories.analytics_repository import AnalyticsRepository
from backend.app.schemas.analytics import (
    AnalyticsOverviewResponse,
    CategoryAnalyticsResponse,
    CategoryMetricItem,
    TimeRangeEnum,
    TrendAnalyticsResponse,
    TrendDataPoint,
    TrendIntervalEnum,
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

    @staticmethod
    def get_categories(
        db: Session,
        time_range: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
    ) -> CategoryAnalyticsResponse:
        """Fetch waste reports aggregation grouped by category."""
        repo = AnalyticsRepository(db)
        start_date = repo.get_time_boundary(time_range)
        data = repo.get_category_metrics(start_date=start_date)

        return CategoryAnalyticsResponse(
            time_range=time_range,
            total_reports=data["total_reports"],
            categories=[CategoryMetricItem.model_validate(c) for c in data["categories"]],
        )

    @staticmethod
    def get_trends(
        db: Session,
        interval: TrendIntervalEnum = TrendIntervalEnum.DAY,
        time_range: TimeRangeEnum = TimeRangeEnum.LAST_30_DAYS,
    ) -> TrendAnalyticsResponse:
        """Fetch chronological time-series trends for reports and pickups."""
        repo = AnalyticsRepository(db)
        start_date = repo.get_time_boundary(time_range)
        data_points = repo.get_trend_metrics(
            start_date=start_date,
            interval=interval,
            time_range=time_range,
        )

        return TrendAnalyticsResponse(
            time_range=time_range,
            interval=interval,
            data_points=[TrendDataPoint.model_validate(dp) for dp in data_points],
        )
