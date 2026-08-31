"""Waste report API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_current_active_citizen
from backend.app.db.session import get_db
from backend.app.models.enums import ReportPriority, WasteCategory
from backend.app.models.user import User
from backend.app.schemas.report import (
    WasteReportCreate,
    WasteReportResponse,
)
from backend.app.services.report_service import ReportService

router = APIRouter(prefix="/reports", tags=["Waste Reports"])


@router.post(
    "",
    response_model=WasteReportResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Waste Report",
    description="Citizen submission of a new waste report with category, location, priority, and optional image.",
)
async def create_report(
    category: WasteCategory = Form(..., description="Waste classification category"),
    description: str = Form(..., min_length=5, max_length=2000, description="Description of the waste"),
    location: str = Form(..., min_length=3, max_length=255, description="Human readable location"),
    priority: ReportPriority = Form(default=ReportPriority.MEDIUM, description="Collection priority"),
    image: Optional[UploadFile] = File(default=None, description="Optional photo of the waste"),
    current_user: User = Depends(get_current_active_citizen),
    db: Session = Depends(get_db),
) -> WasteReportResponse:
    """Create a new waste report."""
    report_data = WasteReportCreate(
        category=category,
        description=description,
        location=location,
        priority=priority,
    )
    report = await ReportService.create_report(
        db=db,
        user=current_user,
        data=report_data,
        image_file=image,
    )
    return WasteReportResponse.model_validate(report)


@router.get(
    "",
    response_model=List[WasteReportResponse],
    status_code=status.HTTP_200_OK,
    summary="List Citizen Waste Reports",
    description="Retrieve all waste reports submitted by the authenticated citizen.",
)
def list_reports(
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit"),
    current_user: User = Depends(get_current_active_citizen),
    db: Session = Depends(get_db),
) -> List[WasteReportResponse]:
    """List reports for current user."""
    reports = ReportService.get_citizen_reports(
        db=db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
    )
    return [WasteReportResponse.model_validate(r) for r in reports]


@router.get(
    "/{report_id}",
    response_model=WasteReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Waste Report Details",
    description="Retrieve full details for a specific report owned by the authenticated citizen.",
)
def get_report(
    report_id: int,
    current_user: User = Depends(get_current_active_citizen),
    db: Session = Depends(get_db),
) -> WasteReportResponse:
    """Get single report by ID with ownership enforcement."""
    report = ReportService.get_report_by_id(
        db=db,
        report_id=report_id,
        user_id=current_user.id,
    )
    return WasteReportResponse.model_validate(report)
