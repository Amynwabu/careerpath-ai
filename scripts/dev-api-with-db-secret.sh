#!/bin/sh
set -eu

database_url_file="${DATABASE_URL_FILE:-/private/tmp/careerpath-ai-database-url}"

if [ -z "${DATABASE_URL:-}" ] && [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

database_url="${DATABASE_URL:-}"

if [ -z "$database_url" ]; then
  if [ ! -r "$database_url_file" ]; then
    printf 'DATABASE_URL secret file is not readable: %s\n' "$database_url_file" >&2
    exit 1
  fi

  database_url="$(cat "$database_url_file")"
fi

if [ -z "$database_url" ]; then
  printf 'DATABASE_URL is empty. Set DATABASE_URL or provide a readable DATABASE_URL_FILE.\n' >&2
  exit 1
fi

export DATABASE_URL="$database_url"
export PORT="${PORT:-8080}"

exec pnpm --filter @workspace/api-server run dev
