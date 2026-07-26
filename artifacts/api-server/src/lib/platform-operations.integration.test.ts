import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { pool } from "@workspace/db";
import { consumeQuota } from "./platform-operations";

const run = process.env.PLATFORM_DB_INTEGRATION === "1" ? describe : describe.skip;
const ownerUserId = 92001;

run("durable platform operations", () => {
  beforeAll(async () => {
    await pool.query(
      `insert into users (id,name,email,email_verified,password_hash)
       values ($1,'Platform fixture','platform-fixture@example.invalid',true,'fixture-not-a-real-hash')
       on conflict (id) do nothing`,
      [ownerUserId],
    );
    await pool.query("delete from career_data_quota_consumptions where owner_user_id=$1", [ownerUserId]);
    await pool.query("delete from career_data_quota_usage where owner_user_id=$1", [ownerUserId]);
  });

  afterAll(async () => pool.end());

  it("atomically enforces a quota under concurrency", async () => {
    const periodStart = new Date("2026-07-01T00:00:00Z");
    const periodEnd = new Date("2026-08-01T00:00:00Z");
    const attempts = await Promise.allSettled(Array.from({ length: 10 }, (_, index) =>
      consumeQuota({
        ownerUserId, dimension: "fixture_concurrency", limit: 5,
        periodStart, periodEnd, idempotencyKey: `fixture-${index}`,
        entitlementSnapshot: { source: "synthetic_fixture", limit: 5 },
      }),
    ));
    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(5);
    expect(attempts.filter((result) => result.status === "rejected" &&
      (result.reason as { code?: string }).code === "quota_exceeded")).toHaveLength(5);
  });

  it("replays an idempotency key without consuming twice", async () => {
    const input = {
      ownerUserId, dimension: "fixture_idempotency", limit: 2,
      periodStart: new Date("2026-07-01T00:00:00Z"),
      periodEnd: new Date("2026-08-01T00:00:00Z"),
      idempotencyKey: "fixture-replay",
      entitlementSnapshot: { source: "synthetic_fixture", limit: 2 },
    };
    expect(await consumeQuota(input)).toMatchObject({ replayed: false, consumed: 1 });
    expect(await consumeQuota(input)).toEqual({ replayed: true });
  });
});
