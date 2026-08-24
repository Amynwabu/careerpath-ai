import type { Pool } from "pg";
import { inspectDatabaseRoleSecurity } from "./database-role-security";

const PRIVILEGED_IDENTITIES = /^(?:postgres|supabase_admin|service_role)$|migrat|admin|owner|service/i;
const INTEGRATION_FLAGS = [
  "ADVISOR_DB_INTEGRATION",
  "WORKFLOW_DB_INTEGRATION",
  "POOL_IDENTITY_INTEGRATION",
  "PLATFORM_DB_INTEGRATION",
] as const;

export function hostedIntegrationRequested(env: NodeJS.ProcessEnv = process.env): boolean {
  return INTEGRATION_FLAGS.some((name) => env[name] === "1");
}

export function prepareHostedIntegrationEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  if (!hostedIntegrationRequested(env)) return;
  if (env.APP_ENV !== "staging") fail();

  const expectedProjectRef = clean(env.STAGING_SUPABASE_PROJECT_REF);
  const runtimeUrl = validateRestrictedUrl(
    clean(env.STAGING_DATABASE_URL),
    expectedProjectRef,
  );
  if (sameUrl(runtimeUrl, clean(env.MIGRATION_DATABASE_URL))) fail();

  env.DATABASE_URL = runtimeUrl;
  if (env.PLATFORM_DB_INTEGRATION === "1") {
    const workerUrl = validateRestrictedUrl(
      clean(env.STAGING_WORKER_DATABASE_URL),
      expectedProjectRef,
    );
    if (sameUrl(workerUrl, runtimeUrl) || sameUrl(workerUrl, clean(env.MIGRATION_DATABASE_URL))) fail();
    env.WORKER_DATABASE_URL = workerUrl;
  }
}

export async function assertRestrictedHostedRole(pool: Pool): Promise<void> {
  const security = await inspectDatabaseRoleSecurity(pool);
  if (!security.secure) fail();
}

function validateRestrictedUrl(
  value: string,
  expectedProjectRef: string,
): string {
  if (!value || !expectedProjectRef) fail();
  let url: URL;
  try { url = new URL(value); } catch { fail(); }
  if (!url!.protocol.startsWith("postgres")) fail();
  const role = decodeURIComponent(url!.username).split(".", 1)[0] ?? "";
  if (!role || PRIVILEGED_IDENTITIES.test(role)) fail();
  const projectMatches = url!.hostname.includes(expectedProjectRef) ||
    decodeURIComponent(url!.username).endsWith(`.${expectedProjectRef}`);
  if (!projectMatches) fail();
  const tlsMode = url!.searchParams.get("sslmode");
  if (tlsMode !== "require" && tlsMode !== "verify-full") fail();
  return value;
}

function sameUrl(left: string, right: string): boolean {
  return Boolean(left && right && left === right);
}

function clean(value: string | undefined): string {
  return value?.trim() ?? "";
}

function fail(): never {
  throw Object.assign(new Error("restricted_runtime_required"), {
    code: "restricted_runtime_required",
  });
}
