"""Search service containing business logic for role-aware global search."""

from typing import List
from sqlalchemy.orm import Session

from backend.app.models.user import User
from backend.app.repositories.search_repository import SearchRepository
from backend.app.schemas.search import GlobalSearchResponse, SearchResultItem

MIN_QUERY_LENGTH = 2
MAX_QUERY_LENGTH = 100
MAX_RESULTS_PER_CATEGORY = 10


class SearchService:
    """Service layer orchestrating global search across authorized entities."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = SearchRepository()

    def perform_search(self, user: User, query: str, limit: int = 20) -> GlobalSearchResponse:
        """Perform role-aware global search with input validation and categorization."""
        clean_query = (query or "").strip()

        # If query is empty or shorter than MIN_QUERY_LENGTH, return empty results
        if len(clean_query) < MIN_QUERY_LENGTH:
            return GlobalSearchResponse(query=clean_query, total_results=0, results=[])

        # Enforce max query length
        if len(clean_query) > MAX_QUERY_LENGTH:
            clean_query = clean_query[:MAX_QUERY_LENGTH]

        results: List[SearchResultItem] = []

        # 1. Search Waste Reports
        reports = self.repo.search_reports(self.db, user, clean_query, limit=MAX_RESULTS_PER_CATEGORY)
        for r in reports:
            cat_val = r.category.value if hasattr(r.category, "value") else str(r.category)
            status_val = r.status.value if hasattr(r.status, "value") else str(r.status)
            results.append(
                SearchResultItem(
                    id=f"report_{r.id}",
                    entity_type="report",
                    entity_id=r.id,
                    title=f"Report #{r.id} ({cat_val})",
                    subtitle=f"{r.location} — {r.description[:60]}...",
                    category=cat_val,
                    status=status_val,
                    target_url=f"/reports?reportId={r.id}",
                    created_at=r.created_at.isoformat() if r.created_at else None,
                )
            )

        # 2. Search Pickup Tasks
        pickups = self.repo.search_pickups(self.db, user, clean_query, limit=MAX_RESULTS_PER_CATEGORY)
        for p in pickups:
            status_val = p.status.value if hasattr(p.status, "value") else str(p.status)
            loc_str = p.report.location if p.report else "Collection Point"
            notes_str = f" ({p.notes[:40]})" if p.notes else ""
            results.append(
                SearchResultItem(
                    id=f"pickup_{p.id}",
                    entity_type="pickup",
                    entity_id=p.id,
                    title=f"Pickup #{p.id} - {status_val}",
                    subtitle=f"{loc_str}{notes_str}",
                    category="PICKUP",
                    status=status_val,
                    target_url=f"/pickups?pickupId={p.id}",
                    created_at=p.created_at.isoformat() if p.created_at else None,
                )
            )

        # Truncate to total requested limit
        final_results = results[:limit]

        return GlobalSearchResponse(
            query=clean_query,
            total_results=len(final_results),
            results=final_results,
        )
