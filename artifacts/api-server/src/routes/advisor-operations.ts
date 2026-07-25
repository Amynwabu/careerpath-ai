import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  buildAdvisorCaseExport,
  cancelAction,
  cancelFollowUp,
  cancelSession,
  completeFollowUp,
  completeSession,
  confirmSession,
  createAction,
  createComment,
  createEvidenceRequest,
  createFollowUp,
  createOutcome,
  createPlacement,
  createReviewItem,
  createSession,
  createSessionNote,
  deferAction,
  deleteComment,
  deleteSessionNote,
  getAction,
  getAdvisorOperationalQueues,
  getEvidenceRequest,
  getFollowUp,
  getOutcome,
  getPlacement,
  getReviewItem,
  getSession,
  listCaseActions,
  listComments,
  listEvidenceRequests,
  listFollowUps,
  listOutcomes,
  listPlacements,
  listReviewItems,
  listSessionNotes,
  listSessions,
  listSessionSummaries,
  markActionCompleted,
  publishSessionSummary,
  requestEvidenceClarification,
  resolveCaseActor,
  resolveComment,
  resolveOperationalActor,
  resolveReviewItem,
  rescheduleSession,
  reviewEvidence,
  startSession,
  submitAdvisorDecision,
  submitClientDecision,
  submitEvidence,
  transitionActionRecord,
  updateAction,
  updateComment,
  updateFollowUp,
  updateOutcome,
  updatePlacement,
  updateSession,
  updateSessionNote,
  verifyAction,
  withdrawEvidenceRequest,
  withdrawReviewItem,
  type AdvisorWorkspaceActor,
} from "../lib/advisor-workspace-repository";
import { persistentResponse } from "./career-data";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/advisor/queues", async (req, res) => respond(res, async () => ({
  queues: await getAdvisorOperationalQueues(req.user!.userId),
  persistenceStatus: "persistent",
})));

router.post("/advisor/cases/:caseId/actions", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  action: await createAction({
    actor, caseId, assignedTo: enumValue(req.body?.assignedTo, ["client","advisor"]),
    actionType: requiredString(req.body?.actionType), title: requiredString(req.body?.title),
    description: requiredString(req.body?.description), priority: requiredString(req.body?.priority),
    dueAt: optionalDate(req.body?.dueAt), sourceSessionId: optionalString(req.body?.sourceSessionId),
    relatedResourceType: optionalString(req.body?.relatedResourceType),
    relatedResourceId: optionalString(req.body?.relatedResourceId),
    completionEvidenceRequired: req.body?.completionEvidenceRequired === true,
    idempotencyKey: idempotencyKey(req),
  }), persistenceStatus: "persistent",
})));
router.get("/advisor/cases/:caseId/actions", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  items: await listCaseActions(actor, caseId), persistenceStatus: "persistent",
})));
router.get("/advisor/actions/:actionId", async (req, res) => withResourceActor(req, res, "action", "actionId", async (actor, id) => ({
  action: await getAction(actor, id), persistenceStatus: "persistent",
})));
router.patch("/advisor/actions/:actionId", async (req, res) => withResourceActor(req, res, "action", "actionId", async (actor, actionId) => ({
  action: await updateAction({
    actor, actionId, expectedVersion: recordVersion(req), title: optionalDefinedString(req.body?.title),
    description: optionalDefinedString(req.body?.description), priority: optionalDefinedString(req.body?.priority),
    dueAt: optionalDate(req.body?.dueAt),
  }), persistenceStatus: "persistent",
})));
router.post("/advisor/actions/:actionId/complete", async (req, res) => actionTransition(req, res, markActionCompleted));
router.post("/advisor/actions/:actionId/verify", async (req, res) => actionTransition(req, res, verifyAction));
router.post("/advisor/actions/:actionId/defer", async (req, res) => actionTransition(req, res, deferAction));
router.post("/advisor/actions/:actionId/cancel", async (req, res) => actionTransition(req, res, cancelAction));
router.post("/advisor/actions/:actionId/status", async (req, res) => withResourceActor(req, res, "action", "actionId", async (actor, actionId) => ({
  action: await transitionActionRecord({
    actor, actionId, expectedVersion: recordVersion(req),
    nextStatus: enumValue(req.body?.status, ["not_started","in_progress","blocked","completed","verified","deferred","cancelled"]),
    completionInformation: optionalString(req.body?.completionInformation), reason: optionalString(req.body?.reason),
  }), persistenceStatus: "persistent",
})));

router.post("/advisor/cases/:caseId/evidence-requests", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  evidenceRequest: await createEvidenceRequest({
    actor, caseId, evidenceType: requiredString(req.body?.evidenceType),
    description: requiredString(req.body?.description),
    relatedRequirement: optionalString(req.body?.relatedRequirement),
    relatedResourceType: optionalString(req.body?.relatedResourceType),
    relatedResourceId: optionalString(req.body?.relatedResourceId),
    dueAt: optionalDate(req.body?.dueAt), idempotencyKey: idempotencyKey(req),
  }), persistenceStatus: "persistent",
})));
router.get("/advisor/cases/:caseId/evidence-requests", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  items: await listEvidenceRequests(actor, caseId), persistenceStatus: "persistent",
})));
router.get("/advisor/evidence-requests/:requestId", async (req, res) => withResourceActor(req, res, "evidence_request", "requestId", async (actor, requestId) => ({
  evidenceRequest: await getEvidenceRequest(actor, requestId), persistenceStatus: "persistent",
})));
router.post("/advisor/evidence-requests/:requestId/submit", async (req, res) => evidenceTransition(req, res, (actor, requestId) => submitEvidence({
  actor, requestId, expectedVersion: recordVersion(req),
  submittedEvidenceId: requiredString(req.body?.submittedEvidenceId),
})));
router.post("/advisor/evidence-requests/:requestId/review", async (req, res) => evidenceTransition(req, res, (actor, requestId) => reviewEvidence({
  actor, requestId, expectedVersion: recordVersion(req),
  reviewDecision: enumValue(req.body?.reviewDecision, [
    "accepted_as_supporting_evidence","accepted_with_limitations","needs_clarification",
    "insufficient","conflicting","out_of_scope",
  ]),
  reviewNotes: optionalString(req.body?.reviewNotes),
})));
router.post("/advisor/evidence-requests/:requestId/clarify", async (req, res) => evidenceTransition(req, res, (actor, requestId) => requestEvidenceClarification({
  actor, requestId, expectedVersion: recordVersion(req), reviewNotes: optionalString(req.body?.reviewNotes),
})));
router.post("/advisor/evidence-requests/:requestId/withdraw", async (req, res) => evidenceTransition(req, res, (actor, requestId) => withdrawEvidenceRequest({
  actor, requestId, expectedVersion: recordVersion(req),
})));

router.post("/advisor/cases/:caseId/reviews", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  review: await createReviewItem({
    actor, caseId,
    resourceType: enumValue(req.body?.resourceType, [
      "career_profile","career_goal","career_plan","career_action","opportunity","evidence_record",
      "cv_optimisation_session","cv_draft","interview_session","interview_response",
    ]),
    resourceId: requiredString(req.body?.resourceId), reviewType: requiredString(req.body?.reviewType),
    priority: requiredString(req.body?.priority), idempotencyKey: idempotencyKey(req),
  }), persistenceStatus: "persistent",
})));
router.get("/advisor/cases/:caseId/reviews", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  items: await listReviewItems(actor, caseId), persistenceStatus: "persistent",
})));
router.get("/advisor/reviews/:reviewId", async (req, res) => withResourceActor(req, res, "review", "reviewId", async (actor, reviewId) => ({
  review: await getReviewItem(actor, reviewId), persistenceStatus: "persistent",
})));
router.post("/advisor/reviews/:reviewId/advisor-decision", async (req, res) => reviewTransition(req, res, (actor, reviewId) => submitAdvisorDecision({
  actor, reviewId, expectedVersion: recordVersion(req),
  advisorDecision: requiredString(req.body?.advisorDecision),
  decisionReason: requiredString(req.body?.decisionReason), idempotencyKey: idempotencyKey(req),
})));
router.post("/advisor/reviews/:reviewId/client-response", async (req, res) => reviewTransition(req, res, (actor, reviewId) => submitClientDecision({
  actor, reviewId, expectedVersion: recordVersion(req),
  clientDecision: requiredString(req.body?.clientDecision),
  decisionReason: optionalString(req.body?.decisionReason), idempotencyKey: idempotencyKey(req),
})));
router.post("/advisor/reviews/:reviewId/resolve", async (req, res) => reviewTransition(req, res, (actor, reviewId) => resolveReviewItem({
  actor, reviewId, expectedVersion: recordVersion(req), decisionReason: optionalString(req.body?.decisionReason),
})));
router.post("/advisor/reviews/:reviewId/withdraw", async (req, res) => reviewTransition(req, res, (actor, reviewId) => withdrawReviewItem({
  actor, reviewId, expectedVersion: recordVersion(req), decisionReason: optionalString(req.body?.decisionReason),
})));

router.post("/advisor/reviews/:reviewId/comments", async (req, res) => withResourceActor(req, res, "review", "reviewId", async (actor, reviewId) => ({
  comment: await createComment({
    actor, reviewId, parentCommentId: optionalString(req.body?.parentCommentId),
    visibilityScope: enumValue(req.body?.visibilityScope, ["client_and_advisor","advisor_private","admin_only"]),
    content: requiredString(req.body?.content),
  }), persistenceStatus: "persistent",
})));
router.get("/advisor/reviews/:reviewId/comments", async (req, res) => withResourceActor(req, res, "review", "reviewId", async (actor, reviewId) => ({
  items: await listComments(actor, reviewId), persistenceStatus: "persistent",
})));
router.patch("/advisor/comments/:commentId", async (req, res) => withResourceActor(req, res, "comment", "commentId", async (actor, commentId) => ({
  comment: await updateComment({
    actor, commentId, expectedVersion: recordVersion(req), content: requiredString(req.body?.content),
  }), persistenceStatus: "persistent",
})));
router.post("/advisor/comments/:commentId/resolve", async (req, res) => withResourceActor(req, res, "comment", "commentId", async (actor, commentId) => ({
  comment: await resolveComment({ actor, commentId, expectedVersion: recordVersion(req) }),
  persistenceStatus: "persistent",
})));
router.delete("/advisor/comments/:commentId", async (req, res) => withResourceActor(req, res, "comment", "commentId", async (actor, commentId) => ({
  comment: await deleteComment({ actor, commentId, expectedVersion: recordVersion(req) }),
  persistenceStatus: "persistent",
})));

router.post("/advisor/cases/:caseId/outcomes", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  outcome: await createOutcome({
    actor, caseId, outcomeType: enumValue(req.body?.outcomeType, [
      "profile_completed","career_goal_confirmed","career_plan_approved","training_started","training_completed",
      "cv_completed","application_submitted","interview_secured","interview_completed","job_offer_received",
      "job_offer_accepted","job_started","promotion_received","career_transition_completed",
      "professional_registration_application_submitted","professional_registration_achieved","case_closed_without_outcome",
    ]),
    outcomeDate: requiredDate(req.body?.outcomeDate),
    verificationStatus: requiredString(req.body?.verificationStatus),
    sourceReference: optionalString(req.body?.sourceReference), notes: optionalString(req.body?.notes),
    supersedesOutcomeId: optionalString(req.body?.supersedesOutcomeId),
    idempotencyKey: idempotencyKey(req),
  }), persistenceStatus: "persistent",
})));
router.get("/advisor/cases/:caseId/outcomes", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  items: await listOutcomes(actor, caseId), persistenceStatus: "persistent",
})));
router.get("/advisor/outcomes/:outcomeId", async (req, res) => withResourceActor(req, res, "outcome", "outcomeId", async (actor, outcomeId) => ({
  outcome: await getOutcome(actor, outcomeId), persistenceStatus: "persistent",
})));
router.patch("/advisor/outcomes/:outcomeId", async (req, res) => withResourceActor(req, res, "outcome", "outcomeId", async (actor, outcomeId) => ({
  outcome: await updateOutcome({
    actor, outcomeId, expectedVersion: recordVersion(req),
    outcomeDate: optionalDefinedDate(req.body?.outcomeDate),
    verificationStatus: optionalDefinedString(req.body?.verificationStatus),
    sourceReference: optionalString(req.body?.sourceReference), notes: optionalString(req.body?.notes),
  }), persistenceStatus: "persistent",
})));

router.post("/advisor/cases/:caseId/placements", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  placement: await createPlacement({
    actor, caseId, employerName: requiredString(req.body?.employerName),
    roleTitle: requiredString(req.body?.roleTitle), startDate: optionalDate(req.body?.startDate),
    employmentType: optionalString(req.body?.employmentType), location: optionalString(req.body?.location),
    salaryAmount: optionalNumber(req.body?.salaryAmount), salaryCurrency: optionalString(req.body?.salaryCurrency),
    salaryPeriod: optionalString(req.body?.salaryPeriod), sourceOpportunityId: optionalString(req.body?.sourceOpportunityId),
    offerStatus: requiredString(req.body?.offerStatus), verificationStatus: requiredString(req.body?.verificationStatus),
    supersedesPlacementId: optionalString(req.body?.supersedesPlacementId),
    idempotencyKey: idempotencyKey(req),
  }), persistenceStatus: "persistent",
})));
router.get("/advisor/cases/:caseId/placements", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  items: await listPlacements(actor, caseId), persistenceStatus: "persistent",
})));
router.get("/advisor/placements/:placementId", async (req, res) => withResourceActor(req, res, "placement", "placementId", async (actor, placementId) => ({
  placement: await getPlacement(actor, placementId), persistenceStatus: "persistent",
})));
router.patch("/advisor/placements/:placementId", async (req, res) => withResourceActor(req, res, "placement", "placementId", async (actor, placementId) => ({
  placement: await updatePlacement({
    actor, placementId, expectedVersion: recordVersion(req),
    employerName: optionalDefinedString(req.body?.employerName), roleTitle: optionalDefinedString(req.body?.roleTitle),
    startDate: optionalDate(req.body?.startDate), employmentType: optionalString(req.body?.employmentType),
    location: optionalString(req.body?.location), salaryAmount: optionalNumber(req.body?.salaryAmount),
    salaryCurrency: optionalString(req.body?.salaryCurrency), salaryPeriod: optionalString(req.body?.salaryPeriod),
    offerStatus: optionalDefinedString(req.body?.offerStatus), verificationStatus: optionalDefinedString(req.body?.verificationStatus),
  }), persistenceStatus: "persistent",
})));

router.post("/advisor/cases/:caseId/follow-ups", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  followUp: await createFollowUp({
    actor, caseId, followUpType: requiredString(req.body?.followUpType),
    dueAt: requiredDate(req.body?.dueAt), relatedActionId: optionalString(req.body?.relatedActionId),
    relatedSessionId: optionalString(req.body?.relatedSessionId), idempotencyKey: idempotencyKey(req),
  }), persistenceStatus: "persistent",
})));
router.get("/advisor/cases/:caseId/follow-ups", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  items: await listFollowUps(actor, caseId), persistenceStatus: "persistent",
})));
router.get("/advisor/follow-ups/:followUpId", async (req, res) => withResourceActor(req, res, "follow_up", "followUpId", async (actor, followUpId) => ({
  followUp: await getFollowUp(actor, followUpId), persistenceStatus: "persistent",
})));
router.patch("/advisor/follow-ups/:followUpId", async (req, res) => withResourceActor(req, res, "follow_up", "followUpId", async (actor, followUpId) => ({
  followUp: await updateFollowUp({
    actor, followUpId, expectedVersion: recordVersion(req),
    followUpType: optionalDefinedString(req.body?.followUpType), dueAt: optionalDefinedDate(req.body?.dueAt),
  }), persistenceStatus: "persistent",
})));
router.post("/advisor/follow-ups/:followUpId/complete", async (req, res) => followUpTransition(req, res, completeFollowUp));
router.post("/advisor/follow-ups/:followUpId/cancel", async (req, res) => followUpTransition(req, res, cancelFollowUp));

router.post("/advisor/cases/:caseId/sessions", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  session: await createSession({
    actor, caseId, sessionType: requiredString(req.body?.sessionType),
    deliveryMode: requiredString(req.body?.deliveryMode),
    scheduledStart: optionalDate(req.body?.scheduledStart), scheduledEnd: optionalDate(req.body?.scheduledEnd),
    idempotencyKey: idempotencyKey(req),
  }), persistenceStatus: "persistent",
})));
router.get("/advisor/cases/:caseId/sessions", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  items: await listSessions(actor, caseId), persistenceStatus: "persistent",
})));
router.get("/advisor/sessions/:sessionId", async (req, res) => withResourceActor(req, res, "session", "sessionId", async (actor, sessionId) => ({
  session: await getSession(actor, sessionId), persistenceStatus: "persistent",
})));
router.patch("/advisor/sessions/:sessionId", async (req, res) => withResourceActor(req, res, "session", "sessionId", async (actor, sessionId) => ({
  session: await updateSession({
    actor, sessionId, expectedVersion: recordVersion(req), sessionType: optionalDefinedString(req.body?.sessionType),
    scheduledStart: optionalDate(req.body?.scheduledStart), scheduledEnd: optionalDate(req.body?.scheduledEnd),
    deliveryMode: optionalDefinedString(req.body?.deliveryMode),
    locationOrProviderReference: optionalString(req.body?.locationOrProviderReference),
  }), persistenceStatus: "persistent",
})));
router.post("/advisor/sessions/:sessionId/confirm", async (req, res) => sessionTransition(req, res, confirmSession));
router.post("/advisor/sessions/:sessionId/start", async (req, res) => sessionTransition(req, res, startSession));
router.post("/advisor/sessions/:sessionId/complete", async (req, res) => sessionTransition(req, res, completeSession));
router.post("/advisor/sessions/:sessionId/cancel", async (req, res) => sessionTransition(req, res, cancelSession));
router.post("/advisor/sessions/:sessionId/reschedule", async (req, res) => withResourceActor(req, res, "session", "sessionId", async (actor, sessionId) => ({
  session: await rescheduleSession({
    actor, sessionId, expectedVersion: recordVersion(req),
    scheduledStart: requiredDate(req.body?.scheduledStart), scheduledEnd: optionalDate(req.body?.scheduledEnd),
    reason: requiredString(req.body?.reason), idempotencyKey: idempotencyKey(req),
  }), persistenceStatus: "persistent",
})));

router.post("/advisor/sessions/:sessionId/notes", async (req, res) => withResourceActor(req, res, "session", "sessionId", async (actor, sessionId) => {
  const session = await getSession(actor, sessionId);
  return {
    note: await createSessionNote({
      actor, sessionId, caseId: session.caseId,
      noteType: enumValue(req.body?.noteType, ["advisor_private","client_visible","administrative"]),
      visibilityScope: enumValue(req.body?.visibilityScope, ["client_and_advisor","advisor_private","admin_only"]),
      content: requiredString(req.body?.content),
    }), persistenceStatus: "persistent",
  };
}));
router.get("/advisor/sessions/:sessionId/notes", async (req, res) => withResourceActor(req, res, "session", "sessionId", async (actor, sessionId) => ({
  items: await listSessionNotes(actor, sessionId), persistenceStatus: "persistent",
})));
router.patch("/advisor/session-notes/:noteId", async (req, res) => withResourceActor(req, res, "session_note", "noteId", async (actor, noteId) => ({
  note: await updateSessionNote({
    actor, noteId, expectedVersion: recordVersion(req), content: requiredString(req.body?.content),
  }), persistenceStatus: "persistent",
})));
router.delete("/advisor/session-notes/:noteId", async (req, res) => withResourceActor(req, res, "session_note", "noteId", async (actor, noteId) => ({
  note: await deleteSessionNote({ actor, noteId, expectedVersion: recordVersion(req) }),
  persistenceStatus: "persistent",
})));
router.post("/advisor/sessions/:sessionId/summaries", async (req, res) => withResourceActor(req, res, "session", "sessionId", async (actor, sessionId) => {
  const session = await getSession(actor, sessionId);
  return {
    summary: await publishSessionSummary({
      actor, sessionId, caseId: session.caseId, summaryVersion: requiredInteger(req.body?.summaryVersion),
      sessionObjective: requiredString(req.body?.sessionObjective),
      clientVisibleSummary: requiredString(req.body?.clientVisibleSummary),
      supersedesSummaryId: optionalString(req.body?.supersedesSummaryId),
      idempotencyKey: idempotencyKey(req),
    }), persistenceStatus: "persistent",
  };
}));
router.get("/advisor/sessions/:sessionId/summaries", async (req, res) => withResourceActor(req, res, "session", "sessionId", async (actor, sessionId) => ({
  items: await listSessionSummaries(actor, sessionId), persistenceStatus: "persistent",
})));

router.post("/advisor/cases/:caseId/exports", async (req, res) => withCaseActor(req, res, async (actor, caseId) => ({
  export: await buildAdvisorCaseExport({
    actor, caseId, format: enumValue(req.body?.format, [
      "client_session_summary","agreed_action_plan","case_progress_summary","case_closure_summary","advisor_review_summary",
    ]),
  }), persistenceStatus: "persistent",
})));

async function withCaseActor(
  req: Request, res: Response,
  operation: (actor: AdvisorWorkspaceActor, caseId: string) => Promise<unknown>,
) {
  await respond(res, async () => {
    const caseId = requiredParam(req, "caseId");
    return operation(await resolveCaseActor(req.user!.userId, caseId), caseId);
  });
}
async function withResourceActor(
  req: Request, res: Response,
  kind: Parameters<typeof resolveOperationalActor>[1], parameter: string,
  operation: (actor: AdvisorWorkspaceActor, id: string) => Promise<unknown>,
) {
  await respond(res, async () => {
    const id = requiredParam(req, parameter);
    return operation(await resolveOperationalActor(req.user!.userId, kind, id), id);
  });
}
async function actionTransition(
  req: Request, res: Response,
  operation: typeof markActionCompleted,
) {
  await withResourceActor(req, res, "action", "actionId", async (actor, actionId) => ({
    action: await operation({
      actor, actionId, expectedVersion: recordVersion(req),
      completionInformation: optionalString(req.body?.completionInformation),
      reason: optionalString(req.body?.reason),
    }), persistenceStatus: "persistent",
  }));
}
async function evidenceTransition(
  req: Request, res: Response,
  operation: (actor: AdvisorWorkspaceActor, requestId: string) => Promise<unknown>,
) {
  await withResourceActor(req, res, "evidence_request", "requestId", async (actor, requestId) => ({
    evidenceRequest: await operation(actor, requestId), persistenceStatus: "persistent",
  }));
}
async function reviewTransition(
  req: Request, res: Response,
  operation: (actor: AdvisorWorkspaceActor, reviewId: string) => Promise<unknown>,
) {
  await withResourceActor(req, res, "review", "reviewId", async (actor, reviewId) => ({
    review: await operation(actor, reviewId), persistenceStatus: "persistent",
  }));
}
async function followUpTransition(
  req: Request, res: Response,
  operation: typeof completeFollowUp,
) {
  await withResourceActor(req, res, "follow_up", "followUpId", async (actor, followUpId) => ({
    followUp: await operation({ actor, followUpId, expectedVersion: recordVersion(req) }),
    persistenceStatus: "persistent",
  }));
}
async function sessionTransition(
  req: Request, res: Response,
  operation: typeof confirmSession,
) {
  await withResourceActor(req, res, "session", "sessionId", async (actor, sessionId) => ({
    session: await operation({
      actor, sessionId, expectedVersion: recordVersion(req),
      reason: optionalString(req.body?.reason),
    }), persistenceStatus: "persistent",
  }));
}
async function respond(res: Response, operation: () => Promise<unknown>) {
  await persistentResponse(res, operation);
}
function requiredParam(req: Request, name: string) {
  const value = req.params[name];
  if (typeof value !== "string" || !value) throw coded("validation_failed");
  return value;
}
function idempotencyKey(req: Request) {
  const value = req.headers["idempotency-key"];
  if (typeof value !== "string" || !value.trim()) throw coded("idempotency_key_required");
  return value.trim();
}
function recordVersion(req: Request) {
  const value = Number(req.headers["if-match"] ?? req.body?.recordVersion);
  if (!Number.isInteger(value) || value < 1) throw coded("record_version_conflict");
  return value;
}
function requiredString(value: unknown) {
  if (typeof value !== "string" || !value.trim()) throw coded("validation_failed");
  return value.trim();
}
function optionalString(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  return requiredString(value);
}
function optionalDefinedString(value: unknown) {
  if (value === undefined) return undefined;
  return requiredString(value);
}
function requiredDate(value: unknown) {
  const result = optionalDate(value);
  if (!result) throw coded("validation_failed");
  return result;
}
function optionalDate(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw coded("validation_failed");
  const result = new Date(value);
  if (Number.isNaN(result.getTime())) throw coded("validation_failed");
  return result;
}
function optionalDefinedDate(value: unknown) {
  if (value === undefined) return undefined;
  return requiredDate(value);
}
function requiredInteger(value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 1) throw coded("validation_failed");
  return Number(value);
}
function optionalNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isFinite(value)) throw coded("validation_failed");
  return value;
}
function enumValue<const T extends readonly string[]>(value: unknown, allowed: T): T[number] {
  if (typeof value !== "string" || !allowed.includes(value)) throw coded("validation_failed");
  return value as T[number];
}
function coded(code: string) {
  return Object.assign(new Error(code), { code });
}

export default router;
