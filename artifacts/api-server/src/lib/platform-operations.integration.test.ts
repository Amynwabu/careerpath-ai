import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { pool } from "@workspace/db";
import {
  cancelJob, claimJob, closePlatformWorkerPool, completeJob, consumeQuota,
  enqueueJob, failJob,
} from "./platform-operations";

const run = process.env.PLATFORM_DB_INTEGRATION === "1" ? describe : describe.skip;
const ownerUserId = 92001;
const testWorkerPool = new Pool({
  connectionString: process.env.WORKER_DATABASE_URL ?? process.env.DATABASE_URL,
});

run("durable platform operations", () => {
  beforeAll(async () => {
    await pool.query(
      `insert into users (id,name,email,email_verified,password_hash)
       values ($1,'Platform fixture','platform-fixture@example.invalid',true,'fixture-not-a-real-hash')
       on conflict (id) do nothing`,
      [ownerUserId],
    );
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("select set_config('app.user_id',$1,true)", [String(ownerUserId)]);
      await client.query("delete from career_data_quota_consumptions where owner_user_id=$1", [ownerUserId]);
      await client.query("delete from career_data_quota_usage where owner_user_id=$1", [ownerUserId]);
      await client.query("commit");
    } finally {
      client.release();
    }
    await testWorkerPool.query("delete from career_data_jobs where job_type='retention'");
  });

  afterAll(async () => {
    await closePlatformWorkerPool();
    await testWorkerPool.end();
    await pool.end();
  });

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

  it("claims a job once under concurrency and completes it", async () => {
    const jobId = await enqueueJob({
      ownerUserId, jobType: "retention", payload: { resourceId: "fixture" },
      idempotencyKey: "fixture-complete", traceId: "fixture-trace",
    });
    const claims = await Promise.all(Array.from({ length: 5 }, (_, index) =>
      claimJob({ workerId: `worker-${index}`, jobTypes: ["retention"] }),
    ));
    expect(claims.filter(Boolean)).toHaveLength(1);
    const claim = claims.find(Boolean)!;
    expect(claim.job_id).toBe(jobId);
    await completeJob({ jobId, workerId: claims.find(Boolean)!.job_id === jobId
      ? `worker-${claims.findIndex(Boolean)}` : "never" });
    const status = await testWorkerPool.query<{ status: string }>(
      "select status from career_data_jobs where job_id=$1", [jobId],
    );
    expect(status.rows[0]?.status).toBe("completed");
  });

  it("retries, dead-letters, reclaims expired leases and cancels safely", async () => {
    const retryJob = await enqueueJob({
      ownerUserId, jobType: "retention", payload: { resourceId: "retry" },
      idempotencyKey: "fixture-retry", traceId: "fixture-trace", maxAttempts: 2,
    });
    expect(await claimJob({ workerId: "retry-worker", jobTypes: ["retention"] }))
      .toMatchObject({ job_id: retryJob, attempt_count: 1 });
    expect(await failJob({
      jobId: retryJob, workerId: "retry-worker", errorCode: "fixture_failure",
      retryDelaySeconds: 0,
    })).toBe("retry_scheduled");
    expect(await claimJob({ workerId: "retry-worker", jobTypes: ["retention"] }))
      .toMatchObject({ attempt_count: 2 });
    expect(await failJob({
      jobId: retryJob, workerId: "retry-worker", errorCode: "fixture_failure",
      retryDelaySeconds: 0,
    })).toBe("dead_letter");

    const leasedJob = await enqueueJob({
      ownerUserId, jobType: "retention", payload: { resourceId: "lease" },
      idempotencyKey: "fixture-lease", traceId: "fixture-trace",
    });
    await claimJob({ workerId: "expired-worker", jobTypes: ["retention"] });
    await testWorkerPool.query(
      "update career_data_jobs set locked_at=now()-interval '2 seconds' where job_id=$1",
      [leasedJob],
    );
    expect(await claimJob({
      workerId: "replacement-worker", jobTypes: ["retention"], leaseSeconds: 1,
    })).toMatchObject({ job_id: leasedJob });

    const cancelledJob = await enqueueJob({
      ownerUserId, jobType: "retention", payload: { resourceId: "cancel" },
      idempotencyKey: "fixture-cancel", traceId: "fixture-trace",
    });
    await cancelJob(cancelledJob, ownerUserId);
    expect(await claimJob({ workerId: "worker", jobTypes: ["retention"] }))
      .toBeUndefined();
  });
});
