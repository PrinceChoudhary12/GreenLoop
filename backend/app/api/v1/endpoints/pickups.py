"""Waste pickup API endpoints for citizens, collectors, and platform administrators."""

from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from backend.app.core.deps import (
    get_current_active_admin,
    get_current_active_citizen,
    get_current_active_collector,
    get_current_user,
)
from backend.app.db.session import get_db
from backend.app.models.enums import PickupStatus
from backend.app.models.user import User
from backend.app.schemas.pickup import (
    PickupAssignPayload,
    PickupCancelPayload,
    PickupCreatePayload,
    PickupResponse,
    PickupSchedulePayload,
)
from backend.app.services.pickup_service import PickupService

router = APIRouter()


# ==============================================================================
# CITIZEN ENDPOINTS
# ==============================================================================

@router.post(
    "/pickups",
    response_model=PickupResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Waste Pickups - Citizen"],
    summary="Request a Scheduled Waste Pickup",
    description="Citizen requests a pickup for an eligible waste report they created.",
)
def request_pickup(
    payload: PickupCreatePayload,
    current_user: User = Depends(get_current_active_citizen),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """Citizen creates a new scheduled pickup request."""
    pickup = PickupService.request_pickup(db=db, citizen=current_user, payload=payload)
    return PickupResponse.model_validate(pickup)


@router.get(
    "/pickups",
    response_model=List[PickupResponse],
    status_code=status.HTTP_200_OK,
    tags=["Waste Pickups - Citizen"],
    summary="List Citizen Pickup Requests",
    description="Retrieve all pickup requests submitted by the authenticated citizen.",
)
def list_citizen_pickups(
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit"),
    current_user: User = Depends(get_current_active_citizen),
    db: Session = Depends(get_db),
) -> List[PickupResponse]:
    """List pickups submitted by the current citizen."""
    pickups = PickupService.get_citizen_pickups(
        db=db,
        citizen_id=current_user.id,
        skip=skip,
        limit=limit,
    )
    return [PickupResponse.model_validate(p) for p in pickups]


@router.get(
    "/pickups/{pickup_id}",
    response_model=PickupResponse,
    status_code=status.HTTP_200_OK,
    tags=["Waste Pickups"],
    summary="Get Pickup Details",
    description="Retrieve detailed information about a specific pickup request.",
)
def get_pickup_details(
    pickup_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """Retrieve single pickup record with role-based access validation."""
    pickup = PickupService.get_pickup_details(
        db=db,
        pickup_id=pickup_id,
        current_user=current_user,
    )
    return PickupResponse.model_validate(pickup)


@router.post(
    "/pickups/{pickup_id}/cancel",
    response_model=PickupResponse,
    status_code=status.HTTP_200_OK,
    tags=["Waste Pickups"],
    summary="Cancel Pickup Request",
    description="Cancel an active pickup before execution begins (Citizens can cancel before ACCEPTED; Admins prior to IN_PROGRESS).",
)
def cancel_pickup(
    pickup_id: int,
    payload: PickupCancelPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """Cancel a pickup request with a documented reason."""
    pickup = PickupService.cancel_pickup(
        db=db,
        pickup_id=pickup_id,
        current_user=current_user,
        cancellation_reason=payload.cancellation_reason,
    )
    return PickupResponse.model_validate(pickup)


# ==============================================================================
# COLLECTOR ENDPOINTS
# ==============================================================================

@router.get(
    "/collectors/pickups",
    response_model=List[PickupResponse],
    status_code=status.HTTP_200_OK,
    tags=["Waste Pickups - Collector"],
    summary="List Collector's Assigned Pickups",
    description="Retrieve waste pickups assigned to the authenticated collector.",
)
def list_collector_pickups(
    status_filter: Optional[PickupStatus] = Query(default=None, alias="status", description="Filter by pickup status"),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit"),
    current_user: User = Depends(get_current_active_collector),
    db: Session = Depends(get_db),
) -> List[PickupResponse]:
    """List assigned pickups for collector."""
    pickups = PickupService.collector_get_assigned_pickups(
        db=db,
        collector_id=current_user.id,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )
    return [PickupResponse.model_validate(p) for p in pickups]


@router.post(
    "/collectors/pickups/{pickup_id}/accept",
    response_model=PickupResponse,
    status_code=status.HTTP_200_OK,
    tags=["Waste Pickups - Collector"],
    summary="Accept Assigned Pickup",
    description="Collector confirms acceptance of an assigned pickup task.",
)
def collector_accept_pickup(
    pickup_id: int,
    current_user: User = Depends(get_current_active_collector),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """Collector accepts pickup task."""
    pickup = PickupService.collector_accept_pickup(
        db=db,
        pickup_id=pickup_id,
        collector=current_user,
    )
    return PickupResponse.model_validate(pickup)


@router.post(
    "/collectors/pickups/{pickup_id}/start",
    response_model=PickupResponse,
    status_code=status.HTTP_200_OK,
    tags=["Waste Pickups - Collector"],
    summary="Start Pickup Route / Collection",
    description="Collector marks pickup collection as in-progress.",
)
def collector_start_pickup(
    pickup_id: int,
    current_user: User = Depends(get_current_active_collector),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """Collector starts pickup route."""
    pickup = PickupService.collector_start_pickup(
        db=db,
        pickup_id=pickup_id,
        collector=current_user,
    )
    return PickupResponse.model_validate(pickup)


@router.post(
    "/collectors/pickups/{pickup_id}/complete",
    response_model=PickupResponse,
    status_code=status.HTTP_200_OK,
    tags=["Waste Pickups - Collector"],
    summary="Complete Pickup",
    description="Collector marks pickup completed, which atomically marks the associated waste report as RESOLVED.",
)
def collector_complete_pickup(
    pickup_id: int,
    current_user: User = Depends(get_current_active_collector),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """Collector completes pickup and marks report resolved."""
    pickup = PickupService.collector_complete_pickup(
        db=db,
        pickup_id=pickup_id,
        collector=current_user,
    )
    return PickupResponse.model_validate(pickup)


# ==============================================================================
# ADMIN ENDPOINTS
# ==============================================================================

@router.get(
    "/admin/pickups",
    response_model=List[PickupResponse],
    status_code=status.HTTP_200_OK,
    tags=["Waste Pickups - Admin"],
    summary="List All System Pickups",
    description="Admin overview of all platform pickups with status, collector, and search filters.",
)
def admin_list_pickups(
    status_filter: Optional[PickupStatus] = Query(default=None, alias="status", description="Filter by pickup status"),
    collector_id: Optional[int] = Query(default=None, description="Filter by assigned collector ID"),
    search: Optional[str] = Query(default=None, description="Search report description, location, or notes"),
    skip: int = Query(default=0, ge=0, description="Pagination offset"),
    limit: int = Query(default=50, ge=1, le=100, description="Pagination limit"),
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> List[PickupResponse]:
    """Admin query for all platform pickups."""
    pickups = PickupService.admin_list_pickups(
        db=db,
        status_filter=status_filter,
        collector_id=collector_id,
        search=search,
        skip=skip,
        limit=limit,
    )
    return [PickupResponse.model_validate(p) for p in pickups]


@router.post(
    "/admin/pickups/{pickup_id}/schedule",
    response_model=PickupResponse,
    status_code=status.HTTP_200_OK,
    tags=["Waste Pickups - Admin"],
    summary="Schedule Pickup & Optional Collector Assignment",
    description="Admin sets date/time slot for pickup and optionally assigns an active collector immediately.",
)
def admin_schedule_pickup(
    pickup_id: int,
    payload: PickupSchedulePayload,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """Admin schedules pickup date/slot and optional collector."""
    pickup = PickupService.admin_schedule_pickup(
        db=db,
        pickup_id=pickup_id,
        payload=payload,
        admin_user=current_admin,
    )
    return PickupResponse.model_validate(pickup)


@router.post(
    "/admin/pickups/{pickup_id}/assign",
    response_model=PickupResponse,
    status_code=status.HTTP_200_OK,
    tags=["Waste Pickups - Admin"],
    summary="Assign or Reassign Collector",
    description="Admin assigns or reassigns an active collector to a scheduled pickup.",
)
def admin_assign_collector(
    pickup_id: int,
    payload: PickupAssignPayload,
    current_admin: User = Depends(get_current_active_admin),
    db: Session = Depends(get_db),
) -> PickupResponse:
    """Admin assigns or reassigns collector."""
    pickup = PickupService.admin_assign_collector(
        db=db,
        pickup_id=pickup_id,
        collector_id=payload.collector_id,
        admin_user=current_admin,
    )
    return PickupResponse.model_validate(pickup)
