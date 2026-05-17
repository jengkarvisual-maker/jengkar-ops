#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$(pwd)/backups}"
APP_NAME="${APP_NAME:-jengkar-ops}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
OUTPUT_FILE="${BACKUP_DIR}/${APP_NAME}_project_${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

tar \
  --exclude=".git" \
  --exclude="node_modules" \
  --exclude=".next" \
  --exclude="backups" \
  -czf "${OUTPUT_FILE}" \
  .

echo "Project backup created at ${OUTPUT_FILE}"
