import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;
function requireDatabaseUrl(): string {
  const value = process.env.DATABASE_URL?.trim();
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
