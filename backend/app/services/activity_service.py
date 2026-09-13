"""Service handling immutable activity audit logs and timeline queries."""

from typing import Optional
from sqlalchemy.orm import Session

from backend.app.core.logging import get_logger
from backend.app.models.activity import ActivityLog
from backend.app.models.enums import ActivityAction
from backend.app.repositories.activity_repository import ActivityRepository
from backend.app.schemas.activity import ActivityListResponse, ActivityLogResponse

logger = get_logger(__name__)


def _map_activity_response(log: ActivityLog) -> ActivityLogResponse:
    """Map ActivityLog database model to Pydantic schema with populated names."""
    actor_name = log.actor.name if log.actor else None
    actor_role = log.actor.role.value if log.actor else None
    target_user_name = log.target_user.name if log.target_user else None

    return ActivityLogResponse(
        id=log.id,
        actor_id=log.actor_id,
        actor_name=actor_name,
        actor_role=actor_role,
        action=log.action,
        entity_type=log.entity_type,
        entity_id=log.entity_id,
        target_user_id=log.target_user_id,
        target_user_name=target_user_name,
        details=log.details,
        created_at=log.created_at,
    )


class ActivityService:
    """Business logic for activity logs."""

    @staticmethod
    def log_activity(
        db: Session,
        action: ActivityAction,
        entity_type: str,
        entity_id: int,
        actor_id: Optional[int] = None,
        target_user_id: Optional[int] = None,
        details: Optional[str] = None,
    ) -> ActivityLog:
        """Create and persist an immutable activity log entry."""
        repo = ActivityRepository(db)
        log_entry = ActivityLog(
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            target_user_id=target_user_id,
            details=details,
        )
        created = repo.create(log_entry)
        logger.info(
            f"Activity logged: [{action.value}] on {entity_type} #{entity_id} "
            f"(Actor: #{actor_id}, Target: #{target_user_id})"
        )
        return created

    @staticmethod
    def get_citizen_activity(
        db: Session,
        citizen_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> ActivityListResponse:
        """Fetch activity logs concerning the authenticated citizen."""
        repo = ActivityRepository(db)
        safe_limit = min(max(1, limit), 100)
        items = repo.get_for_user(user_id=citizen_id, skip=skip, limit=safe_limit)
        total = repo.count_for_user(user_id=citizen_id)

        return ActivityListResponse(
            items=[_map_activity_response(item) for item in items],
            total=total,
        )

    @staticmethod
    def get_collector_activity(
        db: Session,
        collector_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> ActivityListResponse:
        """Fetch activity logs concerning the authenticated collector."""
        repo = ActivityRepository(db)
        safe_limit = min(max(1, limit), 100)
        items = repo.get_for_collector(collector_id=collector_id, skip=skip, limit=safe_limit)
        total = repo.count_for_collector(collector_id=collector_id)

        return ActivityListResponse(
            items=[_map_activity_response(item) for item in items],
            total=total,
        )

    @staticmethod
    def get_admin_activity(
        db: Session,
        action: Optional[ActivityAction] = None,
        entity_type: Optional[str] = None,
        actor_id: Optional[int] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> ActivityListResponse:
        """Fetch platform-wide activity logs for administrator audit."""
        repo = ActivityRepository(db)
        safe_limit = min(max(1, limit), 100)
        items = repo.get_admin_logs(
            action=action,
            entity_type=entity_type,
            actor_id=actor_id,
            skip=skip,
            limit=safe_limit,
        )
        total = repo.count_admin_logs(
            action=action,
            entity_type=entity_type,
            actor_id=actor_id,
        )

        return ActivityListResponse(
            items=[_map_activity_response(item) for item in items],
            total=total,
        )
