"""Service handling waste pickup business logic, lifecycle transitions, and safety validations."""

import datetime
from typing import List, Optional
from fastapi import status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.core.exceptions import AppException
from backend.app.core.logging import get_logger
from backend.app.models.enums import ActivityAction, NotificationType, PickupStatus, ReportStatus, UserRole
from backend.app.models.pickup import Pickup
from backend.app.models.user import User
from backend.app.repositories.pickup_repository import PickupRepository
from backend.app.repositories.report_repository import ReportRepository
from backend.app.repositories.user_repository import UserRepository
from backend.app.schemas.pickup import PickupCreatePayload, PickupSchedulePayload
from backend.app.services.activity_service import ActivityService
from backend.app.services.notification_service import NotificationService

logger = get_logger(__name__)


class PickupService:
    """Business service orchestrating pickup workflows."""

    @staticmethod
    def request_pickup(
        db: Session,
        citizen: User,
        payload: PickupCreatePayload,
    ) -> Pickup:
        """Citizen requests a scheduled waste pickup for an eligible report."""
        report_repo = ReportRepository(db)
        pickup_repo = PickupRepository(db)

        report = report_repo.get_by_id(payload.report_id)
        if not report:
            raise AppException(
                message="Waste report not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="REPORT_NOT_FOUND",
            )

        if report.user_id != citizen.id:
            raise AppException(
                message="You do not have permission to request pickup for this report.",
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="FORBIDDEN_OWNERSHIP",
            )

        if report.status in [ReportStatus.RESOLVED, ReportStatus.REJECTED]:
            raise AppException(
                message="Cannot request pickup for a resolved or rejected waste report.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="REPORT_INELIGIBLE",
            )

        # Service-layer pre-check for active pickups
        existing_active = pickup_repo.get_active_pickup_for_report(payload.report_id)
        if existing_active:
            raise AppException(
                message="An active pickup request already exists for this waste report.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="DUPLICATE_ACTIVE_PICKUP",
            )

        scheduled_dt = None
        if payload.preferred_date:
            scheduled_dt = datetime.datetime.combine(
                payload.preferred_date,
                datetime.time(9, 0),
                tzinfo=datetime.timezone.utc,
            )

        pickup = Pickup(
            report_id=payload.report_id,
            user_id=citizen.id,
            status=PickupStatus.REQUESTED,
            scheduled_date=scheduled_dt,
            time_slot=payload.preferred_time_slot,
            contact_phone=payload.contact_phone,
            notes=payload.notes,
        )

        try:
            db.add(pickup)
            db.commit()
            db.refresh(pickup)
        except IntegrityError:
            db.rollback()
            raise AppException(
                message="An active pickup request already exists for this waste report.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="DUPLICATE_ACTIVE_PICKUP",
            )

        logger.info(f"Citizen #{citizen.id} requested pickup #{pickup.id} for report #{report.id}.")

        # Emit activity and notification
        ActivityService.log_activity(
            db=db,
            action=ActivityAction.PICKUP_REQUESTED,
            entity_type="pickup",
            entity_id=pickup.id,
            actor_id=citizen.id,
            target_user_id=citizen.id,
            details=f"Pickup requested for Report #{report.id}",
        )
        NotificationService.create_notification(
            db=db,
            user_id=citizen.id,
            notification_type=NotificationType.PICKUP_REQUESTED,
            title="Pickup Request Submitted",
            message=f"Your pickup request #{pickup.id} for report #{report.id} has been received.",
            entity_type="pickup",
            entity_id=pickup.id,
            actor_id=citizen.id,
        )

        return pickup_repo.get_by_id_with_relations(pickup.id) or pickup

    @staticmethod
    def get_citizen_pickups(
        db: Session,
        citizen_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Pickup]:
        """Fetch pickup requests submitted by a citizen."""
        pickup_repo = PickupRepository(db)
        return pickup_repo.get_by_user_id(user_id=citizen_id, skip=skip, limit=limit)

    @staticmethod
    def get_pickup_details(
        db: Session,
        pickup_id: int,
        current_user: User,
    ) -> Pickup:
        """Fetch details of a single pickup with role access enforcement."""
        pickup_repo = PickupRepository(db)
        pickup = pickup_repo.get_by_id_with_relations(pickup_id)
        if not pickup:
            raise AppException(
                message="Pickup request not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="PICKUP_NOT_FOUND",
            )

        # Role access isolation
        if current_user.role == UserRole.CITIZEN and pickup.user_id != current_user.id:
            raise AppException(
                message="You do not have permission to view this pickup.",
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="FORBIDDEN_ACCESS",
            )
        if current_user.role == UserRole.COLLECTOR and pickup.collector_id != current_user.id:
            raise AppException(
                message="This pickup is not assigned to you.",
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="FORBIDDEN_ACCESS",
            )

        return pickup

    @staticmethod
    def cancel_pickup(
        db: Session,
        pickup_id: int,
        current_user: User,
        cancellation_reason: str,
    ) -> Pickup:
        """Cancel a pickup adhering to strict role and status transition rules."""
        pickup_repo = PickupRepository(db)
        pickup = pickup_repo.get_by_id_with_relations(pickup_id)
        if not pickup:
            raise AppException(
                message="Pickup request not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="PICKUP_NOT_FOUND",
            )

        if pickup.status in [PickupStatus.IN_PROGRESS, PickupStatus.COMPLETED]:
            raise AppException(
                message="Pickups in progress or completed cannot be cancelled.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="CANNOT_CANCEL_IN_PROGRESS_OR_COMPLETED",
            )

        if pickup.status == PickupStatus.CANCELLED:
            raise AppException(
                message="Pickup is already cancelled.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="PICKUP_ALREADY_CANCELLED",
            )

        if current_user.role == UserRole.COLLECTOR:
            raise AppException(
                message="Collectors cannot cancel pickups.",
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="COLLECTOR_CANNOT_CANCEL",
            )

        if current_user.role == UserRole.CITIZEN:
            if pickup.user_id != current_user.id:
                raise AppException(
                    message="You do not have permission to cancel this pickup.",
                    status_code=status.HTTP_403_FORBIDDEN,
                    error_code="FORBIDDEN_OWNERSHIP",
                )
            if pickup.status == PickupStatus.ACCEPTED:
                raise AppException(
                    message="Cannot cancel a pickup that has already been accepted by a collector.",
                    status_code=status.HTTP_400_BAD_REQUEST,
                    error_code="CITIZEN_CANNOT_CANCEL_ACCEPTED_PICKUP",
                )

        assigned_collector_id = pickup.collector_id
        pickup.status = PickupStatus.CANCELLED
        pickup.cancellation_reason = cancellation_reason.strip()
        pickup.cancelled_by_id = current_user.id
        pickup.cancelled_at = datetime.datetime.now(datetime.timezone.utc)

        db.commit()
        db.refresh(pickup)
        logger.info(f"Pickup #{pickup.id} cancelled by User #{current_user.id}. Reason: {cancellation_reason}")

        # Emit activity
        ActivityService.log_activity(
            db=db,
            action=ActivityAction.PICKUP_CANCELLED,
            entity_type="pickup",
            entity_id=pickup.id,
            actor_id=current_user.id,
            target_user_id=pickup.user_id,
            details=f"Cancelled by {current_user.name} ({current_user.role.value}): {cancellation_reason.strip()}",
        )

        # Notify citizen if cancelled by admin
        if current_user.role == UserRole.ADMIN:
            NotificationService.create_notification(
                db=db,
                user_id=pickup.user_id,
                notification_type=NotificationType.PICKUP_CANCELLED,
                title="Pickup Cancelled",
                message=f"Your pickup #{pickup.id} was cancelled by an administrator. Reason: {cancellation_reason.strip()}",
                entity_type="pickup",
                entity_id=pickup.id,
                actor_id=current_user.id,
            )

        # Notify assigned collector if any
        if assigned_collector_id and assigned_collector_id != current_user.id:
            NotificationService.create_notification(
                db=db,
                user_id=assigned_collector_id,
                notification_type=NotificationType.PICKUP_CANCELLED,
                title="Assigned Pickup Cancelled",
                message=f"Pickup #{pickup.id} has been cancelled. Reason: {cancellation_reason.strip()}",
                entity_type="pickup",
                entity_id=pickup.id,
                actor_id=current_user.id,
            )

        return pickup_repo.get_by_id_with_relations(pickup.id) or pickup

    @staticmethod
    def collector_get_assigned_pickups(
        db: Session,
        collector_id: int,
        status_filter: Optional[PickupStatus] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Pickup]:
        """Fetch pickups assigned to the authenticated collector."""
        pickup_repo = PickupRepository(db)
        return pickup_repo.get_by_collector_id(
            collector_id=collector_id,
            status=status_filter,
            skip=skip,
            limit=limit,
        )

    @staticmethod
    def collector_accept_pickup(
        db: Session,
        pickup_id: int,
        collector: User,
    ) -> Pickup:
        """Collector confirms acceptance of an assigned pickup."""
        pickup_repo = PickupRepository(db)
        pickup = pickup_repo.get_by_id_with_relations(pickup_id)
        if not pickup:
            raise AppException(
                message="Pickup request not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="PICKUP_NOT_FOUND",
            )

        if pickup.collector_id != collector.id:
            raise AppException(
                message="This pickup is not assigned to you.",
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="FORBIDDEN_ASSIGNMENT",
            )

        if pickup.status != PickupStatus.ASSIGNED:
            raise AppException(
                message=f"Only assigned pickups can be accepted (current: {pickup.status.value}).",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="INVALID_STATUS_TRANSITION",
            )

        pickup.status = PickupStatus.ACCEPTED
        db.commit()
        db.refresh(pickup)
        logger.info(f"Collector #{collector.id} accepted pickup #{pickup.id}.")

        # Emit activity and notification
        ActivityService.log_activity(
            db=db,
            action=ActivityAction.PICKUP_ACCEPTED,
            entity_type="pickup",
            entity_id=pickup.id,
            actor_id=collector.id,
            target_user_id=pickup.user_id,
            details=f"Pickup accepted by Collector {collector.name}",
        )
        NotificationService.create_notification(
            db=db,
            user_id=pickup.user_id,
            notification_type=NotificationType.PICKUP_ACCEPTED,
            title="Pickup Accepted",
            message=f"Collector {collector.name} has accepted your scheduled pickup #{pickup.id}.",
            entity_type="pickup",
            entity_id=pickup.id,
            actor_id=collector.id,
        )

        return pickup_repo.get_by_id_with_relations(pickup.id) or pickup

    @staticmethod
    def collector_start_pickup(
        db: Session,
        pickup_id: int,
        collector: User,
    ) -> Pickup:
        """Collector indicates pickup route/collection is in progress."""
        pickup_repo = PickupRepository(db)
        pickup = pickup_repo.get_by_id_with_relations(pickup_id)
        if not pickup:
            raise AppException(
                message="Pickup request not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="PICKUP_NOT_FOUND",
            )

        if pickup.collector_id != collector.id:
            raise AppException(
                message="This pickup is not assigned to you.",
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="FORBIDDEN_ASSIGNMENT",
            )

        if pickup.status != PickupStatus.ACCEPTED:
            raise AppException(
                message=f"Pickup must be accepted before starting (current: {pickup.status.value}).",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="INVALID_STATUS_TRANSITION",
            )

        pickup.status = PickupStatus.IN_PROGRESS
        db.commit()
        db.refresh(pickup)
        logger.info(f"Collector #{collector.id} started pickup #{pickup.id}.")

        # Emit activity and notification
        ActivityService.log_activity(
            db=db,
            action=ActivityAction.PICKUP_IN_PROGRESS,
            entity_type="pickup",
            entity_id=pickup.id,
            actor_id=collector.id,
            target_user_id=pickup.user_id,
            details=f"Collector {collector.name} is on the way for pickup collection",
        )
        NotificationService.create_notification(
            db=db,
            user_id=pickup.user_id,
            notification_type=NotificationType.PICKUP_IN_PROGRESS,
            title="Pickup In Progress",
            message=f"Collector {collector.name} is on the way to collect your waste pickup #{pickup.id}.",
            entity_type="pickup",
            entity_id=pickup.id,
            actor_id=collector.id,
        )

        return pickup_repo.get_by_id_with_relations(pickup.id) or pickup

    @staticmethod
    def collector_complete_pickup(
        db: Session,
        pickup_id: int,
        collector: User,
    ) -> Pickup:
        """Collector marks pickup completed, atomically resolving the associated waste report."""
        pickup_repo = PickupRepository(db)
        report_repo = ReportRepository(db)

        pickup = pickup_repo.get_by_id_with_relations(pickup_id)
        if not pickup:
            raise AppException(
                message="Pickup request not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="PICKUP_NOT_FOUND",
            )

        if pickup.collector_id != collector.id:
            raise AppException(
                message="This pickup is not assigned to you.",
                status_code=status.HTTP_403_FORBIDDEN,
                error_code="FORBIDDEN_ASSIGNMENT",
            )

        if pickup.status != PickupStatus.IN_PROGRESS:
            raise AppException(
                message=f"Pickup must be in progress before completing (current: {pickup.status.value}).",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="INVALID_STATUS_TRANSITION",
            )

        report = report_repo.get_by_id(pickup.report_id)
        if not report:
            raise AppException(
                message="Associated waste report not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="REPORT_NOT_FOUND",
            )

        if report.status in [ReportStatus.RESOLVED, ReportStatus.REJECTED]:
            raise AppException(
                message=f"Associated waste report is already {report.status.value.lower()}.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="REPORT_ALREADY_RESOLVED_OR_REJECTED",
            )

        # Atomic transaction execution
        try:
            pickup.status = PickupStatus.COMPLETED
            pickup.completed_at = datetime.datetime.now(datetime.timezone.utc)
            report.status = ReportStatus.RESOLVED
            report.collector_id = collector.id
            db.commit()
            db.refresh(pickup)
        except Exception as exc:
            db.rollback()
            logger.error(f"Failed to complete pickup #{pickup.id}: {exc}")
            raise AppException(
                message="Failed to complete pickup and update waste report.",
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                error_code="COMPLETION_TRANSACTION_FAILED",
            )

        logger.info(f"Collector #{collector.id} completed pickup #{pickup.id}; Report #{report.id} resolved.")

        # Emit activity and notification
        ActivityService.log_activity(
            db=db,
            action=ActivityAction.PICKUP_COMPLETED,
            entity_type="pickup",
            entity_id=pickup.id,
            actor_id=collector.id,
            target_user_id=pickup.user_id,
            details=f"Pickup completed; Report #{report.id} resolved by Collector {collector.name}",
        )
        NotificationService.create_notification(
            db=db,
            user_id=pickup.user_id,
            notification_type=NotificationType.PICKUP_COMPLETED,
            title="Pickup Completed",
            message=f"Your waste pickup #{pickup.id} has been completed and the waste collected!",
            entity_type="pickup",
            entity_id=pickup.id,
            actor_id=collector.id,
        )

        return pickup_repo.get_by_id_with_relations(pickup.id) or pickup

    @staticmethod
    def admin_schedule_pickup(
        db: Session,
        pickup_id: int,
        payload: PickupSchedulePayload,
        admin_user: User,
    ) -> Pickup:
        """Admin sets scheduled date/time slot and optionally assigns an active collector."""
        pickup_repo = PickupRepository(db)
        user_repo = UserRepository(db)

        pickup = pickup_repo.get_by_id_with_relations(pickup_id)
        if not pickup:
            raise AppException(
                message="Pickup request not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="PICKUP_NOT_FOUND",
            )

        if pickup.status in [PickupStatus.COMPLETED, PickupStatus.CANCELLED]:
            raise AppException(
                message=f"Cannot schedule a {pickup.status.value.lower()} pickup.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="CANNOT_SCHEDULE_TERMINATED_PICKUP",
            )

        scheduled_dt = datetime.datetime.combine(
            payload.scheduled_date,
            datetime.time(9, 0),
            tzinfo=datetime.timezone.utc,
        )
        pickup.scheduled_date = scheduled_dt
        pickup.time_slot = payload.time_slot
        if payload.notes:
            pickup.notes = payload.notes

        collector = None
        if payload.collector_id is not None:
            collector = user_repo.get_by_id(payload.collector_id)
            if not collector or collector.role != UserRole.COLLECTOR or not collector.is_active:
                raise AppException(
                    message="Designated collector not found or account is inactive.",
                    status_code=status.HTTP_400_BAD_REQUEST,
                    error_code="INVALID_OR_INACTIVE_COLLECTOR",
                )
            pickup.collector_id = collector.id
            pickup.status = PickupStatus.ASSIGNED
        else:
            pickup.status = PickupStatus.SCHEDULED

        db.commit()
        db.refresh(pickup)
        logger.info(f"Admin #{admin_user.id} scheduled pickup #{pickup.id} (Status: {pickup.status.value}).")

        # Emit activity and notification
        date_str = payload.scheduled_date.strftime('%Y-%m-%d')
        if collector:
            ActivityService.log_activity(
                db=db,
                action=ActivityAction.PICKUP_SCHEDULED,
                entity_type="pickup",
                entity_id=pickup.id,
                actor_id=admin_user.id,
                target_user_id=pickup.user_id,
                details=f"Scheduled for {date_str} ({payload.time_slot}) and assigned to Collector {collector.name}",
            )
            NotificationService.create_notification(
                db=db,
                user_id=pickup.user_id,
                notification_type=NotificationType.PICKUP_SCHEDULED,
                title="Pickup Scheduled",
                message=f"Your pickup #{pickup.id} has been scheduled for {date_str} ({payload.time_slot}) and assigned to {collector.name}.",
                entity_type="pickup",
                entity_id=pickup.id,
                actor_id=admin_user.id,
            )
            NotificationService.create_notification(
                db=db,
                user_id=collector.id,
                notification_type=NotificationType.PICKUP_ASSIGNED,
                title="New Pickup Assigned",
                message=f"You have been assigned to pickup #{pickup.id} scheduled for {date_str} ({payload.time_slot}).",
                entity_type="pickup",
                entity_id=pickup.id,
                actor_id=admin_user.id,
            )
        else:
            ActivityService.log_activity(
                db=db,
                action=ActivityAction.PICKUP_SCHEDULED,
                entity_type="pickup",
                entity_id=pickup.id,
                actor_id=admin_user.id,
                target_user_id=pickup.user_id,
                details=f"Scheduled for {date_str} ({payload.time_slot})",
            )
            NotificationService.create_notification(
                db=db,
                user_id=pickup.user_id,
                notification_type=NotificationType.PICKUP_SCHEDULED,
                title="Pickup Scheduled",
                message=f"Your pickup #{pickup.id} has been scheduled for {date_str} ({payload.time_slot}).",
                entity_type="pickup",
                entity_id=pickup.id,
                actor_id=admin_user.id,
            )

        return pickup_repo.get_by_id_with_relations(pickup.id) or pickup

    @staticmethod
    def admin_assign_collector(
        db: Session,
        pickup_id: int,
        collector_id: int,
        admin_user: User,
    ) -> Pickup:
        """Admin assigns or reassigns an active collector to a pickup."""
        pickup_repo = PickupRepository(db)
        user_repo = UserRepository(db)

        pickup = pickup_repo.get_by_id_with_relations(pickup_id)
        if not pickup:
            raise AppException(
                message="Pickup request not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="PICKUP_NOT_FOUND",
            )

        if pickup.status in [PickupStatus.IN_PROGRESS, PickupStatus.COMPLETED, PickupStatus.CANCELLED]:
            raise AppException(
                message=f"Cannot reassign a {pickup.status.value.lower()} pickup.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="CANNOT_REASSIGN_IN_FLIGHT_OR_TERMINATED_PICKUP",
            )

        collector = user_repo.get_by_id(collector_id)
        if not collector or collector.role != UserRole.COLLECTOR or not collector.is_active:
            raise AppException(
                message="Designated collector not found or account is inactive.",
                status_code=status.HTTP_400_BAD_REQUEST,
                error_code="INVALID_OR_INACTIVE_COLLECTOR",
            )

        pickup.collector_id = collector.id
        pickup.status = PickupStatus.ASSIGNED

        db.commit()
        db.refresh(pickup)
        logger.info(f"Admin #{admin_user.id} assigned collector #{collector.id} to pickup #{pickup.id}.")

        # Emit activity and notifications
        ActivityService.log_activity(
            db=db,
            action=ActivityAction.PICKUP_ASSIGNED,
            entity_type="pickup",
            entity_id=pickup.id,
            actor_id=admin_user.id,
            target_user_id=pickup.user_id,
            details=f"Assigned to Collector {collector.name}",
        )
        NotificationService.create_notification(
            db=db,
            user_id=pickup.user_id,
            notification_type=NotificationType.PICKUP_ASSIGNED,
            title="Collector Assigned",
            message=f"Collector {collector.name} has been assigned to your pickup #{pickup.id}.",
            entity_type="pickup",
            entity_id=pickup.id,
            actor_id=admin_user.id,
        )
        NotificationService.create_notification(
            db=db,
            user_id=collector.id,
            notification_type=NotificationType.PICKUP_ASSIGNED,
            title="New Pickup Assigned",
            message=f"You have been assigned to pickup #{pickup.id}.",
            entity_type="pickup",
            entity_id=pickup.id,
            actor_id=admin_user.id,
        )

        return pickup_repo.get_by_id_with_relations(pickup.id) or pickup

    @staticmethod
    def admin_list_pickups(
        db: Session,
        status_filter: Optional[PickupStatus] = None,
        collector_id: Optional[int] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Pickup]:
        """Admin lists platform-wide pickups with filtering and search."""
        pickup_repo = PickupRepository(db)
        return pickup_repo.get_all_pickups(
            status=status_filter,
            collector_id=collector_id,
            search=search,
            skip=skip,
            limit=limit,
        )
