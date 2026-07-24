import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const migrationFiles = [
  "supabase/migrations/20260618090000_journeys_advisors_reminders_certificates.sql",
  "supabase/migrations/20260618091500_add_google_oauth_auth_columns.sql",
  "supabase/migrations/20260618103000_rotating_refresh_tokens.sql",
  "supabase/migrations/20260724083857_add_career_taxonomy_foundation.sql",
];

let migrationPromise;

function cleanEnv(value) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return (quoted ? trimmed.slice(1, -1).trim() : trimmed) || undefined;
}

async function applyReleaseMigrations() {
  const connectionString = cleanEnv(process.env.DATABASE_URL);
  if (!connectionString?.startsWith("postgres")) {
    throw new Error("A valid DATABASE_URL is required by the API function.");
  }

  const client = new pg.Client({
    connectionString,
    connectionTimeoutMillis: 15_000,
    statement_timeout: 30_000,
  });

  await client.connect();
  try {
    await client.query("select pg_advisory_lock(hashtext($1))", [
      "careerpathx-release-migrations",
    ]);
    await client.query(`
      create table if not exists public.careerpath_schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    for (const migrationFile of migrationFiles) {
      const migrationName = migrationFile.split("/").at(-1);
      const result = await client.query(
        "select 1 from public.careerpath_schema_migrations where name = $1",
        [migrationName],
      );
      if (result.rowCount > 0) continue;

      const sql = await readFile(resolve(process.cwd(), migrationFile), "utf8");
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query(
          "insert into public.careerpath_schema_migrations (name) values ($1)",
          [migrationName],
        );
        await client.query("commit");
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }
  } finally {
    await client
      .query("select pg_advisory_unlock(hashtext($1))", [
        "careerpathx-release-migrations",
      ])
      .catch(() => {});
    await client.end();
  }
}

export function ensureReleaseMigrations() {
  migrationPromise ??= applyReleaseMigrations().catch((error) => {
    migrationPromise = undefined;
    throw error;
  });
  return migrationPromise;
}
