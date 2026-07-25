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

const router: IRouter = Router();
router.use(requireAuth);
router.use(requireNonProductionWorkflow);
const sessions = new Map<string, InterviewSession>();
const idempotency = new Map<string, string>();
const exports = new Map<string, { exportId: string; ownerUserId: string; pack: unknown }>();

router.post("/interview-intelligence/sessions", async (req, res) => {
  await respondInterview(res, async () => {
    const owner = ownerId(req);
    const key = requireIdempotency(req);
    const replay = idempotency.get(`${owner}:session:${key}`);
    if (replay) return { session: publicSession(requireSession(replay, owner)), replayed: true };
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
    sessions.set(session.sessionId, session);
    idempotency.set(`${owner}:session:${key}`, session.sessionId);
    return { session: publicSession(session), replayed: false, persistenceStatus: "process_local" };
  });
});

router.get("/interview-intelligence/sessions", async (req, res) => {
  await respondInterview(res, async () => ({
    items: [...sessions.values()].filter((item) => item.ownerUserId === ownerId(req)).map(publicSession),
    persistenceStatus: "process_local",
  }));
});

router.get("/interview-intelligence/sessions/:sessionId", async (req, res) => {
  await respondInterview(res, async () => ({
    session: publicSession(requireSession(req.params.sessionId, ownerId(req))),
    persistenceStatus: "process_local",
  }));
});

router.patch("/interview-intelligence/sessions/:sessionId", async (req, res) => {
  await respondInterview(res, async () => {
    const session = requireSession(req.params.sessionId, ownerId(req));
    checkVersion(session.recordVersion, req);
    if (req.body?.interviewDate !== undefined) session.interviewDate = req.body.interviewDate;
    if (req.body?.formatConfirmed !== undefined) {
      session.interviewFormatStatus = req.body.formatConfirmed ? "confirmed" : "unconfirmed";
    }
    session.recordVersion += 1;
    session.updatedAt = new Date().toISOString();
    return { session: publicSession(session), persistenceStatus: "process_local" };
  });
});

router.post("/interview-intelligence/sessions/:sessionId/analyse", async (req, res) => {
  await respondInterview(res, async () => {
    requireEntitlement(req, "canViewInterviewCompetencies");
    const session = requireSession(req.params.sessionId, ownerId(req));
    const key = requireIdempotency(req);
    const replayKey = `${ownerId(req)}:analyse:${session.sessionId}:${key}`;
    if (idempotency.has(replayKey)) return { session: publicSession(session), replayed: true };
    const updated = analyseInterviewSession(session);
    sessions.set(updated.sessionId, updated);
    idempotency.set(replayKey, updated.sessionId);
    return { session: publicSession(updated), replayed: false, persistenceStatus: "process_local" };
  });
});

router.get("/interview-intelligence/sessions/:sessionId/competencies", async (req, res) => {
  await respondInterview(res, async () => ({
    items: requireSession(req.params.sessionId, ownerId(req)).competencies,
    persistenceStatus: "process_local",
  }));
});

router.post("/interview-intelligence/sessions/:sessionId/question-plan", async (req, res) => {
  await respondInterview(res, async () => {
    requireEntitlement(req, "canGenerateQuestionPlan");
    const session = requireSession(req.params.sessionId, ownerId(req));
    if (!session.questionPlan.length) throw coded("question_plan_unavailable");
    return { items: session.questionPlan, persistenceStatus: "process_local" };
  });
});

router.get("/interview-intelligence/sessions/:sessionId/questions", async (req, res) => {
  await respondInterview(res, async () => ({
    items: requireSession(req.params.sessionId, ownerId(req)).questionPlan,
    persistenceStatus: "process_local",
  }));
});

router.get("/interview-intelligence/questions/:questionId/evidence", async (req, res) => {
  await respondInterview(res, async () => {
    const session = sessionForQuestion(req.params.questionId, ownerId(req));
    return {
      items: session.evidenceSelections
        .filter((item) => item.questionId === req.params.questionId)
        .map(({ sourceText: _sourceText, ...safe }) => safe),
      persistenceStatus: "process_local",
    };
  });
});

router.post("/interview-intelligence/questions/:questionId/responses", async (req, res) => {
  await respondInterview(res, async () => {
    requireEntitlement(req, "canBuildStarResponses");
    const session = sessionForQuestion(req.params.questionId, ownerId(req));
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
    return { response, persistenceStatus: "process_local" };
  });
});

router.get("/interview-intelligence/questions/:questionId/responses", async (req, res) => {
  await respondInterview(res, async () => {
    const session = sessionForQuestion(req.params.questionId, ownerId(req));
    const items = session.responses.filter((item) => item.questionId === req.params.questionId);
    return {
      items: entitlements(req).canViewInterviewHistory ? items : items.slice(-1),
      persistenceStatus: "process_local",
    };
  });
});

router.patch("/interview-intelligence/responses/:responseId", async (req, res) => {
  await respondInterview(res, async () => {
    const session = sessionForResponse(req.params.responseId, ownerId(req));
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
    return { response: next, previousResponseId: current.responseId, persistenceStatus: "process_local" };
  });
});

router.post("/interview-intelligence/responses/:responseId/validate", async (req, res) => {
  await respondInterview(res, async () => {
    const session = sessionForResponse(req.params.responseId, ownerId(req));
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
    const session = sessionForResponse(req.params.responseId, ownerId(req));
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
    const session = requireSession(req.params.sessionId, ownerId(req));
    const practice = createPracticeSession({
      interviewSessionId: session.sessionId,
      questions: session.questionPlan,
      mode: req.body?.mode ?? "guided",
    });
    session.practiceSessions.push(practice);
    return { practice, persistenceStatus: "process_local" };
  });
});

router.get("/interview-intelligence/sessions/:sessionId/practice", async (req, res) => {
  await respondInterview(res, async () => ({
    items: requireSession(req.params.sessionId, ownerId(req)).practiceSessions,
    persistenceStatus: "process_local",
  }));
});

router.get("/interview-intelligence/practice/:practiceSessionId", async (req, res) => {
  await respondInterview(res, async () => ({
    practice: requirePractice(req.params.practiceSessionId, ownerId(req)).practice,
    persistenceStatus: "process_local",
  }));
});

router.post("/interview-intelligence/practice/:practiceSessionId/complete", async (req, res) => {
  await respondInterview(res, async () => {
    const { session, practice } = requirePractice(req.params.practiceSessionId, ownerId(req));
    checkVersion(practice.recordVersion, req);
    const responses = session.responses.filter((item) => req.body?.responseIds?.includes(item.responseId));
    const completed = completePracticeSession(practice, responses, req.body?.scores ?? {}, req.body?.feedbackIds ?? []);
    session.practiceSessions = session.practiceSessions.map((item) =>
      item.practiceSessionId === completed.practiceSessionId ? completed : item,
    );
    return { practice: completed, persistenceStatus: "process_local" };
  });
});

router.post("/interview-intelligence/sessions/:sessionId/readiness", async (req, res) => {
  await respondInterview(res, async () => {
    const session = requireSession(req.params.sessionId, ownerId(req));
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
    return { readiness: session.readiness, persistenceStatus: "process_local" };
  });
});

router.get("/interview-intelligence/sessions/:sessionId/progress", async (req, res) => {
  await respondInterview(res, async () => ({
    progress: interviewProgress(requireSession(req.params.sessionId, ownerId(req))),
    persistenceStatus: "process_local",
  }));
});

router.post("/interview-intelligence/responses/:responseId/reviews", async (req, res) => {
  await respondInterview(res, async () => {
    sessionForResponse(req.params.responseId, ownerId(req));
    throw coded("advisor_scope_required");
  });
});

router.get("/interview-intelligence/responses/:responseId/reviews", async (req, res) => {
  await respondInterview(res, async () => {
    sessionForResponse(req.params.responseId, ownerId(req));
    return { items: [], advisorWorkflowStatus: "requires_persistent_scoped_grant" };
  });
});

router.post("/interview-intelligence/sessions/:sessionId/export", async (req, res) => {
  await respondInterview(res, async () => {
    requireEntitlement(req, "canExportInterviewPack");
    const session = requireSession(req.params.sessionId, ownerId(req));
    const key = requireIdempotency(req);
    const replayKey = `${ownerId(req)}:export:${session.sessionId}:${key}`;
    const replay = idempotency.get(replayKey);
    if (replay) return { export: exports.get(replay), replayed: true };
    const exportId = `interview_export_${crypto.randomUUID()}`;
    const record = { exportId, ownerUserId: ownerId(req), pack: exportInterviewPack(session) };
    exports.set(exportId, record);
    idempotency.set(replayKey, exportId);
    return { export: record, replayed: false, persistenceStatus: "process_local" };
  });
});

router.get("/interview-intelligence/exports/:exportId", async (req, res) => {
  await respondInterview(res, async () => {
    const record = exports.get(req.params.exportId);
    if (!record || record.ownerUserId !== ownerId(req)) throw coded("resource_not_found");
    return { export: record, persistenceStatus: "process_local" };
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

function requireNonProductionWorkflow(
  _req: Request,
  res: Response,
  next: () => void,
) {
  if (process.env.NODE_ENV === "production") {
    res.status(503).json({
      code: "persistent_store_unavailable",
      error: "Interview preparation requires the persistent production store.",
    });
    return;
  }
  next();
}

function publicSession(session: InterviewSession) {
  const { profile: _profile, ...safe } = session;
  return {
    ...safe,
    evidenceSelections: safe.evidenceSelections.map(({ sourceText: _sourceText, ...item }) => item),
  };
}

function requireSession(id: string, owner: string) {
  const session = sessions.get(id);
  if (!session || session.ownerUserId !== owner) throw coded("resource_not_found");
  return session;
}
function sessionForQuestion(id: string, owner: string) {
  const session = [...sessions.values()].find((item) => item.ownerUserId === owner && item.questionPlan.some((question) => question.questionId === id));
  if (!session) throw coded("resource_not_found");
  return session;
}
function sessionForResponse(id: string, owner: string) {
  const session = [...sessions.values()].find((item) => item.ownerUserId === owner && item.responses.some((response) => response.responseId === id));
  if (!session) throw coded("resource_not_found");
  return session;
}
function requireResponse(session: InterviewSession, id: string): StarResponse {
  const response = session.responses.find((item) => item.responseId === id);
  if (!response) throw coded("resource_not_found");
  return response;
}
function requirePractice(id: string, owner: string) {
  const session = [...sessions.values()].find((item) => item.ownerUserId === owner && item.practiceSessions.some((practice) => practice.practiceSessionId === id));
  if (!session) throw coded("resource_not_found");
  return { session, practice: session.practiceSessions.find((item) => item.practiceSessionId === id)! };
}
function ownerId(req: Request) { return String(req.user!.userId); }
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
  reset() { sessions.clear(); idempotency.clear(); exports.clear(); },
  seed(session: InterviewSession) { sessions.set(session.sessionId, session); },
  get(id: string, owner: string) { return requireSession(id, owner); },
};
export default router;
