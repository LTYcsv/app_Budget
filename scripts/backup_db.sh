#!/usr/bin/env bash
# Бэкап PostgreSQL-тома через pg_dump внутри контейнера.
# Запуск вручную или кроном на хосте, например ежедневно в 03:00:
#   0 3 * * * /path/to/app_Budget/scripts/backup_db.sh >> /var/log/finflow-backup.log 2>&1
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$REPO_DIR/backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"
DB_USER="${DB_USER:-postgres}"

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y-%m-%d_%H%M%S)"
FILE="$BACKUP_DIR/finflow_$STAMP.sql.gz"

docker compose -f "$REPO_DIR/docker-compose.yml" exec -T db \
  pg_dump -U "$DB_USER" --format=plain finflow | gzip > "$FILE"

# Ротация: удаляем дампы старше KEEP_DAYS
find "$BACKUP_DIR" -name 'finflow_*.sql.gz' -mtime "+$KEEP_DAYS" -delete

echo "backup ok: $FILE ($(du -h "$FILE" | cut -f1))"
