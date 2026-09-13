"""Database session and engine management.

Configured for SQLite in local development and ready for PostgreSQL migration.
"""

import os
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.core.config import settings

# Engine configuration
connect_args = {}
db_url = settings.DATABASE_URL
if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    # Resolve relative sqlite paths consistently to backend directory
    if not db_url.startswith("sqlite:////") and db_url != "sqlite:///:memory:":
        rel_path = db_url.replace("sqlite:///", "").lstrip("./")
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        abs_db_path = os.path.join(backend_dir, rel_path)
        db_url = f"sqlite:///{abs_db_path}"

engine = create_engine(
    db_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    echo=False,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency yielding a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
