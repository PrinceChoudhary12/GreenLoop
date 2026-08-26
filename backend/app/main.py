"""GreenLoop FastAPI application entrypoint."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend.app.api.v1.router import api_v1_router
from backend.app.core.config import settings
from backend.app.core.exceptions import register_exception_handlers
from backend.app.core.logging import get_logger, setup_logging
from backend.app.db.base import Base
from backend.app.db.session import engine, get_db
from backend.app.schemas.health import HealthResponse
from backend.app.services.health import HealthService

# Initialize application logging
setup_logging()
logger = get_logger("greenloop.app")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context for startup and shutdown events."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} ({settings.APP_ENV} mode)...")
    # Initialize base database tables if not present (foundational metadata)
    Base.metadata.create_all(bind=engine)
    logger.info("Database foundation initialized successfully.")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}...")


def create_application() -> FastAPI:
    """Factory function to configure and instantiate the FastAPI app."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Socially useful waste-management and recycling platform API foundation.",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # CORS Middleware
    if settings.BACKEND_CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.BACKEND_CORS_ORIGINS,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Exception Handling
    register_exception_handlers(app)

    # Root health endpoint (for load balancers and container monitors)
    @app.get(
        "/health",
        response_model=HealthResponse,
        status_code=status.HTTP_200_OK,
        tags=["Health"],
        summary="Root Health Check",
    )
    def root_health(db: Session = Depends(get_db)) -> HealthResponse:
        return HealthService.check_health(db)

    # API v1 Router
    app.include_router(api_v1_router, prefix=settings.API_V1_STR)

    return app


app = create_application()
