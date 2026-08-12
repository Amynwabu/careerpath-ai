import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { PoolConfig } from "pg";

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
  url.searchParams.delete("sslmode");
  const caPath = env.DATABASE_CA_CERT_PATH
    ? resolve(env.DATABASE_CA_CERT_PATH)
    : resolve(process.cwd(), "prod-ca-2021.crt");
  const ca = readFileSync(caPath, "utf8");

  return {
    connectionString: url.toString(),
    ssl: { ca, rejectUnauthorized: true },
  };
}
