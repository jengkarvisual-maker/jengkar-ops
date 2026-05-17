#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: ./scripts/restore-db.sh /path/to/backup.dump" >&2
  exit 1
fi

INPUT_FILE="$1"
TARGET_DATABASE_URL="${TARGET_DATABASE_URL:-}"

if [[ ! -f "${INPUT_FILE}" ]]; then
  echo "Backup file not found: ${INPUT_FILE}" >&2
  exit 1
fi

if [[ -z "${TARGET_DATABASE_URL}" ]]; then
  echo "TARGET_DATABASE_URL must point to a restore target database." >&2
  echo "For safety, restore to a fresh or disposable database first." >&2
  exit 1
fi

pg_restore \
  --no-owner \
  --no-privileges \
  --dbname="${TARGET_DATABASE_URL}" \
  "${INPUT_FILE}"

echo "Restore completed into target database."
