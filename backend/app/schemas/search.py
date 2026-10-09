"""Pydantic schemas for role-aware global search."""

from typing import List, Optional
from pydantic import BaseModel, Field


class SearchResultItem(BaseModel):
    """Single global search result item."""

    id: str  # e.g. "report_10", "pickup_5", "nav_report_waste"
    entity_type: str  # "report" | "pickup" | "navigation"
    entity_id: Optional[int] = None
    title: str
    subtitle: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    target_url: str
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class GlobalSearchResponse(BaseModel):
    """Global search response payload."""

    query: str
    total_results: int
    results: List[SearchResultItem]
