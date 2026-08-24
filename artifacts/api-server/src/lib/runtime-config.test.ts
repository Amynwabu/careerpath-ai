import { describe, expect, it } from "vitest";
import { loadRuntimeConfig } from "./runtime-config";

describe("hosted runtime configuration", () => {
  const valid = {
    APP_ENV: "staging", DATABASE_URL: "postgresql://app:secret@db.invalid/app?sslmode=require",
    JWT_SECRET: "a-secure-staging-secret-with-32-characters",
    APP_ORIGIN: "https://staging.example.invalid", API_BASE_URL: "https://api.staging.example.invalid",
    APPLICATION_VERSION: "fixture", ALLOWED_ORIGINS: "https://staging.example.invalid",
    SUPABASE_URL: "https://storage.example.invalid", SUPABASE_SERVICE_ROLE_KEY: "fixture",
    CAREER_DOCUMENT_BUCKET: "staging-private", RATE_LIMIT_NAMESPACE: "staging",
    WORKER_DATABASE_URL: "postgresql://worker:secret@db.invalid/app?sslmode=require",
  };
  it("fails closed for missing secrets, wildcard CORS and insecure URLs", () => {
    expect(() => loadRuntimeConfig({ APP_ENV: "staging" })).toThrow("Missing required");
    expect(() => loadRuntimeConfig({ ...valid, ALLOWED_ORIGINS: "*" })).toThrow("Wildcard");
    expect(() => loadRuntimeConfig({ ...valid, APP_ORIGIN: "http://staging.example.invalid" })).toThrow("HTTPS");
    expect(() => loadRuntimeConfig({
      ...valid,
      DATABASE_URL: "postgresql://app:secret@db.invalid/app",
    })).toThrow("explicitly require TLS");
  });
  it.each(["disable", "allow", "prefer"])("rejects DATABASE_URL sslmode=%s", (sslMode) => {
    expect(() => loadRuntimeConfig({
      ...valid,
      DATABASE_URL: `postgresql://app:secret@db.invalid/app?sslmode=${sslMode}`,
    })).toThrow("explicitly require TLS");
  });
  it.each(["disable", "allow", "prefer"])("rejects WORKER_DATABASE_URL sslmode=%s", (sslMode) => {
    expect(() => loadRuntimeConfig({
      ...valid,
      WORKER_DATABASE_URL: `postgresql://worker:secret@db.invalid/app?sslmode=${sslMode}`,
    })).toThrow("explicitly require TLS");
  });
  it("rejects migration credentials in hosted request runtime", () => {
    expect(() => loadRuntimeConfig({
      ...valid,
      MIGRATION_DATABASE_URL: valid.DATABASE_URL,
    })).toThrow("forbidden in hosted request runtime");
    expect(() => loadRuntimeConfig({
      ...valid,
      MIGRATION_DATABASE_URL: "postgresql://migrator:secret@db.invalid/app?sslmode=require",
    })).toThrow("forbidden in hosted request runtime");
  });
  it("does not include database credentials in validation errors", () => {
    const credential = "runtime-password-fixture";
    const url = new URL("postgresql://db.invalid/app?sslmode=prefer");
    url.username = "app";
    url.password = credential;
    expect(() => loadRuntimeConfig({
      ...valid,
      DATABASE_URL: url.toString(),
    })).toThrowError(expect.not.stringContaining(credential));
  });
  it("returns separated hosted settings", () => {
    expect(loadRuntimeConfig(valid)).toMatchObject({
      environment: "staging", cookieSecure: true, databaseTlsRequired: true,
      rateLimitNamespace: "staging",
    });
  });
});
