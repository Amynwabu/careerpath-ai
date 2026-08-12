import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PoolConfig } from "pg";
import { SUPABASE_ROOT_2021_CA } from "./supabase-ca";

const TLS_MODES = new Set(["require", "verify-full"]);

export function createPostgresPoolConfig(
  connectionString: string,
  env: NodeJS.ProcessEnv = process.env,
): PoolConfig {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");
  const hosted = env.APP_ENV === "staging" || env.APP_ENV === "production";

  if (hosted && !TLS_MODES.has(sslMode ?? "")) {
    throw new Error("Hosted PostgreSQL connections must explicitly require TLS.");
  }

  if (!TLS_MODES.has(sslMode ?? "")) {
    return { connectionString };
  }

  // Connection-string SSL parameters can replace an explicit node-postgres
  // `ssl` object. Remove sslmode after validating it so the pinned CA and
  // certificate verification cannot be silently overridden.
  for (const parameter of [
    "sslmode",
    "ssl",
    "sslcert",
    "sslkey",
    "sslrootcert",
    "sslpassword",
    "uselibpqcompat",
  ]) {
    url.searchParams.delete(parameter);
  }
  const ca = env.DATABASE_CA_CERT_PATH
    ? readFileSync(resolve(env.DATABASE_CA_CERT_PATH), "utf8")
    : SUPABASE_ROOT_2021_CA;

  return {
    connectionString: url.toString(),
    ssl: { ca, rejectUnauthorized: true },
  };
}
