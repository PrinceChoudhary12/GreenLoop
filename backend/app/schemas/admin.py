"""Pydantic schemas for Admin operations."""

import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from backend.app.models.enums import ReportPriority, ReportStatus, UserRole, WasteCategory


class AdminDashboardMetrics(BaseModel):
    """Platform-wide aggregated metrics for Admin Dashboard."""

    total_users: int
    total_citizens: int
    total_collectors: int
    active_users: int
    deactivated_users: int
    total_reports: int
    submitted_reports: int
    active_reports: int
    resolved_reports: int
    rejected_reports: int


class UserAdminResponse(BaseModel):
    """Detailed user view for administrative management."""

    id: int
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime.datetime
    reports_count: int = 0
    assigned_reports_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class UserStatusUpdatePayload(BaseModel):
    """Payload for updating user activation status."""

    is_active: bool = Field(..., description="Target active status for user account")


class CollectorLookupItem(BaseModel):
    """Simplified collector profile for assignment selection."""

    id: int
    name: str
    email: str
    is_active: bool
    active_tasks_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class AdminReportResponse(BaseModel):
    """Comprehensive report details for administrative overview."""

    id: int
    user_id: int
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    collector_id: Optional[int] = None
    collector_name: Optional[str] = None
    collector_email: Optional[str] = None
    category: WasteCategory
    description: str
    location: str
    image_path: Optional[str] = None
    status: ReportStatus
    priority: ReportPriority
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)


class ReportAssignPayload(BaseModel):
    """Payload for administrative assignment of a report to a collector."""

    collector_id: int = Field(..., description="Target collector user ID")


class AdminReportStatusUpdatePayload(BaseModel):
    """Payload for administrative override of report status."""

    status: ReportStatus = Field(..., description="Target lifecycle status")
