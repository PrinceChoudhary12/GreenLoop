"""Repository for RecyclingCenter data access."""

from typing import List, Optional
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from backend.app.models.recycling_center import RecyclingCenter
from backend.app.repositories.base import BaseRepository


class RecyclingCenterRepository(BaseRepository[RecyclingCenter]):
    """CRUD and filter queries for RecyclingCenter entities."""

    def __init__(self, db: Session):
        super().__init__(RecyclingCenter, db)

    def list_centers(
        self,
        search: Optional[str] = None,
        category: Optional[str] = None,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[RecyclingCenter]:
        """Fetch centers with optional filters."""
        stmt = select(RecyclingCenter).order_by(RecyclingCenter.name)

        if is_active is not None:
            stmt = stmt.where(RecyclingCenter.is_active == is_active)

        if search:
            term = f"%{search.strip()}%"
            stmt = stmt.where(
                or_(
                    RecyclingCenter.name.ilike(term),
                    RecyclingCenter.address.ilike(term),
                    RecyclingCenter.description.ilike(term),
                )
            )

        if category:
            cat_upper = category.strip().upper()
            stmt = stmt.where(RecyclingCenter.accepted_categories.ilike(f"%{cat_upper}%"))

        return list(self.db.scalars(stmt.offset(skip).limit(limit)).all())

    def count_centers(self, is_active: Optional[bool] = None) -> int:
        """Count total centers matching optional active filter."""
        from sqlalchemy import func
        stmt = select(func.count(RecyclingCenter.id))
        if is_active is not None:
            stmt = stmt.where(RecyclingCenter.is_active == is_active)
        return self.db.scalar(stmt) or 0

    def search_centers(self, query: str, limit: int = 10) -> List[RecyclingCenter]:
        """Search active centers by name, address, or description for global search."""
        clean = query.strip()
        if not clean:
            return []
        pattern = f"%{clean}%"
        stmt = (
            select(RecyclingCenter)
            .where(
                RecyclingCenter.is_active.is_(True),
                or_(
                    RecyclingCenter.name.ilike(pattern),
                    RecyclingCenter.address.ilike(pattern),
                    RecyclingCenter.description.ilike(pattern),
                ),
            )
            .order_by(RecyclingCenter.name)
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())
