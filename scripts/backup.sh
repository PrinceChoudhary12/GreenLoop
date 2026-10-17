#!/usr/bin/env bash
# ==============================================================================
# GreenLoop - Automated Backup Script for Staging / Production
# Dumps PostgreSQL database and archives persistent uploaded media.
# ==============================================================================
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-backups}"
mkdir -p "$BACKUP_DIR"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"

echo "==> Backing up PostgreSQL database..."
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-greenloop_user}" "${POSTGRES_DB:-greenloop}" | gzip > "$BACKUP_DIR/db_backup_${TIMESTAMP}.sql.gz"
echo "  ✓ Database dump saved to: $BACKUP_DIR/db_backup_${TIMESTAMP}.sql.gz"

echo "==> Backing up uploads volume..."
docker run --rm -v greenloop_uploads_data:/data -v "$(pwd)/$BACKUP_DIR":/backup alpine tar czf "/backup/uploads_backup_${TIMESTAMP}.tar.gz" -C /data .
echo "  ✓ Uploads archive saved to: $BACKUP_DIR/uploads_backup_${TIMESTAMP}.tar.gz"

echo "==> Backup completed successfully at $(date -u '+%Y-%m-%d %H:%M:%SZ')."
