"""Centralized exception handling for GreenLoop.

Ensures user-friendly JSON responses without exposing internal stack traces.
"""

from typing import Any, Dict, List, Optional
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.app.core.logging import get_logger

logger = get_logger(__name__)


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        error_code: str = "INTERNAL_ERROR",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}


class DatabaseException(AppException):
    """Raised when a database error occurs."""

    def __init__(self, message: str = "Database operation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            error_code="DATABASE_ERROR",
            details=details,
        )


class ResourceNotFoundException(AppException):
    """Raised when a requested resource is not found."""

    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} with identifier '{identifier}' not found",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
            details={"resource": resource, "identifier": str(identifier)},
        )


def _sanitize_validation_errors(raw_errors: List[Any]) -> List[Dict[str, Any]]:
    """Convert raw pydantic error dicts to clean, serializable structures."""
    sanitized = []
    for err in raw_errors:
        if isinstance(err, dict):
            clean_err = {
                "field": ".".join(str(loc) for loc in err.get("loc", []) if loc != "body"),
                "message": err.get("msg", "Invalid value"),
                "type": err.get("type", "validation_error"),
            }
            sanitized.append(clean_err)
        else:
            sanitized.append({"message": str(err)})
    return sanitized


def register_exception_handlers(app: FastAPI) -> None:
    """Register custom exception handlers with FastAPI application."""

    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        logger.error(f"AppException: [{exc.error_code}] {exc.message} - Path: {request.url.path}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.error_code,
                    "message": exc.message,
                    "details": jsonable_encoder(exc.details),
                }
            },
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        logger.warning(f"HTTPException: {exc.status_code} - {exc.detail} - Path: {request.url.path}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": str(exc.detail),
                    "details": {},
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        sanitized_errors = _sanitize_validation_errors(exc.errors())
        logger.warning(f"Validation error on {request.url.path}: {sanitized_errors}")
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Invalid request payload or parameters",
                    "details": {"errors": sanitized_errors},
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unhandled server error on {request.url.path}: {str(exc)}")
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": "An unexpected error occurred. Please try again later.",
                    "details": {},
                }
            },
        )
