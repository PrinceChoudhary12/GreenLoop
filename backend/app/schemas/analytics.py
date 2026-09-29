"""Pydantic schemas for platform analytics and operational reporting."""

import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.app.models.enums import WasteCategory


class TimeRangeEnum(str, Enum):
    """Allowed time range query filters."""

    LAST_7_DAYS = "7d"
    LAST_30_DAYS = "30d"
    LAST_90_DAYS = "90d"
    ALL_TIME = "all"


class TrendIntervalEnum(str, Enum):
    """Allowed trend interval bucket sizes."""

    DAY = "day"
    WEEK = "week"
    MONTH = "month"


class AnalyticsOverviewResponse(BaseModel):
    """Platform-wide high-level KPI overview metrics."""

    time_range: TimeRangeEnum
    start_date: Optional[datetime.datetime] = None
    end_date: datetime.datetime
    total_reports: int = Field(..., description="Total waste reports submitted")
    resolved_reports: int = Field(..., description="Total waste reports resolved")
    resolution_rate: float = Field(..., description="Percentage of submitted reports resolved (0.0 - 100.0)")
    total_pickups: int = Field(..., description="Total scheduled pickups requested")
    completed_pickups: int = Field(..., description="Total scheduled pickups completed")
    pickup_completion_rate: float = Field(..., description="Percentage of pickups completed (0.0 - 100.0)")
    avg_resolution_turnaround_hours: float = Field(..., description="Average hours from report creation to resolution")
    active_collectors: int = Field(..., description="Total number of active waste collectors")
    active_citizens: int = Field(..., description="Total number of active registered citizens")

    model_config = ConfigDict(from_attributes=True)


class CategoryMetricItem(BaseModel):
    """Waste category specific metrics."""

    category: WasteCategory
    label: str
    report_count: int
    percentage: float
    resolved_count: int
    resolution_rate: float

    model_config = ConfigDict(from_attributes=True)


class CategoryAnalyticsResponse(BaseModel):
    """Waste category breakdown response."""

    time_range: TimeRangeEnum
    total_reports: int
    categories: List[CategoryMetricItem]

    model_config = ConfigDict(from_attributes=True)


class TrendDataPoint(BaseModel):
    """Single time-series trend data point bucket."""

    timestamp: datetime.datetime
    label: str
    submitted_reports: int = 0
    resolved_reports: int = 0
    requested_pickups: int = 0
    completed_pickups: int = 0

    model_config = ConfigDict(from_attributes=True)


class TrendAnalyticsResponse(BaseModel):
    """Time-series trend collection response."""

    time_range: TimeRangeEnum
    interval: TrendIntervalEnum
    data_points: List[TrendDataPoint]

    model_config = ConfigDict(from_attributes=True)


class CollectorPerformanceItem(BaseModel):
    """Individual collector performance statistics."""

    collector_id: int
    name: str
    email: str
    is_active: bool
    assigned_reports: int
    resolved_reports: int
    assigned_pickups: int
    completed_pickups: int
    resolution_rate: float
    avg_completion_time_hours: float

    model_config = ConfigDict(from_attributes=True)


class CollectorPerformanceResponse(BaseModel):
    """Collector operational performance rankings response."""

    time_range: TimeRangeEnum
    collectors: List[CollectorPerformanceItem]

    model_config = ConfigDict(from_attributes=True)
