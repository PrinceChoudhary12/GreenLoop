"""Service layer for RecyclingCenter business logic."""

from typing import List, Optional
from fastapi import status
from sqlalchemy.orm import Session

from backend.app.core.exceptions import AppException
from backend.app.models.recycling_center import RecyclingCenter
from backend.app.repositories.recycling_center_repository import RecyclingCenterRepository
from backend.app.schemas.recycling_center import RecyclingCenterCreate, RecyclingCenterUpdate


class RecyclingCenterService:
    """Orchestrates CRUD and filter operations for recycling centers."""

    def __init__(self, db: Session):
        self.db = db
        self.repo = RecyclingCenterRepository(db)

    def list_centers(
        self,
        search: Optional[str] = None,
        category: Optional[str] = None,
        is_active: Optional[bool] = True,
        skip: int = 0,
        limit: int = 50,
    ) -> List[RecyclingCenter]:
        """Return filtered list of recycling centers."""
        return self.repo.list_centers(
            search=search,
            category=category,
            is_active=is_active,
            skip=skip,
            limit=limit,
        )

    def get_center(self, center_id: int) -> RecyclingCenter:
        """Return a single center by ID or raise 404."""
        center = self.repo.get_by_id(center_id)
        if not center:
            raise AppException(
                message=f"Recycling center {center_id} not found.",
                status_code=status.HTTP_404_NOT_FOUND,
                error_code="CENTER_NOT_FOUND",
            )
        return center

    def create_center(self, payload: RecyclingCenterCreate) -> RecyclingCenter:
        """Create and persist a new recycling center."""
        center = RecyclingCenter(
            name=payload.name,
            description=payload.description,
            address=payload.address,
            latitude=payload.latitude,
            longitude=payload.longitude,
            phone=payload.phone,
            email=payload.email,
            website=payload.website,
            accepted_categories=payload.accepted_categories,
            opening_hours=payload.opening_hours,
            is_active=payload.is_active,
        )
        return self.repo.create(center)

    def update_center(self, center_id: int, payload: RecyclingCenterUpdate) -> RecyclingCenter:
        """Apply partial updates to an existing recycling center."""
        center = self.get_center(center_id)
        update_data = payload.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(center, field, value)
        return self.repo.update(center)

    def delete_center(self, center_id: int) -> RecyclingCenter:
        """Soft-delete a center by setting is_active=False."""
        center = self.get_center(center_id)
        center.is_active = False
        return self.repo.update(center)
