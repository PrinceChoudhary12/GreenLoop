"""API v1 master router."""

from fastapi import APIRouter
from backend.app.api.v1.endpoints import auth, health, reports

api_v1_router = APIRouter()
api_v1_router.include_router(health.router, tags=["Health"])
api_v1_router.include_router(auth.router)
api_v1_router.include_router(reports.router)
