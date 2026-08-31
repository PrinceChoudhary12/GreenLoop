"""Waste report business service layer."""

from typing import List, Optional
from fastapi import UploadFile, status
from sqlalchemy.orm import Session

from backend.app.core.exceptions import AppException
from backend.app.core.logging import get_logger
from backend.app.models.enums import ReportPriority, ReportStatus, WasteCategory
from backend.app.models.report import WasteReport
from backend.app.models.user import User
from backend.app.repositories.report_repository import ReportRepository
from backend.app.schemas.report import WasteReportCreate
from backend.app.services.storage_service import StorageService

logger = get_logger(__name__)


class ReportService:
    """Service handling waste report lifecycle and citizen ownership."""

    @staticmethod
    async def create_report(
        db: Session,
        user: User,
        data: WasteReportCreate,
        image_file: Optional[UploadFile] = None,
    ) -> WasteReport:
        """Create a new waste report for the authenticated citizen."""
        report_repo = ReportRepository(db)

        # 1. Process optional image upload
        image_path = None
        if image_file and image_file.filename:
            image_path = await StorageService.save_image(image_file)

        # 2. Construct entity with strictly server-controlled fields
        new_report = WasteReport(
            user_id=user.id,
            category=data.category,
            description=data.description,
            location=data.location,
            image_path=image_path,
            status=ReportStatus.SUBMITTED,
            priority=data.priority or ReportPriority.MEDIUM,
        )

        created_report = report_repo.create(new_report)
        logger.info(f"Report #{created_report.id} created by citizen User ID {user.id} ({data.category})")
        return created_report

    @staticmethod
    def get_citizen_reports(
        db: Session,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> List[WasteReport]:
        """Fetch all reports for the authenticated citizen."""
        report_repo = ReportRepository(db)
        return report_repo.get_by_user_id(user_id=user_id, skip=skip, limit=limit)

    @staticmethod
    def get_report_by_id(
        db: Session,
        report_id: int,
        user_id: int,
    ) -> WasteReport:
        """Fetch a specific report ensuring citizen ownership."""
        report_repo = ReportRepository(db)
        report = report_repo.get_by_id(report_id)

        if not report:
            raise AppException(
                message=f"Waste report #{report_id} not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="REPORT_NOT_FOUND",
            )

        # Enforce server-side authorization: citizen cannot access other users' reports
        if report.user_id != user_id:
            logger.warning(
                f"Unauthorized report access attempt: User {user_id} tried to view report #{report_id} owned by User {report.user_id}"
            )
            raise AppException(
                message="You are not authorized to view this report.",
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="UNAUTHORIZED_REPORT_ACCESS",
            )

        return report
