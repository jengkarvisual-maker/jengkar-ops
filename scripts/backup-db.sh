#!/usr/bin/env bash
set -euo pipefail

DB_URL="${DIRECT_URL:-${DATABASE_URL:-}}"

if [[ -z "${DB_URL}" ]]; then
  echo "DIRECT_URL or DATABASE_URL must be exported before running backup-db.sh" >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backups}"
APP_NAME="${APP_NAME:-jengkar-ops}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_FILE="${BACKUP_DIR}/${APP_NAME}_db_${TIMESTAMP}.dump"

mkdir -p "${BACKUP_DIR}"

pg_dump \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="${OUTPUT_FILE}" \
  "${DB_URL}"

echo "Database backup created at ${OUTPUT_FILE}"
