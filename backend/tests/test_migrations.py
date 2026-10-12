"""Automated database schema migration test suite."""

import os
import tempfile
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_alembic_migrations_lifecycle():
    """Verify Alembic migrations upgrade from empty database and downgrade cleanly."""
    with tempfile.NamedTemporaryFile(suffix=".db") as tmp:
        db_path = tmp.name
        db_url = f"sqlite:///{db_path}"

        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        ini_path = os.path.join(backend_dir, "alembic.ini")

        config = Config(ini_path)
        config.set_main_option("script_location", os.path.join(backend_dir, "alembic"))
        config.set_main_option("sqlalchemy.url", db_url)

        # 1. Upgrade to head
        command.upgrade(config, "head")

        engine = create_engine(db_url)
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())

        expected_tables = {
            "users",
            "waste_reports",
            "pickups",
            "notifications",
            "activity_logs",
            "conversations",
            "conversation_participants",
            "messages",
            "user_locations",
            "recycling_centers",
            "alembic_version",
        }
        assert expected_tables.issubset(tables), f"Missing tables after upgrade: {expected_tables - tables}"

        # 2. Downgrade to base
        command.downgrade(config, "base")
        inspector = inspect(engine)
        remaining_tables = set(inspector.get_table_names())
        assert remaining_tables == {"alembic_version"} or len(remaining_tables) == 0, (
            f"Tables remained after downgrade: {remaining_tables}"
        )

        # 3. Re-upgrade to head to ensure re-application succeeds
        command.upgrade(config, "head")
        inspector = inspect(engine)
        reapplied_tables = set(inspector.get_table_names())
        assert expected_tables.issubset(reapplied_tables)
