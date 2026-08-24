import bcrypt from "bcryptjs";

export const loginFixtureTargets = [
  { actorId: 91001, email: "standard-client@staging.invalid", passwordVariable: "STAGING_CLIENT_PASSWORD" },
  { actorId: 91007, email: "second-client@staging.invalid", passwordVariable: "STAGING_SECOND_CLIENT_PASSWORD" },
] as const;

export type LoginFixtureResult = { actorId: number; status: "updated" | "unchanged" };

export interface LoginFixtureClient {
  query(
    text: string,
    values?: unknown[],
  ): Promise<{ rows: Array<Record<string, unknown>>; rowCount: number | null }>;
}

export function assertLoginFixtureEnvironment(env: NodeJS.ProcessEnv) {
  if (env.APP_ENV !== "staging" && env.APP_ENV !== "test")
    throw new Error("staging_fixture_environment_required");
  if (env.STAGING_FIXTURE_CONFIRMATION !== "SYNTHETIC_ONLY")
    throw new Error("staging_fixture_confirmation_required");

  const url = new URL(env.DATABASE_URL ?? "");
  const allowedHosts = (env.STAGING_DATABASE_HOST_ALLOWLIST ?? "")
    .split(",").map((host) => host.trim()).filter(Boolean);
  if (!allowedHosts.includes(url.hostname)) throw new Error("staging_database_host_not_allowlisted");
  if (env.PRODUCTION_DATABASE_HOST && url.hostname === env.PRODUCTION_DATABASE_HOST)
    throw new Error("production_database_forbidden");

  for (const target of loginFixtureTargets) {
    if (!target.email.endsWith(".invalid")) throw new Error("staging_fixture_invalid_email_required");
    const password = env[target.passwordVariable];
    if (!password || password.length < 16)
      throw new Error(`staging_fixture_password_required:${target.actorId}`);
  }
}

export async function updateLoginFixtureCredentials(
  client: LoginFixtureClient,
  env: NodeJS.ProcessEnv,
): Promise<LoginFixtureResult[]> {
  assertLoginFixtureEnvironment(env);
  const results: LoginFixtureResult[] = [];

  for (const target of loginFixtureTargets) {
    const existing = await client.query(
      "select id,email,password_hash from users where id=$1 for update",
      [target.actorId],
    );
    const row = existing.rows[0] as { id: number; email: string; password_hash: string } | undefined;
    if (!row || row.id !== target.actorId || row.email !== target.email || !row.email.endsWith(".invalid"))
      throw new Error(`staging_fixture_identity_mismatch:${target.actorId}`);

    const password = env[target.passwordVariable]!;
    if (await bcrypt.compare(password, row.password_hash)) {
      results.push({ actorId: target.actorId, status: "unchanged" });
      continue;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const updated = await client.query(
      `update users set password_hash=$1,updated_at=now()
       where id=$2 and email=$3 and email like '%.invalid'
       returning id`,
      [passwordHash, target.actorId, target.email],
    );
    if (updated.rowCount !== 1 || updated.rows[0]?.id !== target.actorId)
      throw new Error(`staging_fixture_update_failed:${target.actorId}`);
    results.push({ actorId: target.actorId, status: "updated" });
  }
  return results;
}
