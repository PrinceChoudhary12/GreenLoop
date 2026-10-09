"""Recycling Centers API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.deps import get_current_active_admin, get_current_user
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.recycling_center import (
    RecyclingCenterCreate,
    RecyclingCenterResponse,
    RecyclingCenterUpdate,
)
from backend.app.services.recycling_center_service import RecyclingCenterService

router = APIRouter(prefix="/recycling-centers", tags=["Recycling Centers"])


@router.get(
    "",
    response_model=List[RecyclingCenterResponse],
    status_code=status.HTTP_200_OK,
    summary="List Recycling Centers",
    description="Retrieve recycling centers with optional search, category, and active filters.",
)
def list_centers(
    search: Optional[str] = Query(default=None, max_length=100, description="Search by name, address, or description"),
    category: Optional[str] = Query(default=None, max_length=50, description="Filter by accepted waste category, e.g. PLASTIC"),
    is_active: Optional[bool] = Query(default=True, description="Filter by active status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[RecyclingCenterResponse]:
    """List recycling centers accessible to all authenticated users."""
    svc = RecyclingCenterService(db)
    centers = svc.list_centers(search=search, category=category, is_active=is_active, skip=skip, limit=limit)
    return [RecyclingCenterResponse.model_validate(c) for c in centers]


@router.get(
    "/{center_id}",
    response_model=RecyclingCenterResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Recycling Center Detail",
)
def get_center(
    center_id: int,
    _current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecyclingCenterResponse:
    """Retrieve a single recycling center by ID."""
    svc = RecyclingCenterService(db)
    center = svc.get_center(center_id)
    return RecyclingCenterResponse.model_validate(center)


@router.post(
    "",
    response_model=RecyclingCenterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Recycling Center",
    description="Admin only. Create a new recycling center record.",
)
def create_center(
    payload: RecyclingCenterCreate,
    _current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> RecyclingCenterResponse:
    """Create a new recycling center."""
    svc = RecyclingCenterService(db)
    center = svc.create_center(payload)
    return RecyclingCenterResponse.model_validate(center)


@router.put(
    "/{center_id}",
    response_model=RecyclingCenterResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Recycling Center",
    description="Admin only. Update fields on an existing recycling center.",
)
def update_center(
    center_id: int,
    payload: RecyclingCenterUpdate,
    _current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> RecyclingCenterResponse:
    """Update a recycling center."""
    svc = RecyclingCenterService(db)
    center = svc.update_center(center_id, payload)
    return RecyclingCenterResponse.model_validate(center)


@router.delete(
    "/{center_id}",
    response_model=RecyclingCenterResponse,
    status_code=status.HTTP_200_OK,
    summary="Deactivate Recycling Center",
    description="Admin only. Soft-delete a center by setting is_active=False.",
)
def delete_center(
    center_id: int,
    _current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> RecyclingCenterResponse:
    """Soft-delete a recycling center."""
    svc = RecyclingCenterService(db)
    center = svc.delete_center(center_id)
    return RecyclingCenterResponse.model_validate(center)
