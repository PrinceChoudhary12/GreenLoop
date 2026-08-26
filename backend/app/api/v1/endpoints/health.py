"""Health check API endpoints."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.schemas.health import HealthResponse
from backend.app.services.health import HealthService

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="System Health & Readiness",
    description="Check overall application status and database connectivity readiness.",
)
def get_health(db: Session = Depends(get_db)) -> HealthResponse:
    """Assess application health and component status."""
    return HealthService.check_health(db)
