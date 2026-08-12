import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createPostgresPoolConfig } from "./connection";

const caPath = resolve(process.cwd(), "../../prod-ca-2021.crt");

describe("PostgreSQL connection configuration", () => {
  it("requires explicit TLS for hosted connections", () => {
    expect(() => createPostgresPoolConfig(
      "postgresql://app:secret@db.invalid/app",
      { APP_ENV: "production" },
    )).toThrow("explicitly require TLS");
  });

  it("pins the configured CA and prevents connection-string SSL overrides", () => {
    const config = createPostgresPoolConfig(
      "postgresql://app:secret@db.invalid/app?sslmode=require",
      { APP_ENV: "production", DATABASE_CA_CERT_PATH: caPath },
    );

    expect(config.connectionString).not.toContain("sslmode");
    expect(config.ssl).toMatchObject({ rejectUnauthorized: true });
    expect((config.ssl as { ca: string }).ca).toContain("BEGIN CERTIFICATE");
  });

  it("keeps non-hosted local connections unchanged", () => {
    expect(createPostgresPoolConfig(
      "postgresql://localhost/app",
      { APP_ENV: "local" },
    )).toEqual({ connectionString: "postgresql://localhost/app" });
  });
});
