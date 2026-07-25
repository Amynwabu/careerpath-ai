import { Router, type IRouter, type Request, type Response } from "express";
import {
  analyseApplicationSession,
  buildApplicationQuestionContext,
  buildCoverLetterContext,
  buildTailoredDraft,
  calculateApplicationReadiness,
  compareDrafts,
  createOptimisationSession,
  premiumApplicationEntitlements,
  standardApplicationEntitlements,
  validateClaim,
  type ApplicationEntitlements,
  type OptimisationSession,
  type TailoredCvDraft,
} from "@workspace/application-intelligence";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
router.use(requireAuth);
router.use(requireNonProductionWorkflow);

const sessions = new Map<string, OptimisationSession>();
const idempotency = new Map<string, string>();
const exports = new Map<string, {
  exportId: string;
  ownerUserId: string;
  draftId: string;
  format: "plain_text" | "Markdown" | "structured_JSON";
  content: string;
  createdAt: string;
}>();

router.post("/cv-optimisation/sessions", async (req, res) => {
  await respondApplication(res, async () => {
    requireEntitlement(req, "canAnalyseCvAgainstJob");
    const owner = ownerId(req);
    const key = requireIdempotency(req);
    const replay = idempotency.get(`${owner}:session:${key}`);
    if (replay) return { session: publicSession(requireSession(replay, owner)), replayed: true };
    const session = createOptimisationSession({
      ownerUserId: owner,
      profile: req.body?.profile,
      vacancy: req.body?.vacancy,
      matchResult: req.body?.matchResult,
      sourceCv: req.body?.sourceCv,
      targetFormat: req.body?.targetFormat,
      targetLocale: req.body?.targetLocale,
      selectedTemplate: req.body?.selectedTemplate,
    });
    sessions.set(session.sessionId, session);
    idempotency.set(`${owner}:session:${key}`, session.sessionId);
    return { session: publicSession(session), replayed: false, persistenceStatus: "process_local" };
  });
});

router.get("/cv-optimisation/sessions", async (req, res) => {
  await respondApplication(res, async () => ({
    items: [...sessions.values()]
      .filter((session) => session.ownerUserId === ownerId(req))
      .map(publicSession),
    persistenceStatus: "process_local",
  }));
});

router.get("/cv-optimisation/sessions/:sessionId", async (req, res) => {
  await respondApplication(res, async () => ({
    session: publicSession(requireSession(req.params.sessionId, ownerId(req))),
    persistenceStatus: "process_local",
  }));
});

router.post("/cv-optimisation/sessions/:sessionId/analyse", async (req, res) => {
  await respondApplication(res, async () => {
    requireEntitlement(req, "canAnalyseCvAgainstJob");
    const key = requireIdempotency(req);
    const session = requireSession(req.params.sessionId, ownerId(req));
    const replayKey = `${ownerId(req)}:analyse:${session.sessionId}:${key}`;
    if (idempotency.has(replayKey)) return { analysis: session.analysis, replayed: true };
    const updated = analyseApplicationSession(session);
    sessions.set(updated.sessionId, updated);
    idempotency.set(replayKey, updated.analysis!.analysisId);
    return {
      analysis: visibleAnalysis(updated, entitlements(req)),
      session: publicSession(updated),
      replayed: false,
      persistenceStatus: "process_local",
    };
  });
});

router.get("/cv-optimisation/sessions/:sessionId/analysis", async (req, res) => {
  await respondApplication(res, async () => {
    const session = requireSession(req.params.sessionId, ownerId(req));
    if (!session.analysis) throw coded("analysis_failed");
    return {
      analysis: visibleAnalysis(session, entitlements(req)),
      persistenceStatus: "process_local",
    };
  });
});

router.get("/cv-optimisation/sessions/:sessionId/recommendations", async (req, res) => {
  await respondApplication(res, async () => ({
    items: requireSession(req.params.sessionId, ownerId(req)).recommendations,
    persistenceStatus: "process_local",
  }));
});

for (const action of ["accept", "reject"] as const) {
  router.post(`/cv-optimisation/sessions/:sessionId/recommendations/:recommendationId/${action}`, async (req, res) => {
    await respondApplication(res, async () => {
      const session = requireSession(req.params.sessionId, ownerId(req));
      checkVersion(session.recordVersion, req);
      const recommendation = session.recommendations.find((item) =>
        item.recommendationId === req.params.recommendationId,
      );
      if (!recommendation) throw coded("resource_not_found");
      recommendation.status = action === "accept" ? "accepted" : "rejected";
      session.recordVersion += 1;
      session.updatedAt = new Date().toISOString();
      return { recommendation, recordVersion: session.recordVersion, persistenceStatus: "process_local" };
    });
  });
}

router.post("/cv-optimisation/sessions/:sessionId/drafts", async (req, res) => {
  await respondApplication(res, async () => {
    requireEntitlement(req, "canGenerateTailoredCv");
    const session = requireSession(req.params.sessionId, ownerId(req));
    if (session.drafts.length && !entitlements(req).canGenerateMultipleDrafts) {
      throw coded("entitlement_required");
    }
    const key = requireIdempotency(req);
    const replayKey = `${ownerId(req)}:draft:${session.sessionId}:${key}`;
    const replay = idempotency.get(replayKey);
    if (replay) return { draft: requireDraft(replay, ownerId(req)), replayed: true };
    const draft = buildTailoredDraft(session);
    session.drafts.push(draft);
    session.status = "generated";
    session.recordVersion += 1;
    session.updatedAt = new Date().toISOString();
    idempotency.set(replayKey, draft.draftId);
    return { draft, replayed: false, persistenceStatus: "process_local" };
  });
});

router.get("/cv-optimisation/sessions/:sessionId/drafts", async (req, res) => {
  await respondApplication(res, async () => {
    const session = requireSession(req.params.sessionId, ownerId(req));
    const items = entitlements(req).canViewVersionHistory ? session.drafts : session.drafts.slice(-1);
    return { items, persistenceStatus: "process_local" };
  });
});

router.get("/cv-optimisation/drafts/:draftId", async (req, res) => {
  await respondApplication(res, async () => ({
    draft: requireDraft(req.params.draftId, ownerId(req)),
    persistenceStatus: "process_local",
  }));
});

router.patch("/cv-optimisation/drafts/:draftId", async (req, res) => {
  await respondApplication(res, async () => {
    const session = sessionForDraft(req.params.draftId, ownerId(req));
    const current = requireDraft(req.params.draftId, ownerId(req));
    checkVersion(current.recordVersion, req);
    const editedText = String(req.body?.text ?? "").trim();
    const evidenceIds = Array.isArray(req.body?.sourceEvidenceIds) ? req.body.sourceEvidenceIds : [];
    const validation = validateClaim({
      text: editedText,
      sourceTexts: evidenceIds.map((evidenceId: string) => ({
        evidenceId,
        text: session.profile.provenance.find((item) => item.referenceId === evidenceId)?.sourceText ?? "",
      })).filter((item: { text: string }) => item.text),
    });
    if (!validation.automaticallyIncludable) {
      throw Object.assign(new Error(validation.status), {
        code: validation.status === "user_confirmation_required"
          ? "user_confirmation_required"
          : "unsupported_claim_detected",
        validation,
      });
    }
    const next = structuredClone(current);
    next.draftId = `cpx_cvdraft_${crypto.randomUUID()}`;
    next.draftVersion = session.drafts.length + 1;
    next.createdAt = new Date().toISOString();
    next.recordVersion = 1;
    next.claimValidation.push(validation);
    if (next.sections.summary) {
      next.sections.summary.text = editedText;
      next.sections.summary.sourceEvidenceIds = evidenceIds;
      next.sections.summary.claimStatus = validation.status;
      next.sections.summary.generatedBy = "user";
    }
    session.drafts.push(next);
    return { draft: next, previousDraftId: current.draftId, persistenceStatus: "process_local" };
  });
});

router.post("/cv-optimisation/drafts/:draftId/validate", async (req, res) => {
  await respondApplication(res, async () => {
    const draft = requireDraft(req.params.draftId, ownerId(req));
    const blocked = draft.claimValidation.filter((item) => !item.automaticallyIncludable);
    return { valid: blocked.length === 0, blockedClaims: blocked, recordVersion: draft.recordVersion };
  });
});

router.post("/cv-optimisation/drafts/:draftId/compare", async (req, res) => {
  await respondApplication(res, async () => {
    const current = requireDraft(req.params.draftId, ownerId(req));
    const previous = req.body?.previousDraftId
      ? requireDraft(String(req.body.previousDraftId), ownerId(req))
      : null;
    return { changes: compareDrafts(previous, current), persistenceStatus: "stateless" };
  });
});

router.post("/cv-optimisation/drafts/:draftId/approve", async (req, res) => {
  await respondApplication(res, async () => {
    const draft = requireDraft(req.params.draftId, ownerId(req));
    checkVersion(draft.recordVersion, req);
    if (draft.claimValidation.some((item) => !item.automaticallyIncludable)) {
      throw coded("unsupported_claim_detected");
    }
    draft.reviewStatus = "approved";
    draft.recordVersion += 1;
    return { draft, persistenceStatus: "process_local" };
  });
});

router.post("/application-support/cover-letter/context", async (req, res) => {
  await respondApplication(res, async () => {
    requireEntitlement(req, "canGenerateCoverLetter");
    const session = requireSession(String(req.body?.sessionId ?? ""), ownerId(req));
    return { context: buildCoverLetterContext({
      session,
      motivation: req.body?.motivation,
      employerName: req.body?.employerName,
      closingPreference: req.body?.closingPreference,
    }) };
  });
});

router.post("/application-support/questions/context", async (req, res) => {
  await respondApplication(res, async () => {
    requireEntitlement(req, "canGenerateApplicationAnswers");
    const session = requireSession(String(req.body?.sessionId ?? ""), ownerId(req));
    return { context: buildApplicationQuestionContext({
      session,
      question: String(req.body?.question ?? ""),
      userFacts: req.body?.userFacts,
    }) };
  });
});

router.post("/application-support/readiness", async (req, res) => {
  await respondApplication(res, async () => {
    const session = requireSession(String(req.body?.sessionId ?? ""), ownerId(req));
    if (!session.analysis) throw coded("analysis_failed");
    const draft = req.body?.draftId ? requireDraft(String(req.body.draftId), ownerId(req)) : null;
    return { readiness: calculateApplicationReadiness({
      analysis: session.analysis,
      draft,
      contactConfirmed: req.body?.contactConfirmed === true,
      workAuthorisationConfirmed: req.body?.workAuthorisationConfirmed,
      coverLetterRequired: req.body?.coverLetterRequired,
      coverLetterReady: req.body?.coverLetterReady,
      questionsComplete: req.body?.questionsComplete,
    }) };
  });
});

router.post("/cv-optimisation/drafts/:draftId/export", async (req, res) => {
  await respondApplication(res, async () => {
    const draft = requireDraft(req.params.draftId, ownerId(req));
    const format = req.body?.format as "plain_text" | "Markdown" | "structured_JSON";
    if (!["plain_text", "Markdown", "structured_JSON"].includes(format)) {
      throw coded("export_failed");
    }
    const key = requireIdempotency(req);
    const replayKey = `${ownerId(req)}:export:${draft.draftId}:${key}`;
    const replay = idempotency.get(replayKey);
    if (replay) return { export: exports.get(replay), replayed: true };
    const exportId = `cvexport_${crypto.randomUUID()}`;
    const record = {
      exportId,
      ownerUserId: ownerId(req),
      draftId: draft.draftId,
      format,
      content: serializeDraft(draft, format),
      createdAt: new Date().toISOString(),
    };
    exports.set(exportId, record);
    idempotency.set(replayKey, exportId);
    return { export: record, replayed: false, persistenceStatus: "process_local" };
  });
});

router.get("/cv-optimisation/exports/:exportId", async (req, res) => {
  await respondApplication(res, async () => {
    const record = exports.get(req.params.exportId);
    if (!record || record.ownerUserId !== ownerId(req)) throw coded("resource_not_found");
    return { export: record, persistenceStatus: "process_local" };
  });
});

router.post("/cv-optimisation/drafts/:draftId/reviews", async (req, res) => {
  await respondApplication(res, async () => {
    requireDraft(req.params.draftId, ownerId(req));
    throw coded("advisor_scope_required");
  });
});

router.get("/cv-optimisation/drafts/:draftId/reviews", async (req, res) => {
  await respondApplication(res, async () => {
    requireDraft(req.params.draftId, ownerId(req));
    return { items: [], advisorWorkflowStatus: "requires_persistent_scoped_grant" };
  });
});

export async function respondApplication(
  res: Response,
  operation: () => Promise<unknown>,
) {
  try {
    res.json(await operation());
  } catch (error) {
    const code = String((error as { code?: string })?.code ?? "analysis_failed");
    const status = code === "resource_not_found" ? 404
      : code === "entitlement_required" || code === "advisor_scope_required" ? 403
        : code === "record_version_conflict" ? 409 : 400;
    res.status(status).json({
      code,
      error: safeMessage(code),
      validation: (error as { validation?: unknown })?.validation,
    });
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
      error: "CV optimisation requires the persistent production store.",
    });
    return;
  }
  next();
}

function publicSession(session: OptimisationSession) {
  const { profile: _profile, sourceCv: _sourceCv, ...safe } = session;
  return safe;
}

function visibleAnalysis(session: OptimisationSession, access: ApplicationEntitlements) {
  if (!session.analysis) return null;
  return access.canViewFullAtsReport
    ? session.analysis
    : { ...session.analysis, atsFindings: session.analysis.atsFindings.slice(0, 3) };
}

function requireSession(sessionId: string, ownerUserId: string) {
  const session = sessions.get(sessionId);
  if (!session || session.ownerUserId !== ownerUserId) throw coded("resource_not_found");
  return session;
}

function requireDraft(draftId: string, ownerUserId: string) {
  const draft = [...sessions.values()]
    .filter((session) => session.ownerUserId === ownerUserId)
    .flatMap((session) => session.drafts)
    .find((item) => item.draftId === draftId);
  if (!draft) throw coded("resource_not_found");
  return draft;
}

function sessionForDraft(draftId: string, ownerUserId: string) {
  const session = [...sessions.values()].find((item) =>
    item.ownerUserId === ownerUserId && item.drafts.some((draft) => draft.draftId === draftId),
  );
  if (!session) throw coded("resource_not_found");
  return session;
}

function ownerId(req: Request) {
  return String(req.user!.userId);
}

function entitlements(req: Request) {
  return req.headers["x-cpx-membership"] === "premium"
    ? premiumApplicationEntitlements
    : standardApplicationEntitlements;
}

function requireEntitlement(
  req: Request,
  key: keyof ApplicationEntitlements,
) {
  if (!entitlements(req)[key]) throw coded("entitlement_required");
}

function requireIdempotency(req: Request) {
  const key = req.headers["idempotency-key"];
  if (typeof key !== "string" || !key.trim()) throw coded("idempotency_key_required");
  return key.trim();
}

function checkVersion(current: number, req: Request) {
  const supplied = Number(req.headers["if-match"]);
  if (!Number.isInteger(supplied) || supplied !== current) throw coded("record_version_conflict");
}

function serializeDraft(
  draft: TailoredCvDraft,
  format: "plain_text" | "Markdown" | "structured_JSON",
) {
  if (format === "structured_JSON") {
    const visible = structuredClone(draft);
    visible.claimValidation = [];
    for (const section of Object.values(visible.sections)) {
      if (Array.isArray(section)) {
        for (const item of section as Array<Record<string, unknown>>) {
          delete item.sourceEvidenceIds;
        }
      }
    }
    return JSON.stringify(visible, null, 2);
  }
  const heading = (value: string) => format === "Markdown" ? `## ${value}` : value.toUpperCase();
  const sections = [
    draft.sections.summary?.text ? `${heading("Professional summary")}\n${draft.sections.summary.text}` : "",
    draft.sections.skills.length ? `${heading("Skills")}\n${draft.sections.skills.map((item) => `- ${item.text}`).join("\n")}` : "",
    ...draft.sections.employment.map((item) =>
      `${heading("Employment")}\n${item.jobTitle ?? ""} — ${item.employer ?? ""}\n${item.dates ?? ""}\n${item.bullets.map((bullet) => `- ${bullet.text}`).join("\n")}`,
    ),
    draft.sections.education.length ? `${heading("Education")}\n${draft.sections.education.map((item) => `- ${item.text}`).join("\n")}` : "",
    draft.sections.certifications.length ? `${heading("Certifications")}\n${draft.sections.certifications.map((item) => `- ${item.text}`).join("\n")}` : "",
  ];
  return sections.filter(Boolean).join("\n\n");
}

function coded(code: string) {
  return Object.assign(new Error(code), { code });
}

function safeMessage(code: string) {
  const messages: Record<string, string> = {
    profile_invalid: "The Career Profile or source CV is invalid.",
    vacancy_unresolved: "The vacancy is not mapped to a published taxonomy.",
    vacancy_expired: "The selected vacancy has expired.",
    analysis_failed: "CV analysis could not be completed.",
    unsupported_claim_detected: "The proposed content contains an unsupported or conflicting claim.",
    user_confirmation_required: "User confirmation is required before this content can be used.",
    advisor_scope_required: "An active advisor grant with the required scope is required.",
    entitlement_required: "This feature is not included in the active membership.",
    quota_exceeded: "The endpoint quota has been reached.",
    record_version_conflict: "The record changed; reload before updating.",
    export_failed: "The requested export format is unavailable.",
    resource_not_found: "The requested record was not found.",
    idempotency_key_required: "Idempotency-Key is required.",
    persistent_store_unavailable: "CV optimisation requires the persistent production store.",
  };
  return messages[code] ?? "Application request failed.";
}

export const applicationIntelligenceTestStore = {
  seed(session: OptimisationSession) {
    sessions.set(session.sessionId, session);
  },
  getSession(sessionId: string, ownerUserId: string) {
    return requireSession(sessionId, ownerUserId);
  },
  reset() {
    sessions.clear();
    idempotency.clear();
    exports.clear();
  },
};

export default router;
