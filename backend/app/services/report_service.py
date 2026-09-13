"""Waste report business service layer."""

from typing import List, Optional
from fastapi import UploadFile, status
from sqlalchemy.orm import Session

from backend.app.core.exceptions import AppException
from backend.app.core.logging import get_logger
from backend.app.models.enums import ActivityAction, NotificationType, ReportPriority, ReportStatus, WasteCategory
from backend.app.models.report import WasteReport
from backend.app.models.user import User
from backend.app.repositories.report_repository import ReportRepository
from backend.app.schemas.report import WasteReportCreate
from backend.app.services.activity_service import ActivityService
from backend.app.services.notification_service import NotificationService
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

        # Emit activity and notification
        ActivityService.log_activity(
            db=db,
            action=ActivityAction.REPORT_CREATED,
            entity_type="report",
            entity_id=created_report.id,
            actor_id=user.id,
            target_user_id=user.id,
            details=f"Report created in category {created_report.category.value} at {created_report.location}",
        )
        NotificationService.create_notification(
            db=db,
            user_id=user.id,
            notification_type=NotificationType.REPORT_CREATED,
            title="Waste Report Submitted",
            message=f"Your waste report #{created_report.id} ({created_report.category.value}) has been submitted successfully.",
            entity_type="report",
            entity_id=created_report.id,
            actor_id=user.id,
        )

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

        # Emit activity and notification to citizen report owner
        ActivityService.log_activity(
            db=db,
            action=ActivityAction.REPORT_CLAIMED,
            entity_type="report",
            entity_id=report.id,
            actor_id=collector.id,
            target_user_id=report.user_id,
            details=f"Report claimed by Collector {collector.name}",
        )
        NotificationService.create_notification(
            db=db,
            user_id=report.user_id,
            notification_type=NotificationType.REPORT_CLAIMED,
            title="Report Claimed",
            message=f"Collector {collector.name} has claimed your waste report #{report.id}.",
            entity_type="report",
            entity_id=report.id,
            actor_id=collector.id,
        )

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

        old_status = report.status
        report.status = new_status
        updated = report_repo.update(report)
        logger.info(f"Report #{report.id} status updated to {new_status.value} by collector {collector_id}")

        # Emit activity and notification only if status changed
        if old_status != new_status:
            ActivityService.log_activity(
                db=db,
                action=ActivityAction.REPORT_STATUS_UPDATED,
                entity_type="report",
                entity_id=report.id,
                actor_id=collector_id,
                target_user_id=report.user_id,
                details=f"Status changed from {old_status.value} to {new_status.value}",
            )
            NotificationService.create_notification(
                db=db,
                user_id=report.user_id,
                notification_type=NotificationType.REPORT_STATUS_UPDATED,
                title=f"Report Status: {new_status.value.replace('_', ' ').title()}",
                message=f"Your waste report #{report.id} status was updated to {new_status.value.replace('_', ' ').title()}.",
                entity_type="report",
                entity_id=report.id,
                actor_id=collector_id,
            )

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
