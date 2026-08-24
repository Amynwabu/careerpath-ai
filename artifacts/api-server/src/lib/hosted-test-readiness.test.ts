import { describe, expect, it } from "vitest";
import { prepareHostedIntegrationEnvironment } from "./hosted-test-readiness";

const projectRef = "sfpbhwzvspuouondwpdy";
const restricted = `postgresql://careerpath_runtime.${projectRef}:secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=verify-full`;
const worker = `postgresql://careerpath_worker.${projectRef}:secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?sslmode=require`;

function validEnv(): NodeJS.ProcessEnv {
  return {
    APP_ENV: "staging",
    STAGING_SUPABASE_PROJECT_REF: projectRef,
    STAGING_DATABASE_URL: restricted,
    POOL_IDENTITY_INTEGRATION: "1",
  };
}

describe("hosted integration readiness", () => {
  it("selects only the explicit restricted staging identity", () => {
    const env = validEnv();
    prepareHostedIntegrationEnvironment(env);
    expect(env.DATABASE_URL).toBe(restricted);
  });

  it.each([
    ["wrong environment", { APP_ENV: "test" }],
    ["missing explicit URL", { STAGING_DATABASE_URL: undefined }],
    ["postgres owner", { STAGING_DATABASE_URL: restricted.replace("careerpath_runtime", "postgres") }],
    ["migration role", { STAGING_DATABASE_URL: restricted.replace("careerpath_runtime", "careerpath_migrator") }],
    ["wrong project", { STAGING_SUPABASE_PROJECT_REF: "wrongproject" }],
    ["TLS downgrade", { STAGING_DATABASE_URL: restricted.replace("verify-full", "prefer") }],
    ["migration fallback", { MIGRATION_DATABASE_URL: restricted }],
  ])("fails closed for %s", (_name, override) => {
    const env = { ...validEnv(), ...override };
    expect(() => prepareHostedIntegrationEnvironment(env)).toThrow("restricted_runtime_required");
  });

  it("requires a distinct restricted worker identity", () => {
    const env: NodeJS.ProcessEnv = {
      ...validEnv(),
      PLATFORM_DB_INTEGRATION: "1",
      STAGING_WORKER_DATABASE_URL: worker,
    };
    prepareHostedIntegrationEnvironment(env);
    expect(env.WORKER_DATABASE_URL).toBe(worker);
    expect(() => prepareHostedIntegrationEnvironment({
      ...env,
      STAGING_WORKER_DATABASE_URL: restricted,
    })).toThrow("restricted_runtime_required");
  });

  it("never includes a supplied URL or password in its error", () => {
    const secret = "do-not-print-this-password";
    const env = validEnv();
    env.STAGING_DATABASE_URL = `postgresql://postgres:${secret}@db.${projectRef}.supabase.co/postgres?sslmode=require`;
    try {
      prepareHostedIntegrationEnvironment(env);
      throw new Error("expected rejection");
    } catch (error) {
      expect(String(error)).toBe("Error: restricted_runtime_required");
      expect(String(error)).not.toContain(secret);
    }
  });
});
