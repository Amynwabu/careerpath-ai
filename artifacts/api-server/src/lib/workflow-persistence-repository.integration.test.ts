import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import {
  createOpportunitySnapshot, createWorkflowExport, createWorkflowSession,
  getOpportunitySnapshot, getWorkflowExport, getWorkflowSession,
  listOpportunitySnapshots, listWorkflowSessions, persistWorkflowResource,
  rememberIdempotency, replayIdempotency, saveOpportunity, saveWorkflowSession,
} from "./workflow-persistence-repository";
import { actorQuery } from "./database-actor-context";
import { assertRestrictedHostedRole } from "./hosted-test-readiness";

const run = process.env.WORKFLOW_DB_INTEGRATION === "1" ? describe : describe.skip;
const hostedRunId = randomUUID();
const idempotencyResourceId = `workflow_interview_fixture_${hostedRunId}`;
const expiredIdempotencyResourceId = `workflow_expired_fixture_${hostedRunId}`;
type Fixture = { sessionId: string; ownerUserId: string; status: string; recordVersion: number };

run("durable cross-domain workflow repository", () => {
  beforeAll(async () => {
    await assertRestrictedHostedRole(pool);
    await actorQuery(91001,
      "delete from career_data_workflow_idempotency where resource_id=any($1::text[])",
      [[idempotencyResourceId, expiredIdempotencyResourceId]],
    );
  });

  afterAll(async () => {
    await actorQuery(91001,
      "delete from career_data_workflow_idempotency where resource_id=any($1::text[])",
      [[idempotencyResourceId, expiredIdempotencyResourceId]],
    );
    await pool.end();
  });

  it("persists owner-isolated immutable vacancy snapshots", async () => {
    const vacancy = {
      jobId: "workflow_job_fixture", source: "fixture", sourceReference: "fixture-1",
      taxonomyVersion: "2026.1", title: "Fixture role",
    };
    await createOpportunitySnapshot(91001, vacancy);
    expect(await getOpportunitySnapshot(91001, vacancy.jobId)).toMatchObject(vacancy);
    expect(await getOpportunitySnapshot(91002, vacancy.jobId)).toBeUndefined();
    expect(await listOpportunitySnapshots(91001)).toHaveLength(1);
    await expect(actorQuery(91001,
      "update career_data_opportunity_snapshots set payload='{}' where opportunity_snapshot_id=$1",
      [vacancy.jobId],
    )).rejects.toThrow("immutable_workflow_record");
  });

  it("persists sessions across independent reads and rejects stale updates", async () => {
    const payload: Fixture = { sessionId: `workflow_cv_fixture_${randomUUID()}`, ownerUserId: "91001", status: "created", recordVersion: 1 };
    await createWorkflowSession({ domain: "application", ownerUserId: 91001,
      sessionId: payload.sessionId, status: payload.status, payload });
    expect(await getWorkflowSession("application", 91001, payload.sessionId)).toEqual(payload);
    expect(await getWorkflowSession("application", 91002, payload.sessionId)).toBeUndefined();
    const next = { ...payload, status: "analysed", recordVersion: 2 };
    await saveWorkflowSession({ domain: "application", ownerUserId: 91001,
      sessionId: payload.sessionId, status: next.status, expectedVersion: 1, payload: next });
    await expect(saveWorkflowSession({ domain: "application", ownerUserId: 91001,
      sessionId: payload.sessionId, status: next.status, expectedVersion: 1, payload: next }))
      .rejects.toMatchObject({ code: "record_version_conflict" });
    expect(await listWorkflowSessions<Fixture>("application", 91001)).toContainEqual(next);
  });

  it("replays hashed idempotency without retaining request payloads", async () => {
    const idempotencyKey = `sensitive-fixture-key-${hostedRunId}`;
    await rememberIdempotency({ ownerUserId: 91001, domain: "interview",
      operation: "session", key: idempotencyKey, resourceId: idempotencyResourceId });
    expect(await replayIdempotency({ ownerUserId: 91001, domain: "interview",
      operation: "session", key: idempotencyKey })).toBe(idempotencyResourceId);
    const raw = await actorQuery<{ key_hash: string }>(91001,
      "select key_hash from career_data_workflow_idempotency where resource_id=$1",
      [idempotencyResourceId],
    );
    expect(raw.rows[0]?.key_hash).not.toContain("sensitive");
  });

  it("refreshes an expired idempotency claim without overwriting an active claim", async () => {
    const key = `expired-fixture-key-${hostedRunId}`;
    await rememberIdempotency({ ownerUserId: 91001, domain: "interview",
      operation: "session", key, resourceId: idempotencyResourceId });
    await rememberIdempotency({ ownerUserId: 91001, domain: "interview",
      operation: "session", key, resourceId: expiredIdempotencyResourceId });
    expect(await replayIdempotency({ ownerUserId: 91001, domain: "interview",
      operation: "session", key })).toBe(idempotencyResourceId);
    await actorQuery(91001,
      "update career_data_workflow_idempotency set expires_at=now()-interval '1 second' where resource_id=$1",
      [idempotencyResourceId],
    );
    await rememberIdempotency({ ownerUserId: 91001, domain: "interview",
      operation: "session", key, resourceId: expiredIdempotencyResourceId });
    expect(await replayIdempotency({ ownerUserId: 91001, domain: "interview",
      operation: "session", key })).toBe(expiredIdempotencyResourceId);
  });

  it("keeps deterministic resources immutable and owner-bound exports short-lived", async () => {
    await persistWorkflowResource({ resourceId: "workflow_blocked_claim", ownerUserId: 91001,
      domain: "application", resourceType: "cv_claim_validation", parentSessionId: "workflow_cv_fixture",
      payload: { claimStatus: "blocked", automaticallyIncludable: false } });
    await expect(actorQuery(91001,
      "update career_data_workflow_resources set approval_state='approved' where workflow_resource_id=$1",
      ["workflow_blocked_claim"],
    )).rejects.toThrow("immutable_workflow_record");
    const exportId = await createWorkflowExport({ ownerUserId: 91001, domain: "application",
      parentSessionId: "workflow_cv_fixture", sourceResourceId: "workflow_blocked_claim",
      format: "structured_JSON", payload: { privateNotes: undefined, result: "fixture" } });
    expect(await getWorkflowExport(91001, "application", exportId)).toMatchObject({ result: "fixture" });
    expect(await getWorkflowExport(91002, "application", exportId)).toBeUndefined();
  });

  it("persists saved opportunities idempotently", async () => {
    const first = await saveOpportunity(91001, "workflow_job_fixture");
    const second = await saveOpportunity(91001, "workflow_job_fixture");
    expect(second).toBe(first);
  });
});
