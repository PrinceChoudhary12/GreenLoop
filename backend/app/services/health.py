"""Health check service for verifying application and dependency readiness."""

from sqlalchemy import text
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.logging import get_logger
from backend.app.schemas.health import HealthResponse, ServiceComponentHealth

logger = get_logger(__name__)


class HealthService:
    """Service responsible for assessing system and dependency health."""

    @staticmethod
    def check_health(db: Session) -> HealthResponse:
        """Perform system health assessment including database probe."""
        components = {}
        overall_status = "healthy"

        # Check Database Connectivity
        try:
            db.execute(text("SELECT 1"))
            components["database"] = ServiceComponentHealth(
                status="healthy",
                details="Database connection active and responsive",
            )
        except Exception as e:
            logger.error(f"Health check database probe failed: {str(e)}")
            components["database"] = ServiceComponentHealth(
                status="unhealthy",
                details="Unable to execute query on database connection",
            )
            overall_status = "degraded"

        return HealthResponse(
            status=overall_status,
            app_name=settings.APP_NAME,
            version=settings.APP_VERSION,
            environment=settings.APP_ENV,
            components=components,
        )
