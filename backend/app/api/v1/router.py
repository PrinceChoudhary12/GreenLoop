"""API v1 master router."""

from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    activity,
    admin,
    auth,
    collectors,
    health,
    notifications,
    pickups,
    reports,
)

api_v1_router = APIRouter()
api_v1_router.include_router(health.router, tags=["Health"])
api_v1_router.include_router(auth.router)
api_v1_router.include_router(collectors.router)
api_v1_router.include_router(reports.router)
api_v1_router.include_router(admin.router)
api_v1_router.include_router(pickups.router)
api_v1_router.include_router(notifications.router)
api_v1_router.include_router(activity.router)
