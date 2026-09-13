"""GreenLoop FastAPI application entrypoint."""

import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text
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
    # Ensure upload directory exists
    upload_path = os.path.abspath(settings.UPLOAD_DIR)
    os.makedirs(upload_path, exist_ok=True)
    # Initialize base database tables if not present
    Base.metadata.create_all(bind=engine)

    # Ensure schema evolution for existing local SQLite database
    try:
        with engine.connect() as conn:
            cursor = conn.connection.cursor()
            cursor.execute("PRAGMA table_info(waste_reports)")
            columns = [row[1] for row in cursor.fetchall()]
            if columns and "collector_id" not in columns:
                conn.execute(text("ALTER TABLE waste_reports ADD COLUMN collector_id INTEGER REFERENCES users(id)"))
                conn.commit()
                logger.info("Migrated SQLite schema: added 'collector_id' column to waste_reports.")
    except Exception as exc:
        logger.warning(f"Schema auto-migration notice: {exc}")

    logger.info("Database foundation and tables initialized successfully.")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}...")


def create_application() -> FastAPI:
    """Factory function to configure and instantiate the FastAPI app."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Socially useful waste-management and recycling platform API.",
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

    # Mount static files directory for uploads
    upload_path = os.path.abspath(settings.UPLOAD_DIR)
    os.makedirs(upload_path, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=upload_path), name="uploads")

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
