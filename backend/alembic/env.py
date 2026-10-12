"""Alembic migration execution environment for GreenLoop."""

import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool

from alembic import context

# Ensure repository root is on sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from backend.app.core.config import settings
from backend.app.db.base import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_database_url() -> str:
    """Return database URL from environment or configuration."""
    url = config.get_main_option("sqlalchemy.url")
    if not url or "driver://user:pass" in url:
        url = settings.DATABASE_URL
    # Ensure SQLite paths are absolute when relative
    if url.startswith("sqlite:///") and not url.startswith("sqlite:////") and url != "sqlite:///:memory:":
        rel_path = url.replace("sqlite:///", "").lstrip("./")
        backend_dir = os.path.join(root_dir, "backend")
        abs_db_path = os.path.join(backend_dir, rel_path)
        url = f"sqlite:///{abs_db_path}"
    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = get_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,  # Enables batch mode for SQLite table alterations
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_database_url()

    connect_args = {}
    if configuration["sqlalchemy.url"].startswith("sqlite"):
        connect_args["check_same_thread"] = False

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # Enables batch mode for SQLite compatibility
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
