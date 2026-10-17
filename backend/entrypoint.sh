#!/usr/bin/env bash
set -e

echo "==> Running pre-flight database migrations..."
python -m backend.scripts.run_migrations

echo "==> Starting GreenLoop FastAPI application with Uvicorn..."
exec uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --workers ${WEB_CONCURRENCY:-2}
