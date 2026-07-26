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
import {
  createWorkflowExport,
  createWorkflowSession,
  getWorkflowExport,
  getWorkflowSession,
  listWorkflowSessions,
  persistWorkflowResource,
  rememberIdempotency,
  replayIdempotency,
  saveWorkflowSession,
} from "../lib/workflow-persistence-repository";
import { createReviewItem, listReviewItems } from "../lib/advisor-workspace-repository";

const router: IRouter = Router();
router.use(requireAuth);

router.post("/cv-optimisation/sessions", async (req, res) => {
  await respondApplication(res, async () => {
    requireEntitlement(req, "canAnalyseCvAgainstJob");
    const owner = ownerId(req);
    const key = requireIdempotency(req);
    const replay = await replayIdempotency({ ownerUserId: ownerNumber(req), domain: "application", operation: "session", key });
    if (replay) return { session: publicSession(await requireSession(replay, owner)), replayed: true, persistenceStatus: "persistent" };
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
    await createWorkflowSession({ domain: "application", ownerUserId: ownerNumber(req), sessionId: session.sessionId,
      status: session.status, payload: session, taxonomyVersion: session.vacancy.taxonomyVersion });
    await persistWorkflowResource({ resourceId: session.sessionId, ownerUserId: ownerNumber(req),
      domain: "application", resourceType: "cv_optimisation_session", parentSessionId: session.sessionId,
      payload: publicSession(session), recordVersion: session.recordVersion, taxonomyVersion: session.vacancy.taxonomyVersion });
    await rememberIdempotency({ ownerUserId: ownerNumber(req), domain: "application", operation: "session", key, resourceId: session.sessionId });
    return { session: publicSession(session), replayed: false, persistenceStatus: "persistent" };
  });
});

router.get("/cv-optimisation/sessions", async (req, res) => {
  await respondApplication(res, async () => ({
    items: (await listWorkflowSessions<OptimisationSession>("application", ownerNumber(req))).map(publicSession),
    persistenceStatus: "persistent",
  }));
});

router.get("/cv-optimisation/sessions/:sessionId", async (req, res) => {
  await respondApplication(res, async () => ({
    session: publicSession(await requireSession(req.params.sessionId, ownerId(req))),
    persistenceStatus: "persistent",
  }));
});

router.post("/cv-optimisation/sessions/:sessionId/analyse", async (req, res) => {
  await respondApplication(res, async () => {
    requireEntitlement(req, "canAnalyseCvAgainstJob");
    const key = requireIdempotency(req);
    const session = await requireSession(req.params.sessionId, ownerId(req));
    const replay = await replayIdempotency({ ownerUserId: ownerNumber(req), domain: "application", operation: `analyse:${session.sessionId}`, key });
    if (replay) return { analysis: session.analysis, replayed: true, persistenceStatus: "persistent" };
    const updated = analyseApplicationSession(session);
    await saveWorkflowSession({ domain: "application", ownerUserId: ownerNumber(req), sessionId: updated.sessionId,
      status: updated.status, expectedVersion: session.recordVersion, payload: updated });
    await persistWorkflowResource({ resourceId: updated.analysis!.analysisId, ownerUserId: ownerNumber(req),
      domain: "application", resourceType: "cv_ats_analysis", parentSessionId: updated.sessionId,
      payload: updated.analysis!, recordVersion: 1, taxonomyVersion: updated.vacancy.taxonomyVersion });
    for (const recommendation of updated.recommendations) {
      await persistWorkflowResource({ resourceId: recommendation.recommendationId, ownerUserId: ownerNumber(req),
        domain: "application", resourceType: "cv_recommendation", parentSessionId: updated.sessionId,
        sourceRecordId: updated.analysis!.analysisId, payload: recommendation });
    }
    await rememberIdempotency({ ownerUserId: ownerNumber(req), domain: "application",
      operation: `analyse:${session.sessionId}`, key, resourceId: updated.analysis!.analysisId });
    return {
      analysis: visibleAnalysis(updated, entitlements(req)),
      session: publicSession(updated),
      replayed: false,
      persistenceStatus: "persistent",
    };
  });
});

router.get("/cv-optimisation/sessions/:sessionId/analysis", async (req, res) => {
  await respondApplication(res, async () => {
    const session = await requireSession(req.params.sessionId, ownerId(req));
    if (!session.analysis) throw coded("analysis_failed");
    return {
      analysis: visibleAnalysis(session, entitlements(req)),
      persistenceStatus: "persistent",
    };
  });
});

router.get("/cv-optimisation/sessions/:sessionId/recommendations", async (req, res) => {
  await respondApplication(res, async () => ({
    items: (await requireSession(req.params.sessionId, ownerId(req))).recommendations,
    persistenceStatus: "persistent",
  }));
});

for (const action of ["accept", "reject"] as const) {
  router.post(`/cv-optimisation/sessions/:sessionId/recommendations/:recommendationId/${action}`, async (req, res) => {
    await respondApplication(res, async () => {
      const session = await requireSession(req.params.sessionId, ownerId(req));
      const previousVersion = session.recordVersion;
      checkVersion(session.recordVersion, req);
      const recommendation = session.recommendations.find((item) =>
        item.recommendationId === req.params.recommendationId,
      );
      if (!recommendation) throw coded("resource_not_found");
      recommendation.status = action === "accept" ? "accepted" : "rejected";
      session.recordVersion += 1;
      session.updatedAt = new Date().toISOString();
      await saveWorkflowSession({ domain: "application", ownerUserId: ownerNumber(req), sessionId: session.sessionId,
        status: session.status, expectedVersion: previousVersion, payload: session });
      return { recommendation, recordVersion: session.recordVersion, persistenceStatus: "persistent" };
    });
  });
}

router.post("/cv-optimisation/sessions/:sessionId/drafts", async (req, res) => {
  await respondApplication(res, async () => {
    requireEntitlement(req, "canGenerateTailoredCv");
    const session = await requireSession(req.params.sessionId, ownerId(req));
    if (session.drafts.length && !entitlements(req).canGenerateMultipleDrafts) {
      throw coded("entitlement_required");
    }
    const key = requireIdempotency(req);
    const replay = await replayIdempotency({ ownerUserId: ownerNumber(req), domain: "application", operation: `draft:${session.sessionId}`, key });
    if (replay) return { draft: await requireDraft(replay, ownerId(req)), replayed: true, persistenceStatus: "persistent" };
    const previousVersion = session.recordVersion;
    const draft = buildTailoredDraft(session);
    session.drafts.push(draft);
    session.status = "generated";
    session.recordVersion += 1;
    session.updatedAt = new Date().toISOString();
    await saveWorkflowSession({ domain: "application", ownerUserId: ownerNumber(req), sessionId: session.sessionId,
      status: session.status, expectedVersion: previousVersion, payload: session });
    await persistWorkflowResource({ resourceId: draft.draftId, ownerUserId: ownerNumber(req), domain: "application",
      resourceType: "cv_draft", parentSessionId: session.sessionId, sourceRecordId: session.analysis?.analysisId,
      payload: draft, recordVersion: draft.recordVersion, taxonomyVersion: session.vacancy.taxonomyVersion });
    await rememberIdempotency({ ownerUserId: ownerNumber(req), domain: "application", operation: `draft:${session.sessionId}`, key, resourceId: draft.draftId });
    return { draft, replayed: false, persistenceStatus: "persistent" };
  });
});

router.get("/cv-optimisation/sessions/:sessionId/drafts", async (req, res) => {
  await respondApplication(res, async () => {
    const session = await requireSession(req.params.sessionId, ownerId(req));
    const items = entitlements(req).canViewVersionHistory ? session.drafts : session.drafts.slice(-1);
    return { items, persistenceStatus: "persistent" };
  });
});

router.get("/cv-optimisation/drafts/:draftId", async (req, res) => {
  await respondApplication(res, async () => ({
    draft: await requireDraft(req.params.draftId, ownerId(req)),
    persistenceStatus: "persistent",
  }));
});

router.patch("/cv-optimisation/drafts/:draftId", async (req, res) => {
  await respondApplication(res, async () => {
    const session = await sessionForDraft(req.params.draftId, ownerId(req));
    const current = await requireDraft(req.params.draftId, ownerId(req));
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
    const expectedVersion = session.recordVersion;
    session.recordVersion += 1;
    session.updatedAt = new Date().toISOString();
    await saveWorkflowSession({ domain: "application", ownerUserId: ownerNumber(req), sessionId: session.sessionId,
      status: session.status, expectedVersion, payload: session });
    await persistWorkflowResource({ resourceId: next.draftId, ownerUserId: ownerNumber(req), domain: "application",
      resourceType: "cv_draft", parentSessionId: session.sessionId, sourceRecordId: current.draftId,
      payload: next, recordVersion: next.recordVersion, supersedesResourceId: current.draftId,
      taxonomyVersion: session.vacancy.taxonomyVersion });
    for (const validation of next.claimValidation) {
      await persistWorkflowResource({ resourceId: `cvclaim_${crypto.randomUUID()}`, ownerUserId: ownerNumber(req),
        domain: "application", resourceType: "cv_claim_validation", parentSessionId: session.sessionId,
        sourceRecordId: next.draftId, payload: validation });
    }
    return { draft: next, previousDraftId: current.draftId, persistenceStatus: "persistent" };
  });
});

router.post("/cv-optimisation/drafts/:draftId/validate", async (req, res) => {
  await respondApplication(res, async () => {
    const draft = await requireDraft(req.params.draftId, ownerId(req));
    const blocked = draft.claimValidation.filter((item) => !item.automaticallyIncludable);
    return { valid: blocked.length === 0, blockedClaims: blocked, recordVersion: draft.recordVersion };
  });
});

router.post("/cv-optimisation/drafts/:draftId/compare", async (req, res) => {
  await respondApplication(res, async () => {
    const current = await requireDraft(req.params.draftId, ownerId(req));
    const previous = req.body?.previousDraftId
      ? await requireDraft(String(req.body.previousDraftId), ownerId(req))
      : null;
    return { changes: compareDrafts(previous, current), persistenceStatus: "stateless" };
  });
});

router.post("/cv-optimisation/drafts/:draftId/approve", async (req, res) => {
  await respondApplication(res, async () => {
    const session = await sessionForDraft(req.params.draftId, ownerId(req));
    const draft = await requireDraft(req.params.draftId, ownerId(req));
    checkVersion(draft.recordVersion, req);
    if (draft.claimValidation.some((item) => !item.automaticallyIncludable)) {
      throw coded("unsupported_claim_detected");
    }
    draft.reviewStatus = "approved";
    draft.recordVersion += 1;
    const expectedVersion = session.recordVersion;
    session.recordVersion += 1;
    await saveWorkflowSession({ domain: "application", ownerUserId: ownerNumber(req), sessionId: session.sessionId,
      status: session.status, expectedVersion, payload: session });
    return { draft, persistenceStatus: "persistent" };
  });
});

router.post("/application-support/cover-letter/context", async (req, res) => {
  await respondApplication(res, async () => {
    requireEntitlement(req, "canGenerateCoverLetter");
    const session = await requireSession(String(req.body?.sessionId ?? ""), ownerId(req));
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
    const session = await requireSession(String(req.body?.sessionId ?? ""), ownerId(req));
    return { context: buildApplicationQuestionContext({
      session,
      question: String(req.body?.question ?? ""),
      userFacts: req.body?.userFacts,
    }) };
  });
});

router.post("/application-support/readiness", async (req, res) => {
  await respondApplication(res, async () => {
    const session = await requireSession(String(req.body?.sessionId ?? ""), ownerId(req));
    if (!session.analysis) throw coded("analysis_failed");
    const draft = req.body?.draftId ? await requireDraft(String(req.body.draftId), ownerId(req)) : null;
    const readiness = calculateApplicationReadiness({
      analysis: session.analysis,
      draft,
      contactConfirmed: req.body?.contactConfirmed === true,
      workAuthorisationConfirmed: req.body?.workAuthorisationConfirmed,
      coverLetterRequired: req.body?.coverLetterRequired,
      coverLetterReady: req.body?.coverLetterReady,
      questionsComplete: req.body?.questionsComplete,
    });
    await persistWorkflowResource({ resourceId: `appreadiness_${crypto.randomUUID()}`,
      ownerUserId: ownerNumber(req), domain: "application", resourceType: "application_readiness",
      parentSessionId: session.sessionId, sourceRecordId: session.analysis.analysisId, payload: readiness });
    return { readiness, persistenceStatus: "persistent" };
  });
});

router.post("/cv-optimisation/drafts/:draftId/export", async (req, res) => {
  await respondApplication(res, async () => {
    const session = await sessionForDraft(req.params.draftId, ownerId(req));
    const draft = await requireDraft(req.params.draftId, ownerId(req));
    const format = req.body?.format as "plain_text" | "Markdown" | "structured_JSON";
    if (!["plain_text", "Markdown", "structured_JSON"].includes(format)) {
      throw coded("export_failed");
    }
    const key = requireIdempotency(req);
    const replay = await replayIdempotency({ ownerUserId: ownerNumber(req), domain: "application", operation: `export:${draft.draftId}`, key });
    if (replay) return { export: await getWorkflowExport(ownerNumber(req), "application", replay), replayed: true, persistenceStatus: "persistent" };
    const record = {
      exportId: "",
      ownerUserId: ownerId(req),
      draftId: draft.draftId,
      format,
      content: serializeDraft(draft, format),
      createdAt: new Date().toISOString(),
    };
    record.exportId = await createWorkflowExport({ ownerUserId: ownerNumber(req), domain: "application",
      parentSessionId: session.sessionId, sourceResourceId: draft.draftId, format, payload: record });
    await rememberIdempotency({ ownerUserId: ownerNumber(req), domain: "application",
      operation: `export:${draft.draftId}`, key, resourceId: record.exportId });
    return { export: record, replayed: false, persistenceStatus: "persistent" };
  });
});

router.get("/cv-optimisation/exports/:exportId", async (req, res) => {
  await respondApplication(res, async () => {
    const record = await getWorkflowExport(ownerNumber(req), "application", req.params.exportId);
    if (!record) throw coded("resource_not_found");
    return { export: record, persistenceStatus: "persistent" };
  });
});

router.post("/cv-optimisation/drafts/:draftId/reviews", async (req, res) => {
  await respondApplication(res, async () => {
    await requireDraft(req.params.draftId, ownerId(req));
    requireEntitlement(req, "canRequestAdvisorReview");
    const caseId = String(req.body?.caseId ?? "");
    if (!caseId) throw coded("advisor_scope_required");
    const review = await createReviewItem({
      actor: { userId: ownerNumber(req), role: "client" }, caseId,
      resourceType: "cv_draft", resourceId: req.params.draftId,
      reviewType: String(req.body?.reviewType ?? "draft_review"),
      priority: String(req.body?.priority ?? "standard"),
      idempotencyKey: requireIdempotency(req),
    });
    return { review, persistenceStatus: "persistent" };
  });
});

router.get("/cv-optimisation/drafts/:draftId/reviews", async (req, res) => {
  await respondApplication(res, async () => {
    await requireDraft(req.params.draftId, ownerId(req));
    const caseId = String(req.query.caseId ?? "");
    if (!caseId) return { items: [], advisorWorkflowStatus: "case_link_required" };
    const items = (await listReviewItems({ userId: ownerNumber(req), role: "client" }, caseId))
      .filter((item) => item.resourceType === "cv_draft" && item.resourceId === req.params.draftId);
    return { items, advisorWorkflowStatus: "persistent_source_ready", persistenceStatus: "persistent" };
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

async function requireSession(sessionId: string, ownerUserId: string) {
  const session = await getWorkflowSession<OptimisationSession>("application", Number(ownerUserId), sessionId);
  if (!session || session.ownerUserId !== ownerUserId) throw coded("resource_not_found");
  return session;
}

async function requireDraft(draftId: string, ownerUserId: string) {
  const draft = (await listWorkflowSessions<OptimisationSession>("application", Number(ownerUserId)))
    .flatMap((session) => session.drafts)
    .find((item) => item.draftId === draftId);
  if (!draft) throw coded("resource_not_found");
  return draft;
}

async function sessionForDraft(draftId: string, ownerUserId: string) {
  const session = (await listWorkflowSessions<OptimisationSession>("application", Number(ownerUserId))).find((item) =>
    item.ownerUserId === ownerUserId && item.drafts.some((draft) => draft.draftId === draftId),
  );
  if (!session) throw coded("resource_not_found");
  return session;
}

function ownerId(req: Request) {
  return String(req.user!.userId);
}
function ownerNumber(req: Request) {
  return req.user!.userId;
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
  records: new Map<string, OptimisationSession>(),
  seed(session: OptimisationSession) {
    this.records.set(session.sessionId, session);
  },
  getSession(sessionId: string, ownerUserId: string) {
    const session = this.records.get(sessionId);
    if (!session || session.ownerUserId !== ownerUserId) throw coded("resource_not_found");
    return session;
  },
  reset() {
    this.records.clear();
  },
};

export default router;
