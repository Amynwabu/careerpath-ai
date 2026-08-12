import { describe, expect, it } from "vitest";
import { createPostgresPoolConfig } from "./connection";

describe("PostgreSQL connection configuration", () => {
  it.each([undefined, "disable", "allow", "prefer"])(
    "rejects hosted sslmode=%s",
    (sslMode) => {
      const query = sslMode ? `?sslmode=${sslMode}` : "";
      expect(() => createPostgresPoolConfig(
        `postgresql://app:secret@db.invalid/app${query}`,
        { APP_ENV: "production" },
      )).toThrow("explicitly require TLS");
    },
  );

  it("does not expose credentials in TLS validation errors", () => {
    const credential = "unique-database-password-fixture";
    const url = new URL("postgresql://db.invalid/app?sslmode=prefer");
    url.username = "app";
    url.password = credential;
    let message = "";
    try {
      createPostgresPoolConfig(
        url.toString(),
        { APP_ENV: "production" },
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }

    expect(message).toContain("explicitly require TLS");
    expect(message).not.toContain(credential);
    expect(message).not.toContain("postgresql://");
  });

  it.each(["require", "verify-full"])("accepts and pins sslmode=%s", (sslMode) => {
    const config = createPostgresPoolConfig(
      `postgresql://app:secret@db.invalid/app?sslmode=${sslMode}`,
      { APP_ENV: "production" },
    );

    expect(config.connectionString).not.toContain("sslmode");
    expect(config.ssl).toMatchObject({ rejectUnauthorized: true });
  });

  it("requires explicit TLS for hosted connections", () => {
    expect(() => createPostgresPoolConfig(
      "postgresql://app:secret@db.invalid/app",
      { APP_ENV: "production" },
    )).toThrow("explicitly require TLS");
  });

  it("pins the configured CA and prevents connection-string SSL overrides", () => {
    const config = createPostgresPoolConfig(
      "postgresql://app:secret@db.invalid/app?sslmode=require&sslrootcert=/tmp/untrusted.crt&uselibpqcompat=true",
      { APP_ENV: "production" },
    );

    expect(config.connectionString).not.toContain("sslmode");
    expect(config.connectionString).not.toContain("sslrootcert");
    expect(config.connectionString).not.toContain("uselibpqcompat");
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
