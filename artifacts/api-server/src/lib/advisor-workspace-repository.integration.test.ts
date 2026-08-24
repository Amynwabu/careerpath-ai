import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import {
  acceptCase,
  buildAdvisorCaseExport,
  cancelFollowUp,
  completeFollowUp,
  completeSession,
  confirmSession,
  createAction,
  createCase,
  createComment,
  createEvidenceRequest,
  createFollowUp,
  createOutcome,
  createPlacement,
  createReviewItem,
  createSession,
  createSessionNote,
  deferAction,
  getCase,
  getFollowUp,
  listCaseActions,
  listComments,
  listOutcomes,
  listPlacements,
  listSessionSummaries,
  listVisibleSessionNotes,
  markActionCompleted,
  publishSessionSummary,
  requestEvidenceClarification,
  resolveReviewItem,
  reviewEvidence,
  startEvidenceReview,
  startSession,
  submitAdvisorDecision,
  submitClientDecision,
  submitEvidence,
  transitionAdvisorCase,
  transitionActionRecord,
  updateAction,
  verifyAction,
} from "./advisor-workspace-repository";
import { actorQuery } from "./database-actor-context";
import { assertRestrictedHostedRole } from "./hosted-test-readiness";

const run = process.env.ADVISOR_DB_INTEGRATION === "1" ? describe : describe.skip;
const hostedRunId = randomUUID();

run("persistent advisor workspace repository", () => {
  beforeAll(async () => assertRestrictedHostedRole(pool));

  afterAll(async () => {
    await pool.end();
  });

  it("creates a durable case and safely replays the same idempotency key", async () => {
    const input = {
      ownerUserId: 91001,
      advisorUserId: 91003,
      advisorGrantId: "grant_active",
      serviceType: "fixture_support",
      idempotencyKey: `case-create-fixture-1-${hostedRunId}`,
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
      serviceType: "fixture_support", idempotencyKey: `invalid-${advisorGrantId}-${hostedRunId}`,
    })).rejects.toMatchObject({ code });
  });

  it("enforces lifecycle, assignment, and optimistic concurrency", async () => {
    const created = await createCase({
      ownerUserId: 91001, advisorUserId: 91003, advisorGrantId: "grant_active",
      serviceType: "fixture_support", idempotencyKey: `case-lifecycle-fixture-${hostedRunId}`,
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
      idempotencyKey: `session-note-fixture-${hostedRunId}`,
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

  it("separates client action completion from advisor verification", async () => {
    const action = await createAction({
      actor: { userId: 91003, role: "advisor" }, caseId: "case_active",
      assignedTo: "client", actionType: "prepare", title: "Fixture action",
      description: "Complete the fixture", priority: "high",
      completionEvidenceRequired: true, idempotencyKey: `action-fixture-${hostedRunId}`,
    });
    expect((await listCaseActions({ userId: 91001, role: "client" }, "case_active"))
      .some((item) => item.id === action.id)).toBe(true);
    const started = await transitionActionRecord({
      actor: { userId: 91001, role: "client" }, actionId: action.id,
      expectedVersion: action.recordVersion, nextStatus: "in_progress",
    });
    const completed = await markActionCompleted({
      actor: { userId: 91001, role: "client" }, actionId: action.id,
      expectedVersion: started.recordVersion, completionInformation: "Evidence submitted",
    });
    expect(completed.status).toBe("completed");
    await expect(verifyAction({
      actor: { userId: 91001, role: "client" }, actionId: action.id,
      expectedVersion: completed.recordVersion,
    })).rejects.toMatchObject({ code: "advisor_verification_required" });
    const verified = await verifyAction({
      actor: { userId: 91003, role: "advisor" }, actionId: action.id,
      expectedVersion: completed.recordVersion,
    });
    expect(verified.status).toBe("verified");
    await expect(updateAction({
      actor: { userId: 91001, role: "client" }, actionId: action.id,
      expectedVersion: 1, title: "stale",
    })).rejects.toMatchObject({ code: "record_version_conflict" });
    await expect(deferAction({
      actor: { userId: 91004, role: "advisor" }, actionId: action.id,
      expectedVersion: verified.recordVersion, reason: "wrong advisor",
    })).rejects.toMatchObject({ code: "resource_not_found" });
  });

  it("keeps evidence review governed as advisor-reviewed", async () => {
    const request = await createEvidenceRequest({
      actor: { userId: 91003, role: "advisor" }, caseId: "case_active",
      evidenceType: "document", description: "Provide supporting evidence",
      dueAt: new Date("2026-08-01T00:00:00Z"), idempotencyKey: `evidence-request-fixture-${hostedRunId}`,
    });
    const submitted = await submitEvidence({
      actor: { userId: 91001, role: "client" }, requestId: request.id,
      expectedVersion: request.recordVersion, submittedEvidenceId: "evidence_fixture",
    });
    const reviewing = await startEvidenceReview({
      actor: { userId: 91003, role: "advisor" }, requestId: request.id,
      expectedVersion: submitted.recordVersion,
    });
    const reviewed = await reviewEvidence({
      actor: { userId: 91003, role: "advisor" }, requestId: request.id,
      expectedVersion: reviewing.recordVersion,
      reviewDecision: "accepted_with_limitations", reviewNotes: "<script>x</script>Limited",
    });
    expect(reviewed.status).toBe("accepted");
    expect(reviewed.reviewVerificationStatus).toBe("advisor_reviewed");
    expect(reviewed.reviewNotes).not.toContain("<script>");
    await expect(createEvidenceRequest({
      actor: { userId: 91003, role: "advisor" }, caseId: "case_scope_missing",
      evidenceType: "document", description: "scope fail",
      idempotencyKey: `scope-mismatch-evidence-${hostedRunId}`,
    })).rejects.toMatchObject({ code: "resource_not_found" });
  }, 15_000);

  it("persists durable reviews and rejects missing cross-domain sources", async () => {
    await expect(createReviewItem({
      actor: { userId: 91003, role: "advisor" }, caseId: "case_active",
      resourceType: "cv_draft", resourceId: "process_local_cv",
      reviewType: "approval", priority: "high", idempotencyKey: `cv-review-denied-${hostedRunId}`,
    })).rejects.toMatchObject({ code: "shared_resource_required" });
    await actorQuery(91001,
      `INSERT INTO career_data_workflow_resources
       (workflow_resource_id,owner_user_id,domain,resource_type,parent_session_id,
        source_version,engine_version,taxonomy_version,content_hash,payload,created_by)
       VALUES ('reviewable_cv_draft',91001,'application','cv_draft','fixture_session',
               '1','fixture','2026.1','fixture_review_hash','{"claimStatus":"supported"}',91001)
       ON CONFLICT DO NOTHING`,
    );
    await actorQuery(91003,
      `INSERT INTO career_data_advisor_case_resources
       (case_resource_id,case_id,owner_user_id,resource_type,resource_id,required_scope,created_by)
       VALUES ('reviewable_cv_link','case_active',91001,'cv_draft','reviewable_cv_draft','cv_review',91003)
       ON CONFLICT DO NOTHING`,
    );
    const crossDomainReview = await createReviewItem({
      actor: { userId: 91003, role: "advisor" }, caseId: "case_active",
      resourceType: "cv_draft", resourceId: "reviewable_cv_draft",
      reviewType: "draft_review", priority: "standard", idempotencyKey: `persistent-cv-review-${hostedRunId}`,
    });
    expect(crossDomainReview.status).toBe("awaiting_advisor");
    const review = await createReviewItem({
      actor: { userId: 91003, role: "advisor" }, caseId: "case_active",
      resourceType: "career_profile", resourceId: "career_profile_fixture",
      reviewType: "profile_review", priority: "standard", idempotencyKey: `profile-review-fixture-${hostedRunId}`,
    });
    const advisorDecision = await submitAdvisorDecision({
      actor: { userId: 91003, role: "advisor" }, reviewId: review.id,
      expectedVersion: review.recordVersion, advisorDecision: "changes_requested",
      decisionReason: "Add evidence", idempotencyKey: `advisor-decision-fixture-${hostedRunId}`,
    });
    const clientDecision = await submitClientDecision({
      actor: { userId: 91001, role: "client" }, reviewId: review.id,
      expectedVersion: advisorDecision.recordVersion, clientDecision: "updated",
      idempotencyKey: `client-decision-fixture-${hostedRunId}`,
    });
    const resolved = await resolveReviewItem({
      actor: { userId: 91003, role: "advisor" }, reviewId: review.id,
      expectedVersion: clientDecision.recordVersion, decisionReason: "Resolved",
    });
    expect(resolved.status).toBe("resolved");
    expect(resolved.advisorDecision).toBe("changes_requested");
    expect(resolved.clientDecision).toBe("updated");

    const shared = await createComment({
      actor: { userId: 91003, role: "advisor" }, reviewId: review.id,
      visibilityScope: "client_and_advisor", content: "<script>alert(1)</script>Shared",
    });
    await createComment({
      actor: { userId: 91003, role: "advisor" }, reviewId: review.id,
      visibilityScope: "advisor_private", content: "Private",
    });
    const clientComments = await listComments({ userId: 91001, role: "client" }, review.id);
    expect(clientComments).toHaveLength(1);
    expect(clientComments[0]?.id).toBe(shared.id);
    expect(clientComments[0]?.content).not.toContain("<script>");
  }, 15_000);

  it("records outcomes and optional-salary placements without inference", async () => {
    const outcome = await createOutcome({
      actor: { userId: 91001, role: "client" }, caseId: "case_active",
      outcomeType: "training_started", outcomeDate: new Date("2026-07-25T00:00:00Z"),
      verificationStatus: "self_reported", idempotencyKey: `outcome-fixture-${hostedRunId}`,
    });
    expect(outcome.verificationStatus).toBe("self_reported");
    const placement = await createPlacement({
      actor: { userId: 91001, role: "client" }, caseId: "case_active",
      employerName: "Fixture employer", roleTitle: "Fixture role",
      offerStatus: "accepted", verificationStatus: "self_reported",
      idempotencyKey: `placement-fixture-${hostedRunId}`,
    });
    expect(placement.salaryAmount).toBeNull();
    expect((await listOutcomes({ userId: 91001, role: "client" }, "case_active"))
      .some((item) => item.id === outcome.id)).toBe(true);
    expect((await listPlacements({ userId: 91001, role: "client" }, "case_active"))
      .some((item) => item.id === placement.id)).toBe(true);
  });

  it("calculates and transitions follow-ups with an injected clock", async () => {
    const now = new Date("2026-07-25T12:00:00Z");
    const followUp = await createFollowUp({
      actor: { userId: 91003, role: "advisor" }, caseId: "case_active",
      followUpType: "progress_review", dueAt: new Date("2026-07-24T12:00:00Z"),
      idempotencyKey: `follow-up-fixture-${hostedRunId}`, now,
    });
    expect(followUp.calculatedStatus).toBe("overdue");
    const completed = await completeFollowUp({
      actor: { userId: 91003, role: "advisor" }, followUpId: followUp.id,
      expectedVersion: followUp.recordVersion, now,
    });
    expect(completed.calculatedStatus).toBe("completed");
    await expect(cancelFollowUp({
      actor: { userId: 91003, role: "advisor" }, followUpId: followUp.id,
      expectedVersion: completed.recordVersion, now,
    })).rejects.toMatchObject({ code: "invalid_follow_up_transition" });
    expect((await getFollowUp({ userId: 91001, role: "client" }, followUp.id, now)).calculatedStatus).toBe("completed");
  });

  it("enforces session transitions and immutable summary versions", async () => {
    const session = await createSession({
      actor: { userId: 91003, role: "advisor" }, caseId: "case_active",
      sessionType: "review", deliveryMode: "remote",
      scheduledStart: new Date("2026-07-26T12:00:00Z"),
      idempotencyKey: `detailed-session-fixture-${hostedRunId}`,
    });
    const confirmed = await confirmSession({
      actor: { userId: 91003, role: "advisor" }, sessionId: session.id,
      expectedVersion: session.recordVersion,
    });
    const started = await startSession({
      actor: { userId: 91003, role: "advisor" }, sessionId: session.id,
      expectedVersion: confirmed.recordVersion,
    });
    const completed = await completeSession({
      actor: { userId: 91003, role: "advisor" }, sessionId: session.id,
      expectedVersion: started.recordVersion,
    });
    expect(completed.sessionStatus).toBe("completed");
    const first = await publishSessionSummary({
      actor: { userId: 91003, role: "advisor" }, caseId: "case_active",
      sessionId: session.id, summaryVersion: 1, sessionObjective: "Review",
      clientVisibleSummary: "Shared summary", idempotencyKey: `summary-one-fixture-${hostedRunId}`,
    });
    const second = await publishSessionSummary({
      actor: { userId: 91003, role: "advisor" }, caseId: "case_active",
      sessionId: session.id, summaryVersion: 2, sessionObjective: "Correction",
      clientVisibleSummary: "Corrected summary", supersedesSummaryId: first.id,
      idempotencyKey: `summary-two-fixture-${hostedRunId}`,
    });
    expect(second.supersedesSummaryId).toBe(first.id);
    expect(await listSessionSummaries({ userId: 91001, role: "client" }, session.id)).toHaveLength(2);
  });

  it("builds privacy-filtered exports only from durable shared records", async () => {
    const exported = await buildAdvisorCaseExport({
      actor: { userId: 91001, role: "client" }, caseId: "case_active",
      format: "case_progress_summary",
    });
    expect(exported.exclusions).toContain("advisor_private_notes");
    expect(exported.exclusions).toContain("process_local_cv_records");
    expect(JSON.stringify(exported)).not.toContain("fixture private");
    expect(exported).not.toHaveProperty("auditEvents");
    expect(JSON.stringify(exported)).not.toContain("advisor_event_");
  });
});
