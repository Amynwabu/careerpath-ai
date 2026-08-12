import { readFile } from "node:fs/promises";
import pg from "pg";
import { createPostgresPoolConfig } from "../lib/db/src/connection.ts";

const migrationFiles = [
  "supabase/migrations/20260618090000_journeys_advisors_reminders_certificates.sql",
  "supabase/migrations/20260618091500_add_google_oauth_auth_columns.sql",
  "supabase/migrations/20260618103000_rotating_refresh_tokens.sql",
  "supabase/migrations/20260724083857_add_career_taxonomy_foundation.sql",
];

function cleanEnv(value) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  return (quoted ? trimmed.slice(1, -1).trim() : trimmed) || undefined;
}

const migrationDatabaseUrl = cleanEnv(process.env.MIGRATION_DATABASE_URL);
if (!migrationDatabaseUrl?.startsWith("postgres")) {
  throw new Error("A valid MIGRATION_DATABASE_URL is required.");
}

const client = new pg.Client({
  ...createPostgresPoolConfig(migrationDatabaseUrl),
  connectionTimeoutMillis: 15_000,
  statement_timeout: 30_000,
});

await client.connect();
try {
  for (const migrationFile of migrationFiles) {
    const sql = await readFile(migrationFile, "utf8");
    console.log(`Applying ${migrationFile}`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }
} finally {
  await client.end();
}
