"""FastAPI endpoint for global platform search."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.search import GlobalSearchResponse
from backend.app.services.search_service import SearchService

router = APIRouter()


@router.get("", response_model=GlobalSearchResponse)
def search_global(
    q: str = Query("", description="Search query string (min 2 characters)"),
    limit: int = Query(20, ge=1, le=50, description="Maximum number of search results to return"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> GlobalSearchResponse:
    """Execute role-aware global search across waste reports and pickup tasks."""
    service = SearchService(db)
    return service.perform_search(current_user, q, limit=limit)
