import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

function cleanEnv(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;

  const quoteStart = trimmed[0];
  const quoteEnd = trimmed[trimmed.length - 1];
  const quoted =
    (quoteStart === `"` && quoteEnd === `"`) ||
    (quoteStart === `'` && quoteEnd === `'`);

  return (quoted ? trimmed.slice(1, -1).trim() : trimmed) || undefined;
}

function requireDatabaseUrl(): string {
  const value = cleanEnv(process.env.DATABASE_URL);
  if (!value) {
    throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
  }
  if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(value)) {
    throw new Error("DATABASE_URL must not point to localhost when NODE_ENV=production");
  }
  return value;
}

const connectionString = requireDatabaseUrl();

export const pool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.PG_IDLE_TIMEOUT_MS ?? 30_000),
  connectionTimeoutMillis: Number(process.env.PG_CONNECTION_TIMEOUT_MS ?? 5_000),
  options: `-c statement_timeout=${Number(process.env.PG_STATEMENT_TIMEOUT_MS ?? 15_000)}`,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
export { and, count, desc, eq, isNull, or } from "drizzle-orm";
