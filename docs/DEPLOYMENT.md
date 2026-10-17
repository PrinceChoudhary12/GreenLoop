# GreenLoop — Production Deployment & Operations Guide

This guide describes the production architecture, deployment lifecycle, container orchestration, database migrations, backup procedures, and rollback operations for GreenLoop.

---

## 1. Architecture Overview

GreenLoop is deployed as a three-tier containerized service:

```
                  ┌─────────────────────────────────────┐
                  │          Internet / Clients         │
                  └──────────────────┬──────────────────┘
                                     │ HTTPS (Port 443 / 80)
                  ┌──────────────────▼──────────────────┐
                  │   Frontend Container (Nginx + SPA)  │
                  │   - Single Page App routing         │
                  │   - 1-Year immutable asset cache    │
                  │   - Reverse proxy for /api & /health│
                  └─────────┬───────────────────────────┘
                            │
               Internal API │ HTTP Port 8000
                            ▼
                  ┌─────────────────────────────────────┐
                  │    Backend Container (FastAPI)      │
                  │    - Rate limiter middleware        │
                  │    - Security headers & CSP         │
                  │    - Non-root runtime user (10001)  │
                  │    - /app/uploads persistent volume │
                  └─────────┬───────────────────────────┘
                            │
              SQLAlchemy 2.0│ TCP Port 5432
                            ▼
                  ┌─────────────────────────────────────┐
                  │    Database Container (PostgreSQL)  │
                  │    - Version: PostgreSQL 16 Alpine  │
                  │    - greenloop_postgres_data volume │
                  └─────────────────────────────────────┘
```

---

## 2. Pre-Requisites & Requirements

- **Docker Engine**: 24.0+
- **Docker Compose**: v2.20+
- **Host Memory**: Minimum 1 GB RAM (2 GB recommended)
- **Disk Storage**: 20 GB+ for container images, database data, and media uploads

---

## 3. Configuration & Secrets Management

In production (`APP_ENV=production`), the application enforces strict security validation at startup:
- **`SECRET_KEY`**: Must be a unique, cryptographically strong token (minimum 32 characters) generated outside source control. The server will **abort startup** if it is missing, too short, or set to a known development or placeholder value.
- **`POSTGRES_PASSWORD`**: Must be a strong password generated outside source control.
- **`DEBUG`**: Must be explicitly set to `False`.
- **`BACKEND_CORS_ORIGINS`**: Must be configured with your approved production domains (cannot fall back to localhost defaults).

### 3.1 Securely Initializing the Production Environment File

To create high-entropy secrets without printing them to terminal scrollback buffers, CI logs, or shell histories, while safely preserving existing `.env` files without duplicate keys:

```bash
# 1. Check if .env already exists (never silently overwrite existing secrets):
if [ -f .env ]; then
  echo "Notice: .env already exists. Existing secrets preserved."
  echo "To reconfigure, manually edit .env or back it up (e.g., cp .env .env.backup) before removing."
else
  # 2. Copy production template with owner-only (600) permissions:
  (umask 077 && cp .env.production.example .env)

  # 3. Generate high-entropy secrets directly in-place without terminal echoing:
  DB_PASS=$(openssl rand -hex 24)
  PROD_SECRET=$(openssl rand -hex 32)

  # 4. Safely substitute placeholder tokens in-place (cross-platform macOS & Linux):
  sed -i.bak \
    -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${DB_PASS}|" \
    -e "s|^SECRET_KEY=.*|SECRET_KEY=${PROD_SECRET}|" \
    -e "s|replace_with_strong_database_password_min_24_chars|${DB_PASS}|g" \
    .env && rm -f .env.bak

  unset DB_PASS PROD_SECRET
  echo "Production .env initialized with secure random secrets (permissions: 600)."
fi
```

### 3.2 Verify Production Configuration Safety
Before starting containers, verify that Docker Compose can interpolate all required variables:
```bash
docker compose config --quiet
```
If any required secret is missing, Docker Compose will immediately refuse to start with an explicit error message.

---

## 4. Container Deployment via Docker Compose

### 4.1 Launch Services

To build the images and launch the complete stack:

```bash
docker compose up -d --build
```

### 4.2 Lifecycle & Startup Sequence

1. **Database initialization**: PostgreSQL starts and runs healthcheck `pg_isready`.
2. **Pre-flight migration execution**: The backend entrypoint runs `python -m backend.scripts.run_migrations` with automatic connection retry logic until PostgreSQL is ready.
3. **FastAPI serving**: Uvicorn starts with configured worker concurrency (`WEB_CONCURRENCY`).
4. **Nginx reverse proxy**: The frontend container starts once the backend passes healthchecks (`/health`).

---

## 5. Health Probes & Monitoring

Both services provide active HTTP healthchecks:

- **Root Health Probe**: `GET http://<host>/health`
- **API v1 Health Probe**: `GET http://<host>/api/v1/health`

### Expected Health Response:
```json
{
  "status": "healthy",
  "app_name": "GreenLoop",
  "version": "1.0.0",
  "environment": "production",
  "components": {
    "database": {
      "status": "healthy",
      "details": "Database connection active and responsive"
    }
  }
}
```

Check running container status:
```bash
docker compose ps
docker compose logs -f backend
```

---

## 6. Database Migrations, Backups & Recovery

### 6.1 Running Migrations Manually
```bash
docker compose exec backend python -m backend.scripts.run_migrations
```

### 6.2 Database Backup (Hot Backup)
To produce a compressed timestamped SQL dump:
```bash
docker compose exec -T db pg_dump -U greenloop_user greenloop | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### 6.3 Database Restoration
```bash
gunzip < backup_20261017_120000.sql.gz | docker compose exec -T db psql -U greenloop_user greenloop
```

### 6.4 Uploads Backup
Persistent user-submitted waste report photos are stored in the Docker volume `greenloop_uploads_data`.
To archive the uploads:
```bash
docker run --rm -v greenloop_uploads_data:/data -v $(pwd):/backup alpine tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /data .
```

---

## 7. Rollback Strategy

If an issue occurs following a deployment:

1. **Code/Container Rollback**:
   Checkout the previous stable release commit or tag:
   ```bash
   git checkout v0.8.0
   docker compose up -d --build
   ```

2. **Database Schema Rollback**:
   To downgrade the database schema by one revision:
   ```bash
   docker compose exec backend alembic -c backend/alembic.ini downgrade -1
   ```
   Or restore from the pre-deployment database backup.
