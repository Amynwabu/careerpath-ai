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
  it("returns separated hosted settings", () => {
    expect(loadRuntimeConfig(valid)).toMatchObject({
      environment: "staging", cookieSecure: true, databaseTlsRequired: true,
      rateLimitNamespace: "staging",
    });
  });
});
