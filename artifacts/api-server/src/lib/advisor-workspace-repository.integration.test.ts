import { afterAll, describe, expect, it } from "vitest";
import { pool } from "@workspace/db";
import {
  acceptCase,
  createCase,
  createSession,
  createSessionNote,
  getCase,
  listVisibleSessionNotes,
  transitionAdvisorCase,
} from "./advisor-workspace-repository";

const run = process.env.ADVISOR_DB_INTEGRATION === "1" ? describe : describe.skip;

run("persistent advisor workspace repository", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("creates a durable case and safely replays the same idempotency key", async () => {
    const input = {
      ownerUserId: 91001,
      advisorUserId: 91003,
      advisorGrantId: "grant_active",
      serviceType: "fixture_support",
      idempotencyKey: "case-create-fixture-1",
    };
    const first = await createCase(input);
    const second = await createCase(input);
    expect(second.id).toBe(first.id);
    expect(first.caseStatus).toBe("pending_acceptance");
  });

  it.each([
    ["grant_expired", "advisor_grant_expired"],
    ["grant_revoked", "advisor_grant_required"],
    ["grant_scope_missing", "advisor_scope_insufficient"],
  ])("rejects invalid grant %s", async (advisorGrantId, code) => {
    await expect(createCase({
      ownerUserId: 91001, advisorUserId: 91003, advisorGrantId,
      serviceType: "fixture_support", idempotencyKey: `invalid-${advisorGrantId}`,
    })).rejects.toMatchObject({ code });
  });

  it("enforces lifecycle, assignment, and optimistic concurrency", async () => {
    const created = await createCase({
      ownerUserId: 91001, advisorUserId: 91003, advisorGrantId: "grant_active",
      serviceType: "fixture_support", idempotencyKey: "case-lifecycle-fixture",
    });
    const active = await acceptCase({
      actor: { userId: 91003, role: "advisor" },
      caseId: created.id, expectedVersion: created.recordVersion,
    });
    expect(active.caseStatus).toBe("active");
    await expect(acceptCase({
      actor: { userId: 91003, role: "advisor" },
      caseId: created.id, expectedVersion: 1,
    })).rejects.toMatchObject({ code: "record_version_conflict" });
    await expect(getCase({ userId: 91004, role: "advisor" }, created.id))
      .rejects.toMatchObject({ code: "resource_not_found" });
  });

  it("filters advisor-private notes for clients independently of RLS", async () => {
    const session = await createSession({
      actor: { userId: 91003, role: "advisor" }, caseId: "case_active",
      sessionType: "fixture", deliveryMode: "remote",
      idempotencyKey: "session-note-fixture",
    });
    await createSessionNote({
      actor: { userId: 91003, role: "advisor" }, caseId: "case_active",
      sessionId: session.id, noteType: "advisor_private",
      visibilityScope: "advisor_private", content: "<script>fixture</script>private",
    });
    await createSessionNote({
      actor: { userId: 91003, role: "advisor" }, caseId: "case_active",
      sessionId: session.id, noteType: "client_visible",
      visibilityScope: "client_and_advisor", content: "shared",
    });
    const clientNotes = await listVisibleSessionNotes(
      { userId: 91001, role: "client" }, "case_active", session.id,
    );
    expect(clientNotes).toHaveLength(1);
    expect(clientNotes[0]?.visibilityScope).toBe("client_and_advisor");
  });
});
