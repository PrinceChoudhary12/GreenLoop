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

    @staticmethod
    def get_available_reports(
        db: Session,
        skip: int = 0,
        limit: int = 100,
    ) -> List[WasteReport]:
        """Fetch open submitted waste reports available for pickup."""
        report_repo = ReportRepository(db)
        return report_repo.get_available_reports(skip=skip, limit=limit)

    @staticmethod
    def get_collector_assigned_reports(
        db: Session,
        collector_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> List[WasteReport]:
        """Fetch all reports claimed by or assigned to a collector."""
        report_repo = ReportRepository(db)
        return report_repo.get_by_collector_id(collector_id=collector_id, skip=skip, limit=limit)

    @staticmethod
    def claim_report(
        db: Session,
        report_id: int,
        collector: User,
    ) -> WasteReport:
        """Assign an open waste report to the authenticated collector."""
        report_repo = ReportRepository(db)
        report = report_repo.get_by_id(report_id)

        if not report:
            raise AppException(
                message=f"Waste report #{report_id} not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="REPORT_NOT_FOUND",
            )

        if report.collector_id is not None and report.collector_id != collector.id:
            raise AppException(
                message=f"Waste report #{report_id} has already been claimed by another collector.",
                status_code=status.HTTP_409_CONFLICT,
                error_code="REPORT_ALREADY_CLAIMED",
            )

        if report.status in [ReportStatus.RESOLVED, ReportStatus.REJECTED]:
            raise AppException(
                message=f"Cannot claim a closed report (status: {report.status.value}).",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="REPORT_ALREADY_CLOSED",
            )

        report.collector_id = collector.id
        if report.status == ReportStatus.SUBMITTED:
            report.status = ReportStatus.UNDER_REVIEW

        updated = report_repo.update(report)
        logger.info(f"Report #{report.id} claimed by collector {collector.id} ({collector.email})")
        return updated

    @staticmethod
    def update_report_status(
        db: Session,
        report_id: int,
        collector_id: int,
        new_status: ReportStatus,
    ) -> WasteReport:
        """Update the operational status of a claimed waste report."""
        report_repo = ReportRepository(db)
        report = report_repo.get_by_id(report_id)

        if not report:
            raise AppException(
                message=f"Waste report #{report_id} not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="REPORT_NOT_FOUND",
            )

        if report.collector_id != collector_id:
            raise AppException(
                message="You are not authorized to update this report. Only the assigned collector can update it.",
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="FORBIDDEN_REPORT_UPDATE",
            )

        allowed_target_statuses = [ReportStatus.ACCEPTED, ReportStatus.RESOLVED, ReportStatus.REJECTED, ReportStatus.UNDER_REVIEW]
        if new_status not in allowed_target_statuses:
            raise AppException(
                message=f"Invalid status transition to '{new_status.value}'.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="INVALID_STATUS_TRANSITION",
            )

        report.status = new_status
        updated = report_repo.update(report)
        logger.info(f"Report #{report.id} status updated to {new_status.value} by collector {collector_id}")
        return updated

    @staticmethod
    def get_collector_metrics(db: Session, collector_id: int) -> dict:
        """Aggregate collector workload metrics."""
        report_repo = ReportRepository(db)
        assigned = report_repo.get_by_collector_id(collector_id=collector_id, limit=500)
        available = report_repo.get_available_reports(limit=500)

        active = [r for r in assigned if r.status in [ReportStatus.UNDER_REVIEW, ReportStatus.ACCEPTED]]
        resolved = [r for r in assigned if r.status == ReportStatus.RESOLVED]

        return {
            "available_count": len(available),
            "assigned_count": len(assigned),
            "active_count": len(active),
            "resolved_count": len(resolved),
        }
