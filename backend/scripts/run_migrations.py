"""Database migration runner script for GreenLoop.

Executes Alembic migrations safely before container startup or during deployment,
supporting both PostgreSQL (staging/production) and SQLite (development).
Includes connection retry logic for containerized PostgreSQL startup.
"""

import os
import sys
import time
from sqlalchemy import create_engine, text
from alembic import command
from alembic.config import Config

# Ensure project root is on sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_dir = os.path.dirname(backend_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.core.config import settings
from backend.app.core.logging import get_logger, setup_logging

setup_logging()
logger = get_logger("greenloop.migrations")


def wait_for_database(db_url: str, max_retries: int = 30, retry_interval: float = 2.0) -> bool:
    """Wait for database server readiness (especially PostgreSQL in Docker)."""
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    logger.info(f"Checking database connectivity for target: {db_url.split('@')[-1] if '@' in db_url else db_url}")
    engine = create_engine(db_url, pool_pre_ping=True)
    for attempt in range(1, max_retries + 1):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("Database connection established successfully.")
            return True
        except Exception as exc:
            logger.warning(f"Database connection attempt {attempt}/{max_retries} failed: {exc}. Retrying in {retry_interval}s...")
            time.sleep(retry_interval)
    logger.error("Failed to connect to database within the allotted retry window.")
    return False


def run_migrations():
    """Execute Alembic migrations to head."""
    db_url = settings.DATABASE_URL
    if not wait_for_database(db_url):
        sys.exit(1)

    ini_path = os.path.join(backend_dir, "alembic.ini")
    if not os.path.exists(ini_path):
        ini_path = os.path.join(root_dir, "alembic.ini")

    logger.info(f"Loading Alembic configuration from: {ini_path}")
    alembic_cfg = Config(ini_path)
    alembic_cfg.set_main_option("script_location", os.path.join(backend_dir, "alembic"))

    try:
        logger.info("Running Alembic schema upgrade to 'head'...")
        command.upgrade(alembic_cfg, "head")
        logger.info("Database schema migrations completed successfully.")
    except Exception as exc:
        logger.error(f"Migration execution failed: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    run_migrations()
