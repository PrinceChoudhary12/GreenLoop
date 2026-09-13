"""Admin API endpoints for platform monitoring and management."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_current_active_admin
from backend.app.db.session import get_db
from backend.app.models.enums import ReportPriority, ReportStatus, UserRole, WasteCategory
from backend.app.models.user import User
from backend.app.schemas.admin import (
    AdminDashboardMetrics,
    AdminReportResponse,
    AdminReportStatusUpdatePayload,
    CollectorLookupItem,
    ReportAssignPayload,
    UserAdminResponse,
    UserStatusUpdatePayload,
)
from backend.app.services.admin_service import AdminService

router = APIRouter(prefix="/admin", tags=["Administration"])


@router.get(
    "/metrics",
    response_model=AdminDashboardMetrics,
    status_code=status.HTTP_200_OK,
    summary="Get Systemwide Admin Metrics",
    description="Retrieve aggregated statistics for users, collectors, and waste report lifecycles.",
)
def get_admin_metrics(
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> AdminDashboardMetrics:
    """Retrieve platform operational metrics."""
    return AdminService.get_system_metrics(db=db)


@router.get(
    "/users",
    response_model=List[UserAdminResponse],
    status_code=status.HTTP_200_OK,
    summary="List Platform Users",
    description="Retrieve paginated platform users with optional role, activation status, and search filters.",
)
def list_users(
    role: Optional[UserRole] = Query(default=None, description="Filter by User role"),
    is_active: Optional[bool] = Query(default=None, description="Filter by activation status"),
    search: Optional[str] = Query(default=None, description="Search user name or email"),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit"),
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> List[UserAdminResponse]:
    """List and filter users for administrative inspection."""
    return AdminService.list_users(
        db=db,
        role=role,
        is_active=is_active,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/collectors",
    response_model=List[CollectorLookupItem],
    status_code=status.HTTP_200_OK,
    summary="List Active Collectors",
    description="Retrieve active collectors and their active task counts for assignment dropdowns.",
)
def list_collectors(
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> List[CollectorLookupItem]:
    """List active collectors for task assignment."""
    return AdminService.list_collectors(db=db)


@router.patch(
    "/users/{user_id}/status",
    response_model=UserAdminResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle User Activation Status",
    description="Activate or deactivate a user account. Admins cannot deactivate their own account.",
)
def update_user_status(
    user_id: int,
    payload: UserStatusUpdatePayload,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> UserAdminResponse:
    """Toggle user active state."""
    updated = AdminService.toggle_user_active_status(
        db=db,
        target_user_id=user_id,
        current_admin_id=current_admin.id,
        is_active=payload.is_active,
    )
    return UserAdminResponse(
        id=updated.id,
        name=updated.name,
        email=updated.email,
        role=updated.role,
        is_active=updated.is_active,
        created_at=updated.created_at,
        reports_count=len(updated.reports) if hasattr(updated, "reports") else 0,
        assigned_reports_count=len(updated.assigned_reports) if hasattr(updated, "assigned_reports") else 0,
    )


@router.get(
    "/reports",
    response_model=List[AdminReportResponse],
    status_code=status.HTTP_200_OK,
    summary="List All Waste Reports",
    description="Retrieve systemwide waste reports with creator and collector details.",
)
def list_all_reports(
    status_filter: Optional[ReportStatus] = Query(default=None, alias="status", description="Filter by lifecycle status"),
    category: Optional[WasteCategory] = Query(default=None, description="Filter by waste category"),
    priority: Optional[ReportPriority] = Query(default=None, description="Filter by collection priority"),
    collector_id: Optional[int] = Query(default=None, description="Filter by assigned collector ID"),
    search: Optional[str] = Query(default=None, description="Search description or location"),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit"),
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> List[AdminReportResponse]:
    """Retrieve all reports for administration."""
    return AdminService.list_all_reports(
        db=db,
        status_filter=status_filter,
        category=category,
        priority=priority,
        collector_id=collector_id,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/reports/{report_id}/assign",
    response_model=AdminReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Assign Report to Collector",
    description="Manually assign an unassigned or active report to a designated active collector.",
)
def assign_report(
    report_id: int,
    payload: ReportAssignPayload,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> AdminReportResponse:
    """Manually assign report to a collector."""
    report = AdminService.assign_report_to_collector(
        db=db,
        report_id=report_id,
        collector_id=payload.collector_id,
        admin_user_id=current_admin.id,
    )
    return AdminReportResponse(
        id=report.id,
        user_id=report.user_id,
        user_name=report.user.name if report.user else None,
        user_email=report.user.email if report.user else None,
        collector_id=report.collector_id,
        collector_name=report.collector.name if report.collector else None,
        collector_email=report.collector.email if report.collector else None,
        category=report.category,
        description=report.description,
        location=report.location,
        image_path=report.image_path,
        status=report.status,
        priority=report.priority,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )


@router.patch(
    "/reports/{report_id}/status",
    response_model=AdminReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Override Report Status",
    description="Administratively update the lifecycle status of any waste report.",
)
def override_report_status(
    report_id: int,
    payload: AdminReportStatusUpdatePayload,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> AdminReportResponse:
    """Administratively override report status."""
    report = AdminService.override_report_status(
        db=db,
        report_id=report_id,
        new_status=payload.status,
        admin_user_id=current_admin.id,
    )
    return AdminReportResponse(
        id=report.id,
        user_id=report.user_id,
        user_name=report.user.name if report.user else None,
        user_email=report.user.email if report.user else None,
        collector_id=report.collector_id,
        collector_name=report.collector.name if report.collector else None,
        collector_email=report.collector.email if report.collector else None,
        category=report.category,
        description=report.description,
        location=report.location,
        image_path=report.image_path,
        status=report.status,
        priority=report.priority,
        created_at=report.created_at,
        updated_at=report.updated_at,
    )
