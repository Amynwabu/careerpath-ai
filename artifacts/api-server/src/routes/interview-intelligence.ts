import { Router, type IRouter, type Request, type Response } from "express";
import {
  analyseInterviewSession,
  buildFollowUpQuestions,
  buildStarResponse,
  calculateInterviewReadiness,
  completePracticeSession,
  createInterviewSession,
  createPracticeSession,
  exportInterviewPack,
  generateCoachingFeedback,
  interviewProgress,
  premiumInterviewEntitlements,
  scoreAnswerCompleteness,
  standardInterviewEntitlements,
  type InterviewEntitlements,
  type InterviewSession,
  type StarResponse,
} from "@workspace/interview-intelligence";
import { requireAuth } from "../middlewares/auth";
import {
  createWorkflowExport, createWorkflowSession, getWorkflowExport, getWorkflowSession,
  listWorkflowSessions, persistWorkflowResource, rememberIdempotency, replayIdempotency,
  saveWorkflowSession,
} from "../lib/workflow-persistence-repository";
import { createReviewItem, listReviewItems } from "../lib/advisor-workspace-repository";
import { consumeQuota, currentQuotaPeriod } from "../lib/platform-operations";

const router: IRouter = Router();
router.use(requireAuth);

router.post("/interview-intelligence/sessions", async (req, res) => {
  await respondInterview(res, async () => {
    const owner = ownerId(req);
    const key = requireIdempotency(req);
    const replay = await replayIdempotency({ ownerUserId: ownerNumber(req), domain: "interview", operation: "session", key });
    if (replay) return { session: publicSession(await requireSession(replay, owner)), replayed: true, persistenceStatus: "persistent" };
    const session = createInterviewSession({
      ownerUserId: owner,
      profile: req.body?.profile,
      vacancy: req.body?.vacancy,
      matchResult: req.body?.matchResult,
      cvAnalysis: req.body?.cvAnalysis,
      tailoredDraft: req.body?.tailoredDraft,
      cvOptimisationSessionId: req.body?.cvOptimisationSessionId,
      interviewType: req.body?.interviewType,
      interviewDate: req.body?.interviewDate,
      formatConfirmed: req.body?.formatConfirmed,
    });
    await consumeInterviewQuota(req, "interview_sessions", key, 3, 25);
    await createWorkflowSession({ domain: "interview", ownerUserId: ownerNumber(req), sessionId: session.sessionId,
      status: session.status, payload: session, taxonomyVersion: session.vacancy.taxonomyVersion });
    await persistWorkflowResource({ resourceId: session.sessionId, ownerUserId: ownerNumber(req),
      domain: "interview", resourceType: "interview_session", parentSessionId: session.sessionId,
      payload: publicSession(session), recordVersion: session.recordVersion, taxonomyVersion: session.vacancy.taxonomyVersion });
    await rememberIdempotency({ ownerUserId: ownerNumber(req), domain: "interview", operation: "session", key, resourceId: session.sessionId });
    return { session: publicSession(session), replayed: false, persistenceStatus: "persistent" };
  });
});

router.get("/interview-intelligence/sessions", async (req, res) => {
  await respondInterview(res, async () => ({
    items: (await listWorkflowSessions<InterviewSession>("interview", ownerNumber(req))).map(publicSession),
    persistenceStatus: "persistent",
  }));
});

router.get("/interview-intelligence/sessions/:sessionId", async (req, res) => {
  await respondInterview(res, async () => ({
    session: publicSession(await requireSession(req.params.sessionId, ownerId(req))),
    persistenceStatus: "persistent",
  }));
});

router.patch("/interview-intelligence/sessions/:sessionId", async (req, res) => {
  await respondInterview(res, async () => {
    const session = await requireSession(req.params.sessionId, ownerId(req));
    const previousVersion = session.recordVersion;
    checkVersion(session.recordVersion, req);
    if (req.body?.interviewDate !== undefined) session.interviewDate = req.body.interviewDate;
    if (req.body?.formatConfirmed !== undefined) {
      session.interviewFormatStatus = req.body.formatConfirmed ? "confirmed" : "unconfirmed";
    }
    session.recordVersion += 1;
    session.updatedAt = new Date().toISOString();
    await saveInterview(req, session, previousVersion);
    return { session: publicSession(session), persistenceStatus: "persistent" };
  });
});

router.post("/interview-intelligence/sessions/:sessionId/analyse", async (req, res) => {
  await respondInterview(res, async () => {
    requireEntitlement(req, "canViewInterviewCompetencies");
    const session = await requireSession(req.params.sessionId, ownerId(req));
    const key = requireIdempotency(req);
    const replay = await replayIdempotency({ ownerUserId: ownerNumber(req), domain: "interview", operation: `analyse:${session.sessionId}`, key });
    if (replay) return { session: publicSession(session), replayed: true, persistenceStatus: "persistent" };
    const updated = analyseInterviewSession(session);
    await saveInterview(req, updated, session.recordVersion);
    for (const competency of updated.competencies) await persistWorkflowResource({
      resourceId: competency.competencyId, ownerUserId: ownerNumber(req), domain: "interview",
      resourceType: "interview_competency", parentSessionId: updated.sessionId, payload: competency,
      taxonomyVersion: updated.vacancy.taxonomyVersion,
    });
    for (const question of updated.questionPlan) await persistWorkflowResource({
      resourceId: question.questionId, ownerUserId: ownerNumber(req), domain: "interview",
      resourceType: "interview_question", parentSessionId: updated.sessionId, payload: question,
      taxonomyVersion: updated.vacancy.taxonomyVersion,
    });
    await rememberIdempotency({ ownerUserId: ownerNumber(req), domain: "interview", operation: `analyse:${session.sessionId}`, key, resourceId: updated.sessionId });
    return { session: publicSession(updated), replayed: false, persistenceStatus: "persistent" };
  });
});

router.get("/interview-intelligence/sessions/:sessionId/competencies", async (req, res) => {
  await respondInterview(res, async () => ({
    items: (await requireSession(req.params.sessionId, ownerId(req))).competencies,
    persistenceStatus: "persistent",
  }));
});

router.post("/interview-intelligence/sessions/:sessionId/question-plan", async (req, res) => {
  await respondInterview(res, async () => {
    requireEntitlement(req, "canGenerateQuestionPlan");
    const session = await requireSession(req.params.sessionId, ownerId(req));
    if (!session.questionPlan.length) throw coded("question_plan_unavailable");
    return { items: session.questionPlan, persistenceStatus: "persistent" };
  });
});

router.get("/interview-intelligence/sessions/:sessionId/questions", async (req, res) => {
  await respondInterview(res, async () => ({
    items: (await requireSession(req.params.sessionId, ownerId(req))).questionPlan,
    persistenceStatus: "persistent",
  }));
});

router.get("/interview-intelligence/questions/:questionId/evidence", async (req, res) => {
  await respondInterview(res, async () => {
    const session = await sessionForQuestion(req.params.questionId, ownerId(req));
    return {
      items: session.evidenceSelections
        .filter((item) => item.questionId === req.params.questionId)
        .map(({ sourceText: _sourceText, ...safe }) => safe),
      persistenceStatus: "persistent",
    };
  });
});

router.post("/interview-intelligence/questions/:questionId/responses", async (req, res) => {
  await respondInterview(res, async () => {
    requireEntitlement(req, "canBuildStarResponses");
    const session = await sessionForQuestion(req.params.questionId, ownerId(req));
    const previousVersion = session.recordVersion;
    const question = session.questionPlan.find((item) => item.questionId === req.params.questionId)!;
    const evidence = session.evidenceSelections.filter((item) => item.questionId === question.questionId);
    const response = buildStarResponse({
      question,
      evidence,
      framework: req.body?.framework,
      sections: req.body?.sections ?? {},
    });
    if (["unsupported", "conflicting"].includes(response.overallClaimStatus)) {
      throw Object.assign(new Error(response.overallClaimStatus), {
        code: response.overallClaimStatus === "conflicting"
          ? "conflicting_evidence"
          : "unsupported_claim_detected",
        response,
      });
    }
    session.responses.push(response);
    session.status = "practice_in_progress";
    session.recordVersion += 1;
    await saveInterview(req, session, previousVersion);
    await persistWorkflowResource({ resourceId: response.responseId, ownerUserId: ownerNumber(req),
      domain: "interview", resourceType: "interview_response", parentSessionId: session.sessionId,
      sourceRecordId: response.questionId, payload: response, recordVersion: response.recordVersion,
      taxonomyVersion: session.vacancy.taxonomyVersion });
    return { response, persistenceStatus: "persistent" };
  });
});

router.get("/interview-intelligence/questions/:questionId/responses", async (req, res) => {
  await respondInterview(res, async () => {
    const session = await sessionForQuestion(req.params.questionId, ownerId(req));
    const items = session.responses.filter((item) => item.questionId === req.params.questionId);
    return {
      items: entitlements(req).canViewInterviewHistory ? items : items.slice(-1),
      persistenceStatus: "persistent",
    };
  });
});

router.patch("/interview-intelligence/responses/:responseId", async (req, res) => {
  await respondInterview(res, async () => {
    const session = await sessionForResponse(req.params.responseId, ownerId(req));
    const previousVersion = session.recordVersion;
    const current = requireResponse(session, req.params.responseId);
    checkVersion(current.recordVersion, req);
    const question = session.questionPlan.find((item) => item.questionId === current.questionId)!;
    const next = buildStarResponse({
      question,
      evidence: session.evidenceSelections.filter((item) => item.questionId === current.questionId),
      framework: req.body?.framework ?? current.framework,
      sections: req.body?.sections ?? {},
    });
    if (["unsupported", "conflicting"].includes(next.overallClaimStatus)) {
      throw coded(next.overallClaimStatus === "conflicting" ? "conflicting_evidence" : "unsupported_claim_detected");
    }
    next.responseVersion = current.responseVersion + 1;
    session.responses.push(next);
    session.recordVersion += 1;
    await saveInterview(req, session, previousVersion);
    await persistWorkflowResource({ resourceId: next.responseId, ownerUserId: ownerNumber(req),
      domain: "interview", resourceType: "interview_response", parentSessionId: session.sessionId,
      sourceRecordId: current.responseId, payload: next, recordVersion: next.recordVersion,
      supersedesResourceId: current.responseId, taxonomyVersion: session.vacancy.taxonomyVersion });
    return { response: next, previousResponseId: current.responseId, persistenceStatus: "persistent" };
  });
});

router.post("/interview-intelligence/responses/:responseId/validate", async (req, res) => {
  await respondInterview(res, async () => {
    const session = await sessionForResponse(req.params.responseId, ownerId(req));
    const response = requireResponse(session, req.params.responseId);
    const question = session.questionPlan.find((item) => item.questionId === response.questionId)!;
    const evidence = session.evidenceSelections.filter((item) => item.questionId === response.questionId);
    const completeness = scoreAnswerCompleteness(response, question, evidence);
    return {
      valid: !["unsupported", "conflicting"].includes(response.overallClaimStatus),
      completeness,
      followUpQuestions: buildFollowUpQuestions(response, completeness),
    };
  });
});

router.post("/interview-intelligence/responses/:responseId/feedback", async (req, res) => {
  await respondInterview(res, async () => {
    requireEntitlement(req, "canViewDetailedFeedback");
    const session = await sessionForResponse(req.params.responseId, ownerId(req));
    const response = requireResponse(session, req.params.responseId);
    const question = session.questionPlan.find((item) => item.questionId === response.questionId)!;
    const completeness = scoreAnswerCompleteness(
      response,
      question,
      session.evidenceSelections.filter((item) => item.questionId === response.questionId),
    );
    return { completeness, feedback: generateCoachingFeedback(response, completeness) };
  });
});

router.post("/interview-intelligence/sessions/:sessionId/practice", async (req, res) => {
  await respondInterview(res, async () => {
    requireEntitlement(req, "canRunPracticeSession");
    if (req.body?.mode === "full_mock") requireEntitlement(req, "canRunFullMockInterview");
    const session = await requireSession(req.params.sessionId, ownerId(req));
    const previousVersion = session.recordVersion;
    const practice = createPracticeSession({
      interviewSessionId: session.sessionId,
      questions: session.questionPlan,
      mode: req.body?.mode ?? "guided",
    });
    await consumeInterviewQuota(req, "practice_sessions",
      String(req.headers["idempotency-key"] ?? `${session.sessionId}:${session.practiceSessions.length}`), 5, 100);
    session.practiceSessions.push(practice);
    session.recordVersion += 1;
    await saveInterview(req, session, previousVersion);
    await persistWorkflowResource({ resourceId: practice.practiceSessionId, ownerUserId: ownerNumber(req),
      domain: "interview", resourceType: "interview_practice", parentSessionId: session.sessionId,
      payload: practice, recordVersion: practice.recordVersion });
    return { practice, persistenceStatus: "persistent" };
  });
});

router.get("/interview-intelligence/sessions/:sessionId/practice", async (req, res) => {
  await respondInterview(res, async () => ({
    items: (await requireSession(req.params.sessionId, ownerId(req))).practiceSessions,
    persistenceStatus: "persistent",
  }));
});

router.get("/interview-intelligence/practice/:practiceSessionId", async (req, res) => {
  await respondInterview(res, async () => ({
    practice: (await requirePractice(req.params.practiceSessionId, ownerId(req))).practice,
    persistenceStatus: "persistent",
  }));
});

router.post("/interview-intelligence/practice/:practiceSessionId/complete", async (req, res) => {
  await respondInterview(res, async () => {
    const { session, practice } = await requirePractice(req.params.practiceSessionId, ownerId(req));
    const previousVersion = session.recordVersion;
    checkVersion(practice.recordVersion, req);
    const responses = session.responses.filter((item) => req.body?.responseIds?.includes(item.responseId));
    const completed = completePracticeSession(practice, responses, req.body?.scores ?? {}, req.body?.feedbackIds ?? []);
    session.practiceSessions = session.practiceSessions.map((item) =>
      item.practiceSessionId === completed.practiceSessionId ? completed : item,
    );
    session.recordVersion += 1;
    await saveInterview(req, session, previousVersion);
    return { practice: completed, persistenceStatus: "persistent" };
  });
});

router.post("/interview-intelligence/sessions/:sessionId/readiness", async (req, res) => {
  await respondInterview(res, async () => {
    const session = await requireSession(req.params.sessionId, ownerId(req));
    const previousVersion = session.recordVersion;
    const completeness = session.responses.map((response) => {
      const question = session.questionPlan.find((item) => item.questionId === response.questionId)!;
      return scoreAnswerCompleteness(response, question, session.evidenceSelections.filter((item) => item.questionId === response.questionId));
    });
    session.readiness = calculateInterviewReadiness({
      session,
      completeness,
      motivationSupplied: req.body?.motivationSupplied === true,
      candidateQuestionsPrepared: req.body?.candidateQuestionsPrepared === true,
      salaryRequired: req.body?.salaryRequired,
      salarySupplied: req.body?.salarySupplied,
      availabilityRequired: req.body?.availabilityRequired,
      availabilitySupplied: req.body?.availabilitySupplied,
      workAuthorisationRequired: req.body?.workAuthorisationRequired,
      workAuthorisationSupplied: req.body?.workAuthorisationSupplied,
    });
    session.recordVersion += 1;
    await saveInterview(req, session, previousVersion);
    if (session.readiness) await persistWorkflowResource({ resourceId: `interview_readiness_${crypto.randomUUID()}`,
      ownerUserId: ownerNumber(req), domain: "interview", resourceType: "interview_readiness",
      parentSessionId: session.sessionId, payload: session.readiness, taxonomyVersion: session.vacancy.taxonomyVersion });
    return { readiness: session.readiness, persistenceStatus: "persistent" };
  });
});

router.get("/interview-intelligence/sessions/:sessionId/progress", async (req, res) => {
  await respondInterview(res, async () => ({
    progress: interviewProgress(await requireSession(req.params.sessionId, ownerId(req))),
    persistenceStatus: "persistent",
  }));
});

router.post("/interview-intelligence/responses/:responseId/reviews", async (req, res) => {
  await respondInterview(res, async () => {
    await sessionForResponse(req.params.responseId, ownerId(req));
    const caseId = String(req.body?.caseId ?? "");
    if (!caseId) throw coded("advisor_scope_required");
    const review = await createReviewItem({
      actor: { userId: ownerNumber(req), role: "client" }, caseId,
      resourceType: "interview_response", resourceId: req.params.responseId,
      reviewType: String(req.body?.reviewType ?? "response_review"),
      priority: String(req.body?.priority ?? "standard"),
      idempotencyKey: requireIdempotency(req),
    });
    await consumeInterviewQuota(req, "advisor_requests", String(req.headers["idempotency-key"]), 1, 10);
    return { review, persistenceStatus: "persistent" };
  });
});

router.get("/interview-intelligence/responses/:responseId/reviews", async (req, res) => {
  await respondInterview(res, async () => {
    await sessionForResponse(req.params.responseId, ownerId(req));
    const caseId = String(req.query.caseId ?? "");
    if (!caseId) return { items: [], advisorWorkflowStatus: "case_link_required" };
    const items = (await listReviewItems({ userId: ownerNumber(req), role: "client" }, caseId))
      .filter((item) => item.resourceType === "interview_response" && item.resourceId === req.params.responseId);
    return { items, advisorWorkflowStatus: "persistent_source_ready", persistenceStatus: "persistent" };
  });
});

router.post("/interview-intelligence/sessions/:sessionId/export", async (req, res) => {
  await respondInterview(res, async () => {
    requireEntitlement(req, "canExportInterviewPack");
    const session = await requireSession(req.params.sessionId, ownerId(req));
    const key = requireIdempotency(req);
    const replay = await replayIdempotency({ ownerUserId: ownerNumber(req), domain: "interview", operation: `export:${session.sessionId}`, key });
    if (replay) return { export: await getWorkflowExport(ownerNumber(req), "interview", replay), replayed: true, persistenceStatus: "persistent" };
    const record = { exportId: "", ownerUserId: ownerId(req), pack: exportInterviewPack(session) };
    record.exportId = await createWorkflowExport({ ownerUserId: ownerNumber(req), domain: "interview",
      parentSessionId: session.sessionId, format: "structured_JSON", payload: record });
    await rememberIdempotency({ ownerUserId: ownerNumber(req), domain: "interview",
      operation: `export:${session.sessionId}`, key, resourceId: record.exportId });
    return { export: record, replayed: false, persistenceStatus: "persistent" };
  });
});

router.get("/interview-intelligence/exports/:exportId", async (req, res) => {
  await respondInterview(res, async () => {
    const record = await getWorkflowExport(ownerNumber(req), "interview", req.params.exportId);
    if (!record) throw coded("resource_not_found");
    return { export: record, persistenceStatus: "persistent" };
  });
});

export async function respondInterview(res: Response, operation: () => Promise<unknown>) {
  try {
    res.json(await operation());
  } catch (error) {
    const code = String((error as { code?: string })?.code ?? "question_plan_unavailable");
    const status = code === "resource_not_found" ? 404
      : code === "entitlement_required" || code === "advisor_scope_required" ? 403
        : code === "record_version_conflict" ? 409 : 400;
    res.status(status).json({ code, error: safeMessage(code) });
  }
}

function publicSession(session: InterviewSession) {
  const { profile: _profile, ...safe } = session;
  return {
    ...safe,
    evidenceSelections: safe.evidenceSelections.map(({ sourceText: _sourceText, ...item }) => item),
  };
}

async function requireSession(id: string, owner: string) {
  const session = await getWorkflowSession<InterviewSession>("interview", Number(owner), id);
  if (!session || session.ownerUserId !== owner) throw coded("resource_not_found");
  return session;
}
async function sessionForQuestion(id: string, owner: string) {
  const session = (await listWorkflowSessions<InterviewSession>("interview", Number(owner))).find((item) => item.ownerUserId === owner && item.questionPlan.some((question) => question.questionId === id));
  if (!session) throw coded("resource_not_found");
  return session;
}
async function sessionForResponse(id: string, owner: string) {
  const session = (await listWorkflowSessions<InterviewSession>("interview", Number(owner))).find((item) => item.ownerUserId === owner && item.responses.some((response) => response.responseId === id));
  if (!session) throw coded("resource_not_found");
  return session;
}
function requireResponse(session: InterviewSession, id: string): StarResponse {
  const response = session.responses.find((item) => item.responseId === id);
  if (!response) throw coded("resource_not_found");
  return response;
}
async function requirePractice(id: string, owner: string) {
  const session = (await listWorkflowSessions<InterviewSession>("interview", Number(owner))).find((item) => item.ownerUserId === owner && item.practiceSessions.some((practice) => practice.practiceSessionId === id));
  if (!session) throw coded("resource_not_found");
  return { session, practice: session.practiceSessions.find((item) => item.practiceSessionId === id)! };
}
function ownerId(req: Request) { return String(req.user!.userId); }
function ownerNumber(req: Request) { return req.user!.userId; }
async function consumeInterviewQuota(
  req: Request, dimension: string, key: string, standard: number, premium: number,
) {
  const period = currentQuotaPeriod();
  const plan = req.headers["x-cpx-membership"] === "premium" ? "premium" : "standard";
  return consumeQuota({ ownerUserId: ownerNumber(req), dimension,
    limit: plan === "premium" ? premium : standard, ...period,
    idempotencyKey: `${dimension}:${key}`, entitlementSnapshot: { plan } });
}
async function saveInterview(req: Request, session: InterviewSession, expectedVersion: number) {
  return saveWorkflowSession({ domain: "interview", ownerUserId: ownerNumber(req),
    sessionId: session.sessionId, status: session.status, expectedVersion, payload: session });
}
function entitlements(req: Request) {
  return req.headers["x-cpx-membership"] === "premium" ? premiumInterviewEntitlements : standardInterviewEntitlements;
}
function requireEntitlement(req: Request, key: keyof InterviewEntitlements) {
  if (!entitlements(req)[key]) throw coded("entitlement_required");
}
function requireIdempotency(req: Request) {
  const key = req.headers["idempotency-key"];
  if (typeof key !== "string" || !key.trim()) throw coded("idempotency_key_required");
  return key.trim();
}
function checkVersion(current: number, req: Request) {
  if (Number(req.headers["if-match"]) !== current) throw coded("record_version_conflict");
}
function coded(code: string) { return Object.assign(new Error(code), { code }); }
function safeMessage(code: string) {
  return ({
    profile_invalid: "The Career Profile is invalid.",
    vacancy_expired: "The selected vacancy has expired.",
    vacancy_unresolved: "The vacancy is not mapped to a published taxonomy.",
    question_plan_unavailable: "The question plan is unavailable.",
    insufficient_evidence: "Additional confirmed evidence is required.",
    unsupported_claim_detected: "The answer contains an unsupported claim.",
    conflicting_evidence: "The answer conflicts with source evidence.",
    advisor_scope_required: "An active advisor grant with the required scope is required.",
    entitlement_required: "This feature is not included in the active membership.",
    record_version_conflict: "The record changed; reload before updating.",
    practice_session_invalid: "The practice session is incomplete or invalid.",
    resource_not_found: "The requested record was not found.",
    idempotency_key_required: "Idempotency-Key is required.",
    persistent_store_unavailable: "Interview preparation requires the persistent production store.",
  } as Record<string, string>)[code] ?? "Interview request failed.";
}
export const interviewTestStore = {
  records: new Map<string, InterviewSession>(),
  reset() { this.records.clear(); },
  seed(session: InterviewSession) { this.records.set(session.sessionId, session); },
  get(id: string, owner: string) {
    const session = this.records.get(id);
    if (!session || session.ownerUserId !== owner) throw coded("resource_not_found");
    return session;
  },
};
export default router;
