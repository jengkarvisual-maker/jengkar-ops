#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATION_FILE="${REPO_ROOT}/prisma/migrations/2026052501_add_user_archiving/migration.sql"
DB_URL_RAW="${DIRECT_URL:-${DATABASE_URL:-}}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ops-db}"
APP_NAME="${APP_NAME:-backup_ops_before_user_archiving}"

if [[ -z "${DB_URL_RAW}" ]]; then
  echo "DIRECT_URL or DATABASE_URL must be exported before running apply-user-archiving-migration.sh" >&2
  exit 1
fi

if [[ ! -f "${MIGRATION_FILE}" ]]; then
  echo "Migration file not found: ${MIGRATION_FILE}" >&2
  exit 1
fi

DB_URL="$(python3 "${REPO_ROOT}/scripts/sanitize-db-url.py" "${DB_URL_RAW}")"

echo "Resolved OPS DB target:"
python3 - "$DB_URL" <<'PY'
import sys
from urllib.parse import urlsplit

parsed = urlsplit(sys.argv[1])
print({
    "scheme": parsed.scheme,
    "host": parsed.hostname,
    "port": parsed.port or "(default)",
    "db": parsed.path.lstrip("/"),
})
PY

mkdir -p "${BACKUP_DIR}"
BACKUP_DIR="${BACKUP_DIR}" APP_NAME="${APP_NAME}" DATABASE_URL="${DB_URL}" DIRECT_URL="${DB_URL}" bash "${REPO_ROOT}/scripts/backup-db.sh"

HAS_COLUMNS="$(psql "${DB_URL}" -tAc "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'User' AND column_name IN ('isActive','archivedAt');")"

if [[ "${HAS_COLUMNS}" == "2" ]]; then
  echo "User archiving columns already exist. Migration skipped."
  exit 0
fi

psql "${DB_URL}" -v ON_ERROR_STOP=1 -f "${MIGRATION_FILE}"

psql "${DB_URL}" -c "SELECT column_name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'User' AND column_name IN ('isActive','archivedAt') ORDER BY column_name;"

echo "User archiving migration applied successfully."
