#!/bin/sh
set -eu
: "${MIGRATION_DATABASE_URL:?MIGRATION_DATABASE_URL is required}"
: "${BACKUP_REFERENCE:?BACKUP_REFERENCE is required before hosted migration}"
case "$MIGRATION_DATABASE_URL" in
  *sslmode=disable*) echo "TLS-disabled migration connections are forbidden" >&2; exit 1 ;;
esac
command -v psql >/dev/null 2>&1 || { echo "psql is required" >&2; exit 1; }
if command -v shasum >/dev/null 2>&1; then
  checksum_command=shasum
elif command -v sha256sum >/dev/null 2>&1; then
  checksum_command=sha256sum
else
  echo "shasum or sha256sum is required" >&2
  exit 1
fi
lock_id=1120395801
export PGOPTIONS="-c statement_timeout=${MIGRATION_STATEMENT_TIMEOUT_MS:-30000} -c idle_in_transaction_session_timeout=30000"
control_file=$(mktemp)
trap 'rm -f "$control_file"' EXIT
{
  printf '\\set ON_ERROR_STOP on\n'
  printf 'select pg_advisory_lock(%s);\n' "$lock_id"
  printf '%s\n' "create table if not exists platform_schema_migrations (
    migration_name text primary key,
    checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
    applied_at timestamptz not null default now(),
    applied_by text not null default current_user
  );"
  printf '%s\n' "revoke all on platform_schema_migrations from public;"
} > "$control_file"
for migration in lib/db/drizzle/*.sql; do
  migration_name=${migration##*/}
  if [ "$checksum_command" = shasum ]; then
    migration_checksum=$(shasum -a 256 "$migration" | awk '{print $1}')
  else
    migration_checksum=$(sha256sum "$migration" | awk '{print $1}')
  fi
  {
    printf "%s\n" "select exists (
      select 1 from platform_schema_migrations where migration_name='$migration_name'
    ) as migration_applied \\gset"
    printf '\\if :migration_applied\n'
    printf "%s\n" "select checksum_sha256='$migration_checksum' as checksum_valid
      from platform_schema_migrations where migration_name='$migration_name' \\gset"
    printf '\\if :checksum_valid\n'
    printf '\\else\n'
    printf "\\echo 'Checksum mismatch for %s'\n" "$migration_name"
    printf '\\quit 1\n'
    printf '\\endif\n'
    printf '\\else\n'
    printf "\\i '%s'\n" "$migration"
    printf "%s\n" "insert into platform_schema_migrations(migration_name,checksum_sha256)
      values ('$migration_name','$migration_checksum');"
    printf '\\endif\n'
  } >> "$control_file"
done
printf 'select pg_advisory_unlock(%s);\n' "$lock_id" >> "$control_file"
psql "$MIGRATION_DATABASE_URL" -f "$control_file" >/dev/null
psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -c \
  "select count(*) as rls_missing from pg_class where relkind='r' and relname like 'career_data_%' and not relrowsecurity"
