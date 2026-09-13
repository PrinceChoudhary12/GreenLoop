"""Collector API endpoints."""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_current_active_collector
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.report import CollectorReportStatusUpdate, WasteReportResponse
from backend.app.schemas.user import UserResponse
from backend.app.services.report_service import ReportService

router = APIRouter(prefix="/collectors", tags=["Waste Collectors"])


@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    summary="Get Collector Profile & Workload Metrics",
    description="Retrieve the authenticated collector profile and aggregated workload stats.",
)
def get_collector_me(
    current_user: User = Depends(get_current_active_collector),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Return collector profile along with workload statistics."""
    user_data = UserResponse.model_validate(current_user).model_dump()
    metrics = ReportService.get_collector_metrics(db=db, collector_id=current_user.id)
    return {
        **user_data,
        "metrics": metrics,
    }


@router.get(
    "/reports/available",
    response_model=List[WasteReportResponse],
    status_code=status.HTTP_200_OK,
    summary="List Available Waste Reports",
    description="Retrieve unassigned waste reports waiting for collector pickup.",
)
def list_available_reports(
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit"),
    current_user: User = Depends(get_current_active_collector),
    db: Session = Depends(get_db),
) -> List[WasteReportResponse]:
    """List open unassigned reports for collectors."""
    reports = ReportService.get_available_reports(db=db, skip=skip, limit=limit)
    return [WasteReportResponse.model_validate(r) for r in reports]


@router.get(
    "/reports/assigned",
    response_model=List[WasteReportResponse],
    status_code=status.HTTP_200_OK,
    summary="List Collector's Assigned Reports",
    description="Retrieve waste reports assigned to or claimed by the authenticated collector.",
)
def list_assigned_reports(
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit"),
    current_user: User = Depends(get_current_active_collector),
    db: Session = Depends(get_db),
) -> List[WasteReportResponse]:
    """List reports assigned to the current collector."""
    reports = ReportService.get_collector_assigned_reports(
        db=db,
        collector_id=current_user.id,
        skip=skip,
        limit=limit,
    )
    return [WasteReportResponse.model_validate(r) for r in reports]


@router.post(
    "/reports/{report_id}/claim",
    response_model=WasteReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Claim Waste Report",
    description="Self-assign an open waste report to the authenticated collector.",
)
def claim_report(
    report_id: int,
    current_user: User = Depends(get_current_active_collector),
    db: Session = Depends(get_db),
) -> WasteReportResponse:
    """Self-assign an open waste report."""
    report = ReportService.claim_report(
        db=db,
        report_id=report_id,
        collector=current_user,
    )
    return WasteReportResponse.model_validate(report)


@router.patch(
    "/reports/{report_id}/status",
    response_model=WasteReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Report Status",
    description="Advance the collection status of a claimed report (ACCEPTED, RESOLVED, REJECTED).",
)
def update_report_status(
    report_id: int,
    payload: CollectorReportStatusUpdate,
    current_user: User = Depends(get_current_active_collector),
    db: Session = Depends(get_db),
) -> WasteReportResponse:
    """Update report lifecycle status."""
    report = ReportService.update_report_status(
        db=db,
        report_id=report_id,
        collector_id=current_user.id,
        new_status=payload.status,
    )
    return WasteReportResponse.model_validate(report)
