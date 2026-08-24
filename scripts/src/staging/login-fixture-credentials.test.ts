import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import { assertLoginFixtureEnvironment, updateLoginFixtureCredentials, type LoginFixtureClient } from "./login-fixture-credentials";

const baseEnv = {
  APP_ENV: "staging",
  STAGING_FIXTURE_CONFIRMATION: "SYNTHETIC_ONLY",
  DATABASE_URL: "postgresql://fixture:secret@staging-db.invalid/app",
  STAGING_DATABASE_HOST_ALLOWLIST: "staging-db.invalid",
  STAGING_CLIENT_PASSWORD: "synthetic-client-password-one",
  STAGING_SECOND_CLIENT_PASSWORD: "synthetic-client-password-two",
} satisfies NodeJS.ProcessEnv;

describe("staging login fixture credentials", () => {
  it("refuses non-staging environments and non-allowlisted databases", () => {
    expect(() => assertLoginFixtureEnvironment({ ...baseEnv, APP_ENV: "production" }))
      .toThrow("staging_fixture_environment_required");
    expect(() => assertLoginFixtureEnvironment({ ...baseEnv, STAGING_DATABASE_HOST_ALLOWLIST: "other.invalid" }))
      .toThrow("staging_database_host_not_allowlisted");
  });

  it("requires both encrypted-environment plaintext values", () => {
    expect(() => assertLoginFixtureEnvironment({ ...baseEnv, STAGING_SECOND_CLIENT_PASSWORD: "" }))
      .toThrow("staging_fixture_password_required:91007");
  });

  it("updates only exact synthetic identities and is idempotent", async () => {
    const users = new Map([
      [91001, { id: 91001, email: "standard-client@staging.invalid", password_hash: "synthetic-fixture-no-login" }],
      [91007, { id: 91007, email: "second-client@staging.invalid", password_hash: "synthetic-fixture-no-login" }],
    ]);
    const client = fakeClient(users);
    expect(await updateLoginFixtureCredentials(client, baseEnv)).toEqual([
      { actorId: 91001, status: "updated" }, { actorId: 91007, status: "updated" },
    ]);
    expect(await updateLoginFixtureCredentials(client, baseEnv)).toEqual([
      { actorId: 91001, status: "unchanged" }, { actorId: 91007, status: "unchanged" },
    ]);
    expect(await bcrypt.compare(baseEnv.STAGING_CLIENT_PASSWORD, users.get(91001)!.password_hash)).toBe(true);
  });

  it("refuses an actor whose stored email is not the exact invalid fixture", async () => {
    const users = new Map([
      [91001, { id: 91001, email: "real@example.com", password_hash: "unchanged" }],
      [91007, { id: 91007, email: "second-client@staging.invalid", password_hash: "unchanged" }],
    ]);
    await expect(updateLoginFixtureCredentials(fakeClient(users), baseEnv))
      .rejects.toThrow("staging_fixture_identity_mismatch:91001");
    expect(users.get(91001)!.password_hash).toBe("unchanged");
  });
});

function fakeClient(users: Map<number, { id: number; email: string; password_hash: string }>): LoginFixtureClient {
  return {
    async query(text, values = []) {
      const actorId = Number(text.startsWith("select") ? values[0] : values[1]);
      const user = users.get(actorId);
      if (text.startsWith("select")) return { rows: user ? [{ ...user }] : [], rowCount: user ? 1 : 0 };
      if (!user || user.email !== values[2] || !user.email.endsWith(".invalid")) return { rows: [], rowCount: 0 };
      user.password_hash = String(values[0]);
      return { rows: [{ id: actorId }], rowCount: 1 };
    },
  };
}
