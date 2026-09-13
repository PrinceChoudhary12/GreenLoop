"""Administrative service providing operational management workflows."""

from typing import Any, Dict, List, Optional
from fastapi import status
from sqlalchemy.orm import Session

from backend.app.core.exceptions import AppException
from backend.app.core.logging import get_logger
from backend.app.models.enums import (
    ActivityAction,
    NotificationType,
    ReportPriority,
    ReportStatus,
    UserRole,
    WasteCategory,
)
from backend.app.models.report import WasteReport
from backend.app.models.user import User
from backend.app.repositories.report_repository import ReportRepository
from backend.app.repositories.user_repository import UserRepository
from backend.app.schemas.admin import (
    AdminDashboardMetrics,
    AdminReportResponse,
    CollectorLookupItem,
    UserAdminResponse,
)
from backend.app.services.activity_service import ActivityService
from backend.app.services.notification_service import NotificationService

logger = get_logger("greenloop.services.admin")


class AdminService:
    """Business logic for system administration."""

    @staticmethod
    def get_system_metrics(db: Session) -> AdminDashboardMetrics:
        """Aggregate platform-wide operational KPIs for Admin Dashboard."""
        user_repo = UserRepository(db)
        report_repo = ReportRepository(db)

        total_users = user_repo.count_users()
        total_citizens = user_repo.count_users(role=UserRole.CITIZEN)
        total_collectors = user_repo.count_users(role=UserRole.COLLECTOR)
        active_users = user_repo.count_users(is_active=True)
        deactivated_users = user_repo.count_users(is_active=False)

        total_reports = report_repo.count_reports()
        submitted = report_repo.count_reports(status=ReportStatus.SUBMITTED)
        active_reports = (
            report_repo.count_reports(status=ReportStatus.UNDER_REVIEW)
            + report_repo.count_reports(status=ReportStatus.ACCEPTED)
        )
        resolved = report_repo.count_reports(status=ReportStatus.RESOLVED)
        rejected = report_repo.count_reports(status=ReportStatus.REJECTED)

        return AdminDashboardMetrics(
            total_users=total_users,
            total_citizens=total_citizens,
            total_collectors=total_collectors,
            active_users=active_users,
            deactivated_users=deactivated_users,
            total_reports=total_reports,
            submitted_reports=submitted,
            active_reports=active_reports,
            resolved_reports=resolved,
            rejected_reports=rejected,
        )

    @staticmethod
    def list_users(
        db: Session,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[UserAdminResponse]:
        """Fetch users with detailed metadata for administration."""
        user_repo = UserRepository(db)
        users = user_repo.get_all(
            role=role,
            is_active=is_active,
            search=search,
            skip=skip,
            limit=limit,
        )
        result = []
        for u in users:
            reports_cnt = len(u.reports) if hasattr(u, "reports") else 0
            assigned_cnt = len(u.assigned_reports) if hasattr(u, "assigned_reports") else 0
            result.append(
                UserAdminResponse(
                    id=u.id,
                    name=u.name,
                    email=u.email,
                    role=u.role,
                    is_active=u.is_active,
                    created_at=u.created_at,
                    reports_count=reports_cnt,
                    assigned_reports_count=assigned_cnt,
                )
            )
        return result

    @staticmethod
    def list_collectors(db: Session) -> List[CollectorLookupItem]:
        """Fetch active collectors for administrative assignment."""
        user_repo = UserRepository(db)
        collectors = user_repo.get_collectors(active_only=True)
        items = []
        for c in collectors:
            active_tasks = [
                r for r in c.assigned_reports
                if r.status in [ReportStatus.UNDER_REVIEW, ReportStatus.ACCEPTED]
            ]
            items.append(
                CollectorLookupItem(
                    id=c.id,
                    name=c.name,
                    email=c.email,
                    is_active=c.is_active,
                    active_tasks_count=len(active_tasks),
                )
            )
        return items

    @staticmethod
    def toggle_user_active_status(
        db: Session,
        target_user_id: int,
        current_admin_id: int,
        is_active: bool,
    ) -> User:
        """Activate or deactivate a user account with safety guards."""
        user_repo = UserRepository(db)
        target_user = user_repo.get_by_id(target_user_id)

        if not target_user:
            raise AppException(
                message=f"User #{target_user_id} not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="USER_NOT_FOUND",
            )

        if target_user.id == current_admin_id and not is_active:
            raise AppException(
                message="Administrators cannot deactivate their own account.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="ADMIN_SELF_DEACTIVATION_FORBIDDEN",
            )

        old_status = target_user.is_active
        target_user.is_active = is_active
        updated = user_repo.update(target_user)
        logger.info(
            f"User #{target_user.id} ({target_user.email}) active status set to {is_active} by Admin #{current_admin_id}"
        )

        if old_status != is_active:
            action = ActivityAction.USER_ACTIVATED if is_active else ActivityAction.USER_DEACTIVATED
            ActivityService.log_activity(
                db=db,
                action=action,
                entity_type="user",
                entity_id=target_user.id,
                actor_id=current_admin_id,
                target_user_id=target_user.id,
                details=f"Account {'activated' if is_active else 'deactivated'} by administrator",
            )
            NotificationService.create_notification(
                db=db,
                user_id=target_user.id,
                notification_type=NotificationType.SYSTEM_ALERT,
                title="Account Status Updated",
                message=f"Your GreenLoop account has been {'activated' if is_active else 'deactivated'} by an administrator.",
                entity_type="user",
                entity_id=target_user.id,
                actor_id=current_admin_id,
            )

        return updated

    @staticmethod
    def list_all_reports(
        db: Session,
        status_filter: Optional[ReportStatus] = None,
        category: Optional[WasteCategory] = None,
        priority: Optional[ReportPriority] = None,
        collector_id: Optional[int] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AdminReportResponse]:
        """Fetch all reports with populated user and collector details."""
        report_repo = ReportRepository(db)
        reports = report_repo.get_all_reports(
            status=status_filter,
            category=category,
            priority=priority,
            collector_id=collector_id,
            search=search,
            skip=skip,
            limit=limit,
        )

        response_list = []
        for r in reports:
            creator_name = r.user.name if r.user else None
            creator_email = r.user.email if r.user else None
            coll_name = r.collector.name if r.collector else None
            coll_email = r.collector.email if r.collector else None

            response_list.append(
                AdminReportResponse(
                    id=r.id,
                    user_id=r.user_id,
                    user_name=creator_name,
                    user_email=creator_email,
                    collector_id=r.collector_id,
                    collector_name=coll_name,
                    collector_email=coll_email,
                    category=r.category,
                    description=r.description,
                    location=r.location,
                    image_path=r.image_path,
                    status=r.status,
                    priority=r.priority,
                    created_at=r.created_at,
                    updated_at=r.updated_at,
                )
            )
        return response_list

    @staticmethod
    def assign_report_to_collector(
        db: Session,
        report_id: int,
        collector_id: int,
        admin_user_id: int,
    ) -> WasteReport:
        """Manually assign or reassign a waste report to a verified collector."""
        report_repo = ReportRepository(db)
        user_repo = UserRepository(db)

        report = report_repo.get_by_id(report_id)
        if not report:
            raise AppException(
                message=f"Waste report #{report_id} not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="REPORT_NOT_FOUND",
            )

        collector = user_repo.get_by_id(collector_id)
        if not collector:
            raise AppException(
                message=f"Collector user #{collector_id} not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="COLLECTOR_NOT_FOUND",
            )

        if collector.role != UserRole.COLLECTOR:
            raise AppException(
                message=f"User #{collector_id} ({collector.email}) is not a Waste Collector.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="INVALID_COLLECTOR_ROLE",
            )

        if not collector.is_active:
            raise AppException(
                message=f"Collector #{collector_id} ({collector.email}) is currently deactivated.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="COLLECTOR_DEACTIVATED",
            )

        if report.status in [ReportStatus.RESOLVED, ReportStatus.REJECTED]:
            raise AppException(
                message=f"Cannot assign a closed report (status: {report.status.value}).",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="REPORT_ALREADY_CLOSED",
            )

        report.collector_id = collector.id
        if report.status == ReportStatus.SUBMITTED:
            report.status = ReportStatus.UNDER_REVIEW

        updated = report_repo.update(report)
        logger.info(
            f"Report #{report.id} assigned to Collector #{collector.id} by Admin #{admin_user_id}"
        )

        # Emit activity and notifications
        ActivityService.log_activity(
            db=db,
            action=ActivityAction.REPORT_CLAIMED,
            entity_type="report",
            entity_id=report.id,
            actor_id=admin_user_id,
            target_user_id=report.user_id,
            details=f"Assigned to Collector {collector.name} by administrator",
        )
        NotificationService.create_notification(
            db=db,
            user_id=report.user_id,
            notification_type=NotificationType.REPORT_CLAIMED,
            title="Report Collector Assigned",
            message=f"Administrator assigned Collector {collector.name} to your waste report #{report.id}.",
            entity_type="report",
            entity_id=report.id,
            actor_id=admin_user_id,
        )
        NotificationService.create_notification(
            db=db,
            user_id=collector.id,
            notification_type=NotificationType.REPORT_CLAIMED,
            title="New Report Assigned",
            message=f"You have been assigned to waste report #{report.id} ({report.category.value}).",
            entity_type="report",
            entity_id=report.id,
            actor_id=admin_user_id,
        )

        return updated

    @staticmethod
    def override_report_status(
        db: Session,
        report_id: int,
        new_status: ReportStatus,
        admin_user_id: int,
    ) -> WasteReport:
        """Administrative override of waste report status."""
        report_repo = ReportRepository(db)
        report = report_repo.get_by_id(report_id)

        if not report:
            raise AppException(
                message=f"Waste report #{report_id} not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="REPORT_NOT_FOUND",
            )

        old_status = report.status
        report.status = new_status
        updated = report_repo.update(report)
        logger.info(
            f"Report #{report.id} status overridden to {new_status.value} by Admin #{admin_user_id}"
        )

        if old_status != new_status:
            ActivityService.log_activity(
                db=db,
                action=ActivityAction.REPORT_STATUS_UPDATED,
                entity_type="report",
                entity_id=report.id,
                actor_id=admin_user_id,
                target_user_id=report.user_id,
                details=f"Status administratively overridden from {old_status.value} to {new_status.value}",
            )
            NotificationService.create_notification(
                db=db,
                user_id=report.user_id,
                notification_type=NotificationType.REPORT_STATUS_UPDATED,
                title=f"Report Status: {new_status.value.replace('_', ' ').title()}",
                message=f"Your waste report #{report.id} status was administratively updated to {new_status.value.replace('_', ' ').title()}.",
                entity_type="report",
                entity_id=report.id,
                actor_id=admin_user_id,
            )

        return updated
