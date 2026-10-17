# syntax=docker/dockerfile:1
FROM python:3.11-slim AS runtime

# Set runtime environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install minimal OS dependencies for PostgreSQL client and container healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Create dedicated non-root user and group
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/bash -m appuser

WORKDIR /app

# Install Python dependencies first for optimal Docker layer caching
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy application source code and configuration
COPY backend /app/backend
COPY alembic.ini /app/alembic.ini

# Create persistent uploads directory and set permissions
RUN mkdir -p /app/uploads && \
    chmod +x /app/backend/entrypoint.sh && \
    chown -R appuser:appgroup /app

# Switch to non-root execution
USER appuser

# Container healthcheck targeting root health probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000

ENTRYPOINT ["/app/backend/entrypoint.sh"]
