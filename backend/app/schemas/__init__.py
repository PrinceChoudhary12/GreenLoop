"""Schemas package."""

from backend.app.schemas.health import HealthResponse, ServiceComponentHealth
from backend.app.schemas.report import (
    WasteReportCreate,
    WasteReportResponse,
    WasteReportSummary,
)
from backend.app.schemas.user import (
    TokenResponse,
    UserLogin,
    UserRegister,
    UserResponse,
)

__all__ = [
    "HealthResponse",
    "ServiceComponentHealth",
    "UserRegister",
    "UserLogin",
    "UserResponse",
    "TokenResponse",
    "WasteReportCreate",
    "WasteReportResponse",
    "WasteReportSummary",
]
