#!/bin/sh
set -eu
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL is required}"
: "${BACKUP_REFERENCE:?BACKUP_REFERENCE is required before hosted migration}"
case "$MIGRATION_DATABASE_URL" in
  *sslmode=disable*) echo "TLS-disabled migration connections are forbidden" >&2; exit 1 ;;
esac
command -v psql >/dev/null 2>&1 || { echo "psql is required" >&2; exit 1; }
lock_id=1120395801
export PGOPTIONS="-c statement_timeout=${MIGRATION_STATEMENT_TIMEOUT_MS:-30000} -c idle_in_transaction_session_timeout=30000"
set -- "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -c "select pg_advisory_lock($lock_id)"
for migration in lib/db/drizzle/*.sql; do
  set -- "$@" -f "$migration"
done
set -- "$@" -c "select pg_advisory_unlock($lock_id)"
psql "$@" >/dev/null
psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  "select count(*) as rls_missing from pg_class where relkind='r' and relname like 'career_data_%' and not relrowsecurity"
