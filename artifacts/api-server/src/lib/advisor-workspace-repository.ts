import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import {
  careerDataAdvisorActionsTable,
  careerDataAdvisorActivityEventsTable,
  careerDataAdvisorCapacityTable,
  careerDataAdvisorCaseResourcesTable,
  careerDataAdvisorCasesTable,
  careerDataAdvisorCommentsTable,
  careerDataAdvisorEvidenceRequestsTable,
  careerDataAdvisorFollowUpsTable,
  careerDataAdvisorGrantsTable,
  careerDataAdvisorOutcomesTable,
  careerDataAdvisorPlacementsTable,
  careerDataAdvisorProfilesTable,
  careerDataAdvisorReviewItemsTable,
  careerDataAdvisorSessionNotesTable,
  careerDataAdvisorSessionSummariesTable,
  careerDataAdvisorSessionsTable,
  careerDataAuditEventsTable,
  careerDataIdempotencyTable,
  db,
} from "@workspace/db";
import {
  advisorScopes,
  calculateFollowUpStatus,
  requireDurableReviewResource,
  reviewDecisionState,
  transitionAction,
  transitionCase,
  transitionEvidenceRequest,
  transitionReview,
  transitionSession,
  type ActionStatus,
  type AdvisorCase,
  type AdvisorScope,
  type CaseStage,
  type CaseStatus,
  type EvidenceRequestStatus,
  type EvidenceReviewDecision,
  type ReviewResourceType,
  type ReviewStatus,
  type SessionStatus,
} from "@workspace/advisor-workspace";
import { metricForActivity, recordAdvisorMetric } from "./advisor-observability";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ActorRole = "client" | "advisor";
export type AdvisorWorkspaceActor = { userId: number; role: ActorRole };
type Actor = AdvisorWorkspaceActor;

export async function createAdvisorProfile(input: {
  advisorUserId: number;
  displayName: string;
  professionalTitle?: string | null;
  idempotencyKey: string;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.advisorUserId);
    const operation = "advisor_profile_create";
    const replayedResourceId = await replay(tx, input.advisorUserId, operation, input.idempotencyKey, {
      displayName: input.displayName,
      professionalTitle: input.professionalTitle ?? null,
    });
    if (replayedResourceId) return getAdvisorProfile(input.advisorUserId);
    const id = `advisor_${randomUUID()}`;
    const [row] = await tx.insert(careerDataAdvisorProfilesTable).values({
      id,
      advisorUserId: input.advisorUserId,
      displayName: input.displayName.trim(),
      professionalTitle: input.professionalTitle?.trim() || null,
      verificationStatus: "unverified",
      accountStatus: "inactive",
      capacityStatus: "not_accepting_new_clients",
    }).returning();
    await remember(tx, input.advisorUserId, operation, input.idempotencyKey, {
      displayName: input.displayName,
      professionalTitle: input.professionalTitle ?? null,
    }, "advisor_profile", id);
    await activity(tx, {
      ownerUserId: input.advisorUserId, actorUserId: input.advisorUserId,
      advisorUserId: input.advisorUserId, eventType: "advisor_profile_created",
      resourceType: "advisor_profile", resourceId: id,
    });
    return row!;
  });
}

export async function getAdvisorProfile(advisorUserId: number) {
  const [row] = await db.select().from(careerDataAdvisorProfilesTable).where(and(
    eq(careerDataAdvisorProfilesTable.advisorUserId, advisorUserId),
    isNull(careerDataAdvisorProfilesTable.deletedAt),
  ));
  if (!row) throw repositoryError("resource_not_found");
  return row;
}

export async function updateAdvisorProfile(input: {
  advisorUserId: number;
  expectedVersion: number;
  displayName?: string;
  professionalTitle?: string | null;
}) {
  const [row] = await db.update(careerDataAdvisorProfilesTable).set({
    ...(input.displayName === undefined ? {} : { displayName: input.displayName.trim() }),
    ...(input.professionalTitle === undefined ? {} : { professionalTitle: input.professionalTitle?.trim() || null }),
    updatedAt: new Date(),
    recordVersion: sql`${careerDataAdvisorProfilesTable.recordVersion} + 1`,
  }).where(and(
    eq(careerDataAdvisorProfilesTable.advisorUserId, input.advisorUserId),
    eq(careerDataAdvisorProfilesTable.recordVersion, input.expectedVersion),
    isNull(careerDataAdvisorProfilesTable.deletedAt),
  )).returning();
  if (!row) await profileConflict(input.advisorUserId, input.expectedVersion);
  return row!;
}

export async function setAdvisorCapacity(input: {
  advisorUserId: number;
  capacityStatus: string;
  maximumActiveCases?: number | null;
  availableSessionSlots?: number | null;
  serviceCategories?: string[];
  expectedVersion?: number;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.advisorUserId);
    const profile = await requireAdvisorProfile(tx, input.advisorUserId, false);
    const [existing] = await tx.select().from(careerDataAdvisorCapacityTable)
      .where(eq(careerDataAdvisorCapacityTable.advisorProfileId, profile.id));
    if (!existing) {
      const [created] = await tx.insert(careerDataAdvisorCapacityTable).values({
        id: `capacity_${randomUUID()}`, advisorProfileId: profile.id,
        capacityStatus: input.capacityStatus,
        maximumActiveCases: input.maximumActiveCases ?? null,
        availableSessionSlots: input.availableSessionSlots ?? null,
        serviceCategories: input.serviceCategories ?? [],
      }).returning();
      return created!;
    }
    if (input.expectedVersion === undefined || input.expectedVersion !== existing.recordVersion)
      throw repositoryError("record_version_conflict");
    const [updated] = await tx.update(careerDataAdvisorCapacityTable).set({
      capacityStatus: input.capacityStatus,
      maximumActiveCases: input.maximumActiveCases ?? null,
      availableSessionSlots: input.availableSessionSlots ?? null,
      serviceCategories: input.serviceCategories ?? [],
      updatedAt: new Date(),
      recordVersion: sql`${careerDataAdvisorCapacityTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorCapacityTable.id, existing.id),
      eq(careerDataAdvisorCapacityTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!updated) throw repositoryError("record_version_conflict");
    return updated;
  });
}

export async function getAdvisorCapacity(advisorUserId: number) {
  const profile = await getAdvisorProfile(advisorUserId);
  const [row] = await db.select().from(careerDataAdvisorCapacityTable)
    .where(eq(careerDataAdvisorCapacityTable.advisorProfileId, profile.id));
  return row ?? null;
}

export async function createCase(input: {
  ownerUserId: number;
  advisorUserId: number;
  advisorGrantId: string;
  serviceType: string;
  priority?: string;
  idempotencyKey: string;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.ownerUserId);
    const operation = "advisor_case_create";
    const fields = {
      advisorUserId: input.advisorUserId, advisorGrantId: input.advisorGrantId,
      serviceType: input.serviceType, priority: input.priority ?? "standard",
    };
    const prior = await replay(tx, input.ownerUserId, operation, input.idempotencyKey, fields);
    if (prior) return requireCase(tx, { userId: input.ownerUserId, role: "client" }, prior, "case_manage", true);
    const profile = await requireAdvisorProfile(tx, input.advisorUserId, true);
    await requireGrant(tx, {
      grantId: input.advisorGrantId, ownerUserId: input.ownerUserId,
      advisorUserId: input.advisorUserId, scope: "case_manage",
    });
    const id = `case_${randomUUID()}`;
    const [row] = await tx.insert(careerDataAdvisorCasesTable).values({
      id, ownerUserId: input.ownerUserId, advisorUserId: input.advisorUserId,
      advisorProfileId: profile.id, advisorGrantId: input.advisorGrantId,
      serviceType: input.serviceType, caseStatus: "pending_acceptance", caseStage: "intake",
      priority: input.priority ?? "standard", createdBy: input.ownerUserId,
      updatedBy: input.ownerUserId, retentionClass: "advisor_case",
    }).returning();
    await remember(tx, input.ownerUserId, operation, input.idempotencyKey, fields, "advisor_case", id);
    await activity(tx, {
      caseId: id, ownerUserId: input.ownerUserId, advisorUserId: input.advisorUserId,
      actorUserId: input.ownerUserId, eventType: "case_created",
      resourceType: "advisor_case", resourceId: id,
    });
    return row!;
  });
}

export async function listClientCases(ownerUserId: number) {
  return db.select().from(careerDataAdvisorCasesTable).where(and(
    eq(careerDataAdvisorCasesTable.ownerUserId, ownerUserId),
    isNull(careerDataAdvisorCasesTable.deletedAt),
  )).orderBy(desc(careerDataAdvisorCasesTable.updatedAt));
}

export async function listAdvisorCases(advisorUserId: number) {
  return db.transaction(async (tx) => {
    await setActor(tx, advisorUserId);
    await requireAdvisorProfile(tx, advisorUserId, true);
    return tx.select().from(careerDataAdvisorCasesTable).where(and(
      eq(careerDataAdvisorCasesTable.advisorUserId, advisorUserId),
      isNull(careerDataAdvisorCasesTable.deletedAt),
    )).orderBy(desc(careerDataAdvisorCasesTable.updatedAt));
  });
}

export async function getCase(actor: Actor, caseId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    return requireCase(tx, actor, caseId, "case_manage", true);
  });
}

export async function transitionAdvisorCase(input: {
  actor: Actor;
  caseId: string;
  expectedVersion: number;
  nextStatus: CaseStatus;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireCase(tx, input.actor, input.caseId, "case_manage", false);
    if (input.actor.role === "client" && !["cancelled", "access_revoked"].includes(input.nextStatus))
      throw repositoryError("case_access_denied");
    const next = transitionCase(toDomainCase(current), input.nextStatus, input.expectedVersion);
    const [updated] = await tx.update(careerDataAdvisorCasesTable).set({
      caseStatus: next.caseStatus,
      closedAt: next.closedAt ? new Date(next.closedAt) : null,
      updatedBy: input.actor.userId,
      updatedAt: new Date(),
      recordVersion: sql`${careerDataAdvisorCasesTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorCasesTable.id, input.caseId),
      eq(careerDataAdvisorCasesTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!updated) throw repositoryError("record_version_conflict");
    await activity(tx, {
      caseId: current.id, ownerUserId: current.ownerUserId,
      advisorUserId: current.advisorUserId, actorUserId: input.actor.userId,
      eventType: input.nextStatus === "access_revoked" ? "access_revoked" : "case_status_changed",
      resourceType: "advisor_case", resourceId: current.id,
      metadata: { fromStatus: current.caseStatus, toStatus: input.nextStatus },
    });
    return updated;
  });
}

export const acceptCase = (input: Omit<Parameters<typeof transitionAdvisorCase>[0], "nextStatus">) =>
  transitionAdvisorCase({ ...input, nextStatus: "active" });
export const holdCase = (input: Omit<Parameters<typeof transitionAdvisorCase>[0], "nextStatus">) =>
  transitionAdvisorCase({ ...input, nextStatus: "on_hold" });
export const resumeCase = (input: Omit<Parameters<typeof transitionAdvisorCase>[0], "nextStatus">) =>
  transitionAdvisorCase({ ...input, nextStatus: "active" });
export const closeCase = (input: Omit<Parameters<typeof transitionAdvisorCase>[0], "nextStatus">) =>
  transitionAdvisorCase({ ...input, nextStatus: "closed" });
export const revokeCaseAccess = (input: Omit<Parameters<typeof transitionAdvisorCase>[0], "nextStatus">) =>
  transitionAdvisorCase({ ...input, nextStatus: "access_revoked" });

export async function linkCaseResource(input: {
  actor: Actor;
  caseId: string;
  resourceType: string;
  resourceId: string;
  requiredScope: AdvisorScope;
}) {
  if (!advisorScopes.includes(input.requiredScope)) throw repositoryError("advisor_scope_insufficient");
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const caseRow = await requireCase(tx, input.actor, input.caseId, input.requiredScope, false);
    if (input.actor.role !== "client") throw repositoryError("case_access_denied");
    await requireOwnedResource(tx, caseRow.ownerUserId, input.resourceType, input.resourceId);
    const [row] = await tx.insert(careerDataAdvisorCaseResourcesTable).values({
      id: `case_resource_${randomUUID()}`, caseId: caseRow.id,
      ownerUserId: caseRow.ownerUserId, resourceType: input.resourceType,
      resourceId: input.resourceId, requiredScope: input.requiredScope,
      createdBy: input.actor.userId,
    }).returning();
    return row!;
  });
}

export async function listCaseResources(actor: Actor, caseId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    await requireCase(tx, actor, caseId, "case_manage", true);
    return tx.select().from(careerDataAdvisorCaseResourcesTable).where(and(
      eq(careerDataAdvisorCaseResourcesTable.caseId, caseId),
      isNull(careerDataAdvisorCaseResourcesTable.revokedAt),
    ));
  });
}

export async function createSession(input: {
  actor: Actor; caseId: string; sessionType: string; deliveryMode: string;
  scheduledStart?: Date | null; scheduledEnd?: Date | null; idempotencyKey: string;
}) {
  if (input.actor.role !== "advisor") throw repositoryError("case_access_denied");
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const caseRow = await requireOperationalCase(tx, input.actor, input.caseId, "case_manage");
    const operation = "advisor_session_create";
    const fields = { caseId: input.caseId, sessionType: input.sessionType, scheduledStart: input.scheduledStart?.toISOString() ?? null };
    const prior = await replay(tx, caseRow.ownerUserId, operation, input.idempotencyKey, fields);
    if (prior) {
      const [row] = await tx.select().from(careerDataAdvisorSessionsTable).where(eq(careerDataAdvisorSessionsTable.id, prior));
      return row!;
    }
    const id = `session_${randomUUID()}`;
    const [row] = await tx.insert(careerDataAdvisorSessionsTable).values({
      id, caseId: caseRow.id, ownerUserId: caseRow.ownerUserId,
      advisorUserId: caseRow.advisorUserId, sessionType: input.sessionType,
      sessionStatus: "scheduled", deliveryMode: input.deliveryMode,
      scheduledStart: input.scheduledStart ?? null, scheduledEnd: input.scheduledEnd ?? null,
      locationOrProviderReference: null,
      createdBy: input.actor.userId, updatedBy: input.actor.userId,
    }).returning();
    await remember(tx, caseRow.ownerUserId, operation, input.idempotencyKey, fields, "advisor_session", id);
    await activity(tx, operationalEvent(caseRow, input.actor.userId, "session_created", "advisor_session", id, {
      sessionType: input.sessionType, status: "scheduled",
    }));
    return row!;
  });
}

export async function createSessionNote(input: {
  actor: Actor; caseId: string; sessionId: string;
  noteType: "advisor_private" | "client_visible" | "administrative";
  visibilityScope: "client_and_advisor" | "advisor_private" | "admin_only";
  content: string;
}) {
  if (input.actor.role !== "advisor") throw repositoryError("case_access_denied");
  if (input.noteType === "advisor_private" && input.visibilityScope !== "advisor_private")
    throw repositoryError("invalid_note_visibility");
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const caseRow = await requireOperationalCase(tx, input.actor, input.caseId, "case_manage");
    await requireSession(tx, input.sessionId, input.caseId);
    const [row] = await tx.insert(careerDataAdvisorSessionNotesTable).values({
      id: `note_${randomUUID()}`, sessionId: input.sessionId, caseId: input.caseId,
      ownerUserId: caseRow.ownerUserId, advisorUserId: caseRow.advisorUserId,
      noteType: input.noteType, visibilityScope: input.visibilityScope,
      content: plainText(input.content), createdBy: input.actor.userId,
      updatedBy: input.actor.userId, retentionClass: "advisor_note",
    }).returning();
    return row!;
  });
}

export async function listVisibleSessionNotes(actor: Actor, caseId: string, sessionId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    await requireCase(tx, actor, caseId, "case_manage", true);
    await requireSession(tx, sessionId, caseId);
    const conditions = [
      eq(careerDataAdvisorSessionNotesTable.caseId, caseId),
      eq(careerDataAdvisorSessionNotesTable.sessionId, sessionId),
      isNull(careerDataAdvisorSessionNotesTable.deletedAt),
    ];
    if (actor.role === "client")
      conditions.push(eq(careerDataAdvisorSessionNotesTable.visibilityScope, "client_and_advisor"));
    return tx.select().from(careerDataAdvisorSessionNotesTable).where(and(...conditions));
  });
}

export async function publishSessionSummary(input: {
  actor: Actor; caseId: string; sessionId: string; summaryVersion: number;
  sessionObjective: string; clientVisibleSummary: string; supersedesSummaryId?: string | null;
  idempotencyKey: string;
}) {
  if (input.actor.role !== "advisor") throw repositoryError("case_access_denied");
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const caseRow = await requireOperationalCase(tx, input.actor, input.caseId, "case_manage");
    const session = await requireSessionRecord(tx, input.sessionId);
    if (session.caseId !== input.caseId) throw repositoryError("resource_not_found");
    if (session.sessionStatus !== "completed") throw repositoryError("session_not_completed");
    if (input.supersedesSummaryId) {
      const [priorSummary] = await tx.select().from(careerDataAdvisorSessionSummariesTable).where(and(
        eq(careerDataAdvisorSessionSummariesTable.id, input.supersedesSummaryId),
        eq(careerDataAdvisorSessionSummariesTable.sessionId, input.sessionId),
        eq(careerDataAdvisorSessionSummariesTable.caseId, input.caseId),
      ));
      if (!priorSummary || input.summaryVersion !== priorSummary.summaryVersion + 1)
        throw repositoryError("invalid_summary_version");
    } else if (input.summaryVersion !== 1) {
      throw repositoryError("invalid_summary_version");
    }
    const operation = "advisor_summary_publish";
    const fields = { caseId: input.caseId, sessionId: input.sessionId, summaryVersion: input.summaryVersion };
    const prior = await replay(tx, caseRow.ownerUserId, operation, input.idempotencyKey, fields);
    if (prior) {
      const [row] = await tx.select().from(careerDataAdvisorSessionSummariesTable).where(eq(careerDataAdvisorSessionSummariesTable.id, prior));
      return row!;
    }
    const id = `summary_${randomUUID()}`;
    const [row] = await tx.insert(careerDataAdvisorSessionSummariesTable).values({
      id, sessionId: input.sessionId, caseId: input.caseId,
      ownerUserId: caseRow.ownerUserId, advisorUserId: caseRow.advisorUserId,
      summaryVersion: input.summaryVersion, sessionObjective: plainText(input.sessionObjective),
      clientVisibleSummary: plainText(input.clientVisibleSummary),
      topicsDiscussed: [], keyObservations: [], agreedDecisions: [], risksOrBlockers: [],
      createdBy: input.actor.userId, supersedesSummaryId: input.supersedesSummaryId ?? null,
    }).returning();
    await remember(tx, caseRow.ownerUserId, operation, input.idempotencyKey, fields, "advisor_summary", id);
    await activity(tx, operationalEvent(caseRow, input.actor.userId, "session_summary_published", "advisor_summary", id, {
      summaryVersion: input.summaryVersion, supersedesSummaryId: input.supersedesSummaryId ?? null,
    }));
    return row!;
  });
}

export async function resolveCaseActor(userId: number, caseId: string): Promise<Actor> {
  return db.transaction(async (tx) => {
    await setActor(tx, userId);
    const [row] = await tx.select({
      ownerUserId: careerDataAdvisorCasesTable.ownerUserId,
      advisorUserId: careerDataAdvisorCasesTable.advisorUserId,
    }).from(careerDataAdvisorCasesTable).where(and(
      eq(careerDataAdvisorCasesTable.id, caseId),
      isNull(careerDataAdvisorCasesTable.deletedAt),
    ));
    if (!row) throw repositoryError("resource_not_found");
    if (row.ownerUserId === userId) return { userId, role: "client" };
    if (row.advisorUserId === userId) return { userId, role: "advisor" };
    throw repositoryError("resource_not_found");
  });
}

export async function resolveOperationalActor(
  userId: number,
  kind: "action"|"evidence_request"|"review"|"comment"|"outcome"|"placement"|"follow_up"|"session"|"session_note"|"summary",
  resourceId: string,
): Promise<Actor> {
  return db.transaction(async (tx) => {
    await setActor(tx, userId);
    let caseId: string|undefined;
    if (kind === "action") {
      [caseId] = (await tx.select({ caseId: careerDataAdvisorActionsTable.caseId }).from(careerDataAdvisorActionsTable)
        .where(eq(careerDataAdvisorActionsTable.id, resourceId))).map((row) => row.caseId);
    } else if (kind === "evidence_request") {
      [caseId] = (await tx.select({ caseId: careerDataAdvisorEvidenceRequestsTable.caseId }).from(careerDataAdvisorEvidenceRequestsTable)
        .where(eq(careerDataAdvisorEvidenceRequestsTable.id, resourceId))).map((row) => row.caseId);
    } else if (kind === "review") {
      [caseId] = (await tx.select({ caseId: careerDataAdvisorReviewItemsTable.caseId }).from(careerDataAdvisorReviewItemsTable)
        .where(eq(careerDataAdvisorReviewItemsTable.id, resourceId))).map((row) => row.caseId);
    } else if (kind === "comment") {
      [caseId] = (await tx.select({ caseId: careerDataAdvisorCommentsTable.caseId }).from(careerDataAdvisorCommentsTable)
        .where(eq(careerDataAdvisorCommentsTable.id, resourceId))).map((row) => row.caseId);
    } else if (kind === "outcome") {
      [caseId] = (await tx.select({ caseId: careerDataAdvisorOutcomesTable.caseId }).from(careerDataAdvisorOutcomesTable)
        .where(eq(careerDataAdvisorOutcomesTable.id, resourceId))).map((row) => row.caseId);
    } else if (kind === "placement") {
      [caseId] = (await tx.select({ caseId: careerDataAdvisorPlacementsTable.caseId }).from(careerDataAdvisorPlacementsTable)
        .where(eq(careerDataAdvisorPlacementsTable.id, resourceId))).map((row) => row.caseId);
    } else if (kind === "follow_up") {
      [caseId] = (await tx.select({ caseId: careerDataAdvisorFollowUpsTable.caseId }).from(careerDataAdvisorFollowUpsTable)
        .where(eq(careerDataAdvisorFollowUpsTable.id, resourceId))).map((row) => row.caseId);
    } else if (kind === "session") {
      [caseId] = (await tx.select({ caseId: careerDataAdvisorSessionsTable.caseId }).from(careerDataAdvisorSessionsTable)
        .where(eq(careerDataAdvisorSessionsTable.id, resourceId))).map((row) => row.caseId);
    } else if (kind === "session_note") {
      [caseId] = (await tx.select({ caseId: careerDataAdvisorSessionNotesTable.caseId }).from(careerDataAdvisorSessionNotesTable)
        .where(eq(careerDataAdvisorSessionNotesTable.id, resourceId))).map((row) => row.caseId);
    } else {
      [caseId] = (await tx.select({ caseId: careerDataAdvisorSessionSummariesTable.caseId }).from(careerDataAdvisorSessionSummariesTable)
        .where(eq(careerDataAdvisorSessionSummariesTable.id, resourceId))).map((row) => row.caseId);
    }
    if (!caseId) throw repositoryError("resource_not_found");
    const [caseRow] = await tx.select({
      ownerUserId: careerDataAdvisorCasesTable.ownerUserId,
      advisorUserId: careerDataAdvisorCasesTable.advisorUserId,
    }).from(careerDataAdvisorCasesTable).where(and(
      eq(careerDataAdvisorCasesTable.id, caseId),
      isNull(careerDataAdvisorCasesTable.deletedAt),
    ));
    if (!caseRow) throw repositoryError("resource_not_found");
    if (caseRow.ownerUserId === userId) return { userId, role: "client" };
    if (caseRow.advisorUserId === userId) return { userId, role: "advisor" };
    throw repositoryError("resource_not_found");
  });
}

export async function createAction(input: {
  actor: Actor; caseId: string; assignedTo: "client"|"advisor"; actionType: string;
  title: string; description: string; priority: string; dueAt?: Date|null;
  sourceSessionId?: string|null; relatedResourceType?: string|null; relatedResourceId?: string|null;
  completionEvidenceRequired?: boolean; idempotencyKey: string;
}) {
  if (input.actor.role !== "advisor") throw repositoryError("case_access_denied");
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const caseRow = await requireOperationalCase(tx, input.actor, input.caseId, "case_manage");
    if (input.sourceSessionId) await requireSession(tx, input.sourceSessionId, input.caseId);
    const fields = {
      caseId: input.caseId, assignedTo: input.assignedTo, actionType: input.actionType,
      title: input.title, dueAt: input.dueAt?.toISOString() ?? null,
      sourceSessionId: input.sourceSessionId ?? null,
      relatedResourceType: input.relatedResourceType ?? null,
      relatedResourceId: input.relatedResourceId ?? null,
    };
    const prior = await replay(tx, caseRow.ownerUserId, "advisor_action_create", input.idempotencyKey, fields);
    if (prior) return requireAction(tx, input.actor, prior, false);
    const id = `action_${randomUUID()}`;
    const [row] = await tx.insert(careerDataAdvisorActionsTable).values({
      id, caseId: caseRow.id, ownerUserId: caseRow.ownerUserId,
      advisorUserId: caseRow.advisorUserId, assignedTo: input.assignedTo,
      actionType: plainText(input.actionType), title: plainText(input.title),
      description: plainText(input.description), priority: plainText(input.priority),
      status: "not_started", dueAt: input.dueAt ?? null,
      sourceSessionId: input.sourceSessionId ?? null,
      relatedResourceType: input.relatedResourceType ?? null,
      relatedResourceId: input.relatedResourceId ?? null,
      completionEvidenceRequired: input.completionEvidenceRequired ?? false,
      createdBy: input.actor.userId, updatedBy: input.actor.userId,
    }).returning();
    await remember(tx, caseRow.ownerUserId, "advisor_action_create", input.idempotencyKey, fields, "advisor_action", id);
    await activity(tx, operationalEvent(caseRow, input.actor.userId, "action_created", "advisor_action", id, {
      assignedTo: input.assignedTo, status: "not_started",
    }));
    return row!;
  });
}

export async function listCaseActions(actor: Actor, caseId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    await requireCase(tx, actor, caseId, "case_manage", true);
    return tx.select().from(careerDataAdvisorActionsTable)
      .where(eq(careerDataAdvisorActionsTable.caseId, caseId))
      .orderBy(desc(careerDataAdvisorActionsTable.updatedAt));
  });
}

export async function getAction(actor: Actor, actionId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    return requireAction(tx, actor, actionId, true);
  });
}

export async function updateAction(input: {
  actor: Actor; actionId: string; expectedVersion: number;
  title?: string; description?: string; priority?: string; dueAt?: Date|null;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireAction(tx, input.actor, input.actionId, false);
    if (input.actor.role === "client" && current.assignedTo !== "client")
      throw repositoryError("case_access_denied");
    const [row] = await tx.update(careerDataAdvisorActionsTable).set({
      ...(input.title === undefined ? {} : { title: plainText(input.title) }),
      ...(input.description === undefined ? {} : { description: plainText(input.description) }),
      ...(input.priority === undefined ? {} : { priority: plainText(input.priority) }),
      ...(input.dueAt === undefined ? {} : { dueAt: input.dueAt }),
      updatedBy: input.actor.userId, updatedAt: new Date(),
      recordVersion: sql`${careerDataAdvisorActionsTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorActionsTable.id, input.actionId),
      eq(careerDataAdvisorActionsTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    return row;
  });
}

export async function transitionActionRecord(input: {
  actor: Actor; actionId: string; expectedVersion: number; nextStatus: ActionStatus;
  completionInformation?: string|null; reason?: string|null;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireAction(tx, input.actor, input.actionId, false);
    const caseRow = await requireOperationalCase(tx, input.actor, current.caseId, "case_manage");
    if (input.actor.role === "client") {
      if (current.assignedTo !== "client") throw repositoryError("case_access_denied");
      if (input.nextStatus === "verified") throw repositoryError("advisor_verification_required");
      if (!["in_progress","completed"].includes(input.nextStatus))
        throw repositoryError("case_access_denied");
    }
    if (input.nextStatus === "verified") {
      if (input.actor.role !== "advisor") throw repositoryError("advisor_verification_required");
      if (current.completionEvidenceRequired && !current.completionInformation)
        throw repositoryError("completion_evidence_required");
    }
    if (["deferred","cancelled"].includes(input.nextStatus) && input.actor.role !== "advisor")
      throw repositoryError("case_access_denied");
    if (["deferred","cancelled"].includes(input.nextStatus) && !input.reason?.trim())
      throw repositoryError("decision_reason_required");
    transitionAction(current.status as ActionStatus, input.nextStatus);
    const now = new Date();
    const [row] = await tx.update(careerDataAdvisorActionsTable).set({
      status: input.nextStatus,
      completionInformation: input.completionInformation === undefined
        ? current.completionInformation : plainText(input.completionInformation ?? "") || null,
      statusReason: input.reason === undefined ? current.statusReason : plainText(input.reason ?? "") || null,
      completedAt: input.nextStatus === "completed" ? now : input.nextStatus === "in_progress" ? null : current.completedAt,
      verifiedAt: input.nextStatus === "verified" ? now : current.verifiedAt,
      updatedBy: input.actor.userId, updatedAt: now,
      recordVersion: sql`${careerDataAdvisorActionsTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorActionsTable.id, input.actionId),
      eq(careerDataAdvisorActionsTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    const eventType = input.nextStatus === "completed" ? "action_completed"
      : input.nextStatus === "verified" ? "action_verified" : "action_status_changed";
    await activity(tx, operationalEvent(caseRow, input.actor.userId, eventType, "advisor_action", input.actionId, {
      fromStatus: current.status, toStatus: input.nextStatus,
    }));
    return row;
  });
}

export const markActionCompleted = (input: Omit<Parameters<typeof transitionActionRecord>[0],"nextStatus">) =>
  transitionActionRecord({ ...input, nextStatus: "completed" });
export const verifyAction = (input: Omit<Parameters<typeof transitionActionRecord>[0],"nextStatus">) =>
  transitionActionRecord({ ...input, nextStatus: "verified" });
export const deferAction = (input: Omit<Parameters<typeof transitionActionRecord>[0],"nextStatus">) =>
  transitionActionRecord({ ...input, nextStatus: "deferred" });
export const cancelAction = (input: Omit<Parameters<typeof transitionActionRecord>[0],"nextStatus">) =>
  transitionActionRecord({ ...input, nextStatus: "cancelled" });

export async function createEvidenceRequest(input: {
  actor: Actor; caseId: string; evidenceType: string; description: string;
  relatedRequirement?: string|null; relatedResourceType?: string|null;
  relatedResourceId?: string|null; dueAt?: Date|null; idempotencyKey: string;
}) {
  if (input.actor.role !== "advisor") throw repositoryError("case_access_denied");
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const caseRow = await requireOperationalCase(tx, input.actor, input.caseId, "evidence_review");
    if (input.relatedResourceType && input.relatedResourceId)
      await requireLinkedCaseResource(tx, caseRow, input.relatedResourceType, input.relatedResourceId);
    const fields = {
      caseId: input.caseId, evidenceType: input.evidenceType,
      relatedRequirement: input.relatedRequirement ?? null,
      relatedResourceType: input.relatedResourceType ?? null,
      relatedResourceId: input.relatedResourceId ?? null,
      dueAt: input.dueAt?.toISOString() ?? null,
    };
    const prior = await replay(tx, caseRow.ownerUserId, "evidence_request_create", input.idempotencyKey, fields);
    if (prior) return requireEvidenceRequest(tx, input.actor, prior, false);
    const id = `evidence_request_${randomUUID()}`;
    const [row] = await tx.insert(careerDataAdvisorEvidenceRequestsTable).values({
      id, caseId: caseRow.id, ownerUserId: caseRow.ownerUserId,
      advisorUserId: caseRow.advisorUserId, requestedBy: input.actor.userId,
      requestedFrom: caseRow.ownerUserId, evidenceType: plainText(input.evidenceType),
      description: plainText(input.description),
      relatedRequirement: input.relatedRequirement ? plainText(input.relatedRequirement) : null,
      relatedResourceType: input.relatedResourceType ?? null,
      relatedResourceId: input.relatedResourceId ?? null,
      dueAt: input.dueAt ?? null, status: "requested",
      createdBy: input.actor.userId, updatedBy: input.actor.userId,
    }).returning();
    await remember(tx, caseRow.ownerUserId, "evidence_request_create", input.idempotencyKey, fields, "evidence_request", id);
    await activity(tx, operationalEvent(caseRow, input.actor.userId, "evidence_request_created", "evidence_request", id, {
      status: "requested", evidenceType: input.evidenceType,
    }));
    return row!;
  });
}

export async function listEvidenceRequests(actor: Actor, caseId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    await requireCase(tx, actor, caseId, "evidence_review", true);
    return tx.select().from(careerDataAdvisorEvidenceRequestsTable)
      .where(eq(careerDataAdvisorEvidenceRequestsTable.caseId, caseId))
      .orderBy(desc(careerDataAdvisorEvidenceRequestsTable.updatedAt));
  });
}

export async function getEvidenceRequest(actor: Actor, requestId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    return requireEvidenceRequest(tx, actor, requestId, true);
  });
}

export async function transitionEvidenceRequestRecord(input: {
  actor: Actor; requestId: string; expectedVersion: number; nextStatus: EvidenceRequestStatus;
  submittedEvidenceId?: string|null; reviewDecision?: EvidenceReviewDecision|null; reviewNotes?: string|null;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireEvidenceRequest(tx, input.actor, input.requestId, false);
    const caseRow = await requireOperationalCase(tx, input.actor, current.caseId, "evidence_review");
    if (input.actor.role === "client") {
      if (current.requestedFrom !== input.actor.userId) throw repositoryError("resource_not_found");
      if (!["submitted","withdrawn"].includes(input.nextStatus)) throw repositoryError("case_access_denied");
      if (input.nextStatus === "submitted") {
        if (!input.submittedEvidenceId) throw repositoryError("evidence_required");
        await requireOwnedResource(tx, caseRow.ownerUserId, "evidence_record", input.submittedEvidenceId);
      }
    } else if (["submitted","withdrawn"].includes(input.nextStatus) && input.nextStatus !== "submitted") {
      throw repositoryError("case_access_denied");
    }
    if (["accepted","rejected"].includes(input.nextStatus)) {
      if (input.actor.role !== "advisor" || !input.reviewDecision)
        throw repositoryError("advisor_verification_required");
      const allowed = new Set<EvidenceReviewDecision>([
        "accepted_as_supporting_evidence","accepted_with_limitations","needs_clarification",
        "insufficient","conflicting","out_of_scope",
      ]);
      if (!allowed.has(input.reviewDecision)) throw repositoryError("invalid_evidence_decision");
    }
    if (
      current.status === "submitted"
      && (input.nextStatus === "accepted" || input.nextStatus === "rejected")
    ) {
      transitionEvidenceRequest("submitted", "under_review");
      transitionEvidenceRequest("under_review", input.nextStatus);
    } else {
      transitionEvidenceRequest(current.status as EvidenceRequestStatus, input.nextStatus);
    }
    const now = new Date();
    const [row] = await tx.update(careerDataAdvisorEvidenceRequestsTable).set({
      status: input.nextStatus,
      submittedEvidenceId: input.submittedEvidenceId === undefined ? current.submittedEvidenceId : input.submittedEvidenceId,
      reviewDecision: input.reviewDecision === undefined ? current.reviewDecision : input.reviewDecision,
      reviewNotes: input.reviewNotes === undefined ? current.reviewNotes : plainText(input.reviewNotes ?? "") || null,
      reviewVerificationStatus: ["accepted","rejected"].includes(input.nextStatus) ? "advisor_reviewed" : current.reviewVerificationStatus,
      resolvedAt: ["accepted","rejected","withdrawn","expired"].includes(input.nextStatus) ? now : null,
      updatedBy: input.actor.userId, updatedAt: now,
      recordVersion: sql`${careerDataAdvisorEvidenceRequestsTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorEvidenceRequestsTable.id, input.requestId),
      eq(careerDataAdvisorEvidenceRequestsTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    await activity(tx, operationalEvent(caseRow, input.actor.userId,
      ["accepted","rejected"].includes(input.nextStatus) ? "evidence_review_completed" : "evidence_request_status_changed",
      "evidence_request", input.requestId, {
        fromStatus: current.status, toStatus: input.nextStatus,
        ...(input.reviewDecision ? { reviewDecision: input.reviewDecision, verificationStatus: "advisor_reviewed" } : {}),
      }));
    return row;
  });
}

export const submitEvidence = (input: Omit<Parameters<typeof transitionEvidenceRequestRecord>[0],"nextStatus">) =>
  transitionEvidenceRequestRecord({ ...input, nextStatus: "submitted" });
export const withdrawEvidenceRequest = (input: Omit<Parameters<typeof transitionEvidenceRequestRecord>[0],"nextStatus">) =>
  transitionEvidenceRequestRecord({ ...input, nextStatus: "withdrawn" });
export const startEvidenceReview = (input: Omit<Parameters<typeof transitionEvidenceRequestRecord>[0],"nextStatus">) =>
  transitionEvidenceRequestRecord({ ...input, nextStatus: "under_review" });
export const expireEvidenceRequest = (input: Omit<Parameters<typeof transitionEvidenceRequestRecord>[0],"nextStatus">) =>
  transitionEvidenceRequestRecord({ ...input, nextStatus: "expired" });
export function reviewEvidence(input: Omit<Parameters<typeof transitionEvidenceRequestRecord>[0],"nextStatus">) {
  const nextStatus: EvidenceRequestStatus = input.reviewDecision === "accepted_as_supporting_evidence"
    || input.reviewDecision === "accepted_with_limitations" ? "accepted" : "rejected";
  return transitionEvidenceRequestRecord({ ...input, nextStatus });
}
export function requestEvidenceClarification(input: Omit<Parameters<typeof transitionEvidenceRequestRecord>[0],"nextStatus"|"reviewDecision">) {
  return transitionEvidenceRequestRecord({ ...input, nextStatus: "submitted", reviewDecision: "needs_clarification" });
}

export async function createReviewItem(input: {
  actor: Actor; caseId: string; resourceType: ReviewResourceType; resourceId: string;
  reviewType: string; priority: string; idempotencyKey: string;
}) {
  requireDurableReviewResource(input.resourceType);
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const scope = scopeForReview(input.resourceType);
    const caseRow = await requireOperationalCase(tx, input.actor, input.caseId, scope);
    await requireLinkedCaseResource(tx, caseRow, input.resourceType, input.resourceId);
    const fields = {
      caseId: input.caseId, resourceType: input.resourceType,
      resourceId: input.resourceId, reviewType: input.reviewType,
    };
    const prior = await replay(tx, caseRow.ownerUserId, "review_item_create", input.idempotencyKey, fields);
    if (prior) return requireReviewItem(tx, input.actor, prior, false);
    const id = `review_${randomUUID()}`;
    const [row] = await tx.insert(careerDataAdvisorReviewItemsTable).values({
      id, caseId: caseRow.id, ownerUserId: caseRow.ownerUserId,
      advisorUserId: caseRow.advisorUserId, resourceType: input.resourceType,
      resourceId: input.resourceId, reviewType: plainText(input.reviewType),
      status: "awaiting_advisor", priority: plainText(input.priority),
      createdBy: input.actor.userId, updatedBy: input.actor.userId,
    }).returning();
    await remember(tx, caseRow.ownerUserId, "review_item_create", input.idempotencyKey, fields, "review_item", id);
    await activity(tx, operationalEvent(caseRow, input.actor.userId, "review_item_created", "review_item", id, {
      resourceType: input.resourceType, status: "awaiting_advisor",
    }));
    return row!;
  });
}

export async function listReviewItems(actor: Actor, caseId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    await requireCase(tx, actor, caseId, "case_manage", true);
    return tx.select().from(careerDataAdvisorReviewItemsTable)
      .where(eq(careerDataAdvisorReviewItemsTable.caseId, caseId))
      .orderBy(desc(careerDataAdvisorReviewItemsTable.updatedAt));
  });
}

export async function getReviewItem(actor: Actor, reviewId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    return requireReviewItem(tx, actor, reviewId, true);
  });
}

export async function transitionReviewItem(input: {
  actor: Actor; reviewId: string; expectedVersion: number; nextStatus: ReviewStatus;
  advisorDecision?: string|null; clientDecision?: string|null; decisionReason?: string|null;
  idempotencyKey?: string;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireReviewItem(tx, input.actor, input.reviewId, false);
    const scope = scopeForReview(current.resourceType as ReviewResourceType);
    const caseRow = await requireOperationalCase(tx, input.actor, current.caseId, scope);
    if (input.advisorDecision !== undefined && input.actor.role !== "advisor")
      throw repositoryError("case_access_denied");
    if (input.clientDecision !== undefined && input.actor.role !== "client")
      throw repositoryError("case_access_denied");
    if (input.nextStatus === "resolved" && input.actor.role !== "advisor")
      throw repositoryError("case_access_denied");
    if (input.nextStatus === "withdrawn" && current.createdBy !== input.actor.userId && input.actor.role !== "advisor")
      throw repositoryError("case_access_denied");
    transitionReview(current.status as ReviewStatus, input.nextStatus);
    const stableFields = {
      reviewId: input.reviewId, nextStatus: input.nextStatus,
      advisorDecision: input.advisorDecision ?? null, clientDecision: input.clientDecision ?? null,
    };
    if (input.idempotencyKey) {
      const prior = await replay(tx, caseRow.ownerUserId, "review_item_decision", input.idempotencyKey, stableFields);
      if (prior) return requireReviewItem(tx, input.actor, prior, false);
    }
    const [row] = await tx.update(careerDataAdvisorReviewItemsTable).set({
      status: input.nextStatus,
      advisorDecision: input.advisorDecision === undefined ? current.advisorDecision : plainText(input.advisorDecision ?? "") || null,
      clientDecision: input.clientDecision === undefined ? current.clientDecision : plainText(input.clientDecision ?? "") || null,
      decisionReason: input.decisionReason === undefined ? current.decisionReason : plainText(input.decisionReason ?? "") || null,
      resolvedAt: input.nextStatus === "resolved" ? new Date() : null,
      updatedBy: input.actor.userId, updatedAt: new Date(),
      recordVersion: sql`${careerDataAdvisorReviewItemsTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorReviewItemsTable.id, input.reviewId),
      eq(careerDataAdvisorReviewItemsTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    if (input.idempotencyKey)
      await remember(tx, caseRow.ownerUserId, "review_item_decision", input.idempotencyKey, stableFields, "review_item", input.reviewId);
    const state = input.advisorDecision ? reviewDecisionState(input.advisorDecision) : null;
    await activity(tx, operationalEvent(caseRow, input.actor.userId,
      input.advisorDecision ? "advisor_decision_recorded" : input.clientDecision ? "client_response_recorded" : "review_status_changed",
      "review_item", input.reviewId, {
        fromStatus: current.status, toStatus: input.nextStatus,
        ...(state ? { verificationStatus: state.verificationStatus, changesDeterministicScore: false, changesCanonicalMapping: false } : {}),
      }));
    return row;
  });
}

export const submitAdvisorDecision = (input: Omit<Parameters<typeof transitionReviewItem>[0],"nextStatus">) =>
  transitionReviewItem({ ...input, nextStatus: "awaiting_client" });
export const requestClientResponse = submitAdvisorDecision;
export const submitClientDecision = (input: Omit<Parameters<typeof transitionReviewItem>[0],"nextStatus">) =>
  transitionReviewItem({ ...input, nextStatus: "awaiting_advisor" });
export const resolveReviewItem = (input: Omit<Parameters<typeof transitionReviewItem>[0],"nextStatus">) =>
  transitionReviewItem({ ...input, nextStatus: "resolved" });
export const withdrawReviewItem = (input: Omit<Parameters<typeof transitionReviewItem>[0],"nextStatus">) =>
  transitionReviewItem({ ...input, nextStatus: "withdrawn" });

export async function createComment(input: {
  actor: Actor; reviewId: string; parentCommentId?: string|null;
  visibilityScope: "client_and_advisor"|"advisor_private"|"admin_only";
  content: string;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const review = await requireReviewItem(tx, input.actor, input.reviewId, false);
    const caseRow = await requireOperationalCase(tx, input.actor, review.caseId, scopeForReview(review.resourceType as ReviewResourceType));
    if (input.actor.role === "client" && input.visibilityScope !== "client_and_advisor")
      throw repositoryError("case_access_denied");
    if (input.visibilityScope === "admin_only") throw repositoryError("case_access_denied");
    if (input.parentCommentId) {
      const [parent] = await tx.select().from(careerDataAdvisorCommentsTable).where(and(
        eq(careerDataAdvisorCommentsTable.id, input.parentCommentId),
        eq(careerDataAdvisorCommentsTable.reviewItemId, input.reviewId),
        eq(careerDataAdvisorCommentsTable.caseId, review.caseId),
        isNull(careerDataAdvisorCommentsTable.deletedAt),
      ));
      if (!parent) throw repositoryError("invalid_comment_parent");
      if (input.actor.role === "client" && parent.visibilityScope !== "client_and_advisor")
        throw repositoryError("resource_not_found");
    }
    const id = `comment_${randomUUID()}`;
    const [row] = await tx.insert(careerDataAdvisorCommentsTable).values({
      id, caseId: review.caseId, reviewItemId: input.reviewId,
      parentCommentId: input.parentCommentId ?? null,
      authorUserId: input.actor.userId, authorRole: input.actor.role,
      visibilityScope: input.visibilityScope, content: plainText(input.content),
      status: "open",
    }).returning();
    await activity(tx, operationalEvent(caseRow, input.actor.userId, "comment_created", "advisor_comment", id, {
      visibilityScope: input.visibilityScope, reviewItemId: input.reviewId,
    }));
    return row!;
  });
}

export async function listComments(actor: Actor, reviewId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    const review = await requireReviewItem(tx, actor, reviewId, true);
    const conditions = [
      eq(careerDataAdvisorCommentsTable.reviewItemId, reviewId),
      isNull(careerDataAdvisorCommentsTable.deletedAt),
    ];
    if (actor.role === "client")
      conditions.push(eq(careerDataAdvisorCommentsTable.visibilityScope, "client_and_advisor"));
    return tx.select().from(careerDataAdvisorCommentsTable)
      .where(and(...conditions)).orderBy(careerDataAdvisorCommentsTable.createdAt);
  });
}

export async function updateComment(input: {
  actor: Actor; commentId: string; expectedVersion: number; content: string;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireComment(tx, input.actor, input.commentId);
    if (current.authorUserId !== input.actor.userId) throw repositoryError("resource_not_found");
    if (current.status !== "open") throw repositoryError("comment_closed");
    const [row] = await tx.update(careerDataAdvisorCommentsTable).set({
      content: plainText(input.content), updatedAt: new Date(),
      recordVersion: sql`${careerDataAdvisorCommentsTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorCommentsTable.id, input.commentId),
      eq(careerDataAdvisorCommentsTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    return row;
  });
}

export async function resolveComment(input: {
  actor: Actor; commentId: string; expectedVersion: number;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireComment(tx, input.actor, input.commentId);
    if (input.actor.role !== "advisor" && current.authorUserId !== input.actor.userId)
      throw repositoryError("resource_not_found");
    const [row] = await tx.update(careerDataAdvisorCommentsTable).set({
      status: "resolved", resolvedAt: new Date(), updatedAt: new Date(),
      recordVersion: sql`${careerDataAdvisorCommentsTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorCommentsTable.id, input.commentId),
      eq(careerDataAdvisorCommentsTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    return row;
  });
}

export async function deleteComment(input: {
  actor: Actor; commentId: string; expectedVersion: number;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireComment(tx, input.actor, input.commentId);
    if (current.authorUserId !== input.actor.userId) throw repositoryError("resource_not_found");
    const [row] = await tx.update(careerDataAdvisorCommentsTable).set({
      status: "deleted", deletedAt: new Date(), content: "[deleted]",
      updatedAt: new Date(),
      recordVersion: sql`${careerDataAdvisorCommentsTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorCommentsTable.id, input.commentId),
      eq(careerDataAdvisorCommentsTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    return { id: row.id, deleted: true, recordVersion: row.recordVersion };
  });
}

export const supportedOutcomeTypes = [
  "profile_completed","career_goal_confirmed","career_plan_approved","training_started",
  "training_completed","cv_completed","application_submitted","interview_secured",
  "interview_completed","job_offer_received","job_offer_accepted","job_started",
  "promotion_received","career_transition_completed",
  "professional_registration_application_submitted","professional_registration_achieved",
  "case_closed_without_outcome",
] as const;

export async function createOutcome(input: {
  actor: Actor; caseId: string; outcomeType: typeof supportedOutcomeTypes[number];
  outcomeDate: Date; verificationStatus: string; sourceReference?: string|null;
  notes?: string|null; supersedesOutcomeId?: string|null; idempotencyKey: string;
}) {
  if (!supportedOutcomeTypes.includes(input.outcomeType)) throw repositoryError("invalid_outcome_type");
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const caseRow = await requireOperationalCase(tx, input.actor, input.caseId, "outcome_record");
    if (input.actor.role === "client" && !["self_reported","unconfirmed"].includes(input.verificationStatus))
      throw repositoryError("verification_status_forbidden");
    if (input.supersedesOutcomeId)
      await requireOutcome(tx, input.actor, input.supersedesOutcomeId);
    const fields = {
      caseId: input.caseId, outcomeType: input.outcomeType,
      outcomeDate: input.outcomeDate.toISOString(), sourceReference: input.sourceReference ?? null,
      supersedesOutcomeId: input.supersedesOutcomeId ?? null,
    };
    const prior = await replay(tx, caseRow.ownerUserId, "outcome_create", input.idempotencyKey, fields);
    if (prior) return requireOutcome(tx, input.actor, prior);
    const id = `outcome_${randomUUID()}`;
    const [row] = await tx.insert(careerDataAdvisorOutcomesTable).values({
      id, caseId: caseRow.id, ownerUserId: caseRow.ownerUserId,
      advisorUserId: caseRow.advisorUserId, outcomeType: input.outcomeType,
      outcomeDate: input.outcomeDate, verificationStatus: input.verificationStatus,
      sourceReference: input.sourceReference ? plainText(input.sourceReference) : null,
      notes: input.notes ? plainText(input.notes) : null,
      createdBy: input.actor.userId, updatedBy: input.actor.userId,
      supersedesOutcomeId: input.supersedesOutcomeId ?? null,
    }).returning();
    await remember(tx, caseRow.ownerUserId, "outcome_create", input.idempotencyKey, fields, "advisor_outcome", id);
    await activity(tx, operationalEvent(caseRow, input.actor.userId, "outcome_recorded", "advisor_outcome", id, {
      outcomeType: input.outcomeType, verificationStatus: input.verificationStatus,
      source: input.sourceReference ? "provided_reference" : "actor_report",
    }));
    return row!;
  });
}

export async function listOutcomes(actor: Actor, caseId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    await requireCase(tx, actor, caseId, "outcome_record", true);
    return tx.select().from(careerDataAdvisorOutcomesTable)
      .where(eq(careerDataAdvisorOutcomesTable.caseId, caseId))
      .orderBy(desc(careerDataAdvisorOutcomesTable.outcomeDate));
  });
}

export async function getOutcome(actor: Actor, outcomeId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    return requireOutcome(tx, actor, outcomeId);
  });
}

export async function updateOutcome(input: {
  actor: Actor; outcomeId: string; expectedVersion: number;
  outcomeDate?: Date; verificationStatus?: string; sourceReference?: string|null; notes?: string|null;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireOutcome(tx, input.actor, input.outcomeId);
    await requireOperationalCase(tx, input.actor, current.caseId, "outcome_record");
    if (input.actor.role === "client" && current.createdBy !== input.actor.userId)
      throw repositoryError("resource_not_found");
    if (input.actor.role === "client" && input.verificationStatus && !["self_reported","unconfirmed"].includes(input.verificationStatus))
      throw repositoryError("verification_status_forbidden");
    const [row] = await tx.update(careerDataAdvisorOutcomesTable).set({
      ...(input.outcomeDate === undefined ? {} : { outcomeDate: input.outcomeDate }),
      ...(input.verificationStatus === undefined ? {} : { verificationStatus: input.verificationStatus }),
      ...(input.sourceReference === undefined ? {} : { sourceReference: input.sourceReference ? plainText(input.sourceReference) : null }),
      ...(input.notes === undefined ? {} : { notes: input.notes ? plainText(input.notes) : null }),
      updatedBy: input.actor.userId, updatedAt: new Date(),
      recordVersion: sql`${careerDataAdvisorOutcomesTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorOutcomesTable.id, input.outcomeId),
      eq(careerDataAdvisorOutcomesTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    return row;
  });
}

export function supersedeOutcome(input: Omit<Parameters<typeof createOutcome>[0],"supersedesOutcomeId"> & { supersedesOutcomeId: string }) {
  return createOutcome(input);
}

export async function createPlacement(input: {
  actor: Actor; caseId: string; employerName: string; roleTitle: string;
  startDate?: Date|null; employmentType?: string|null; location?: string|null;
  salaryAmount?: number|null; salaryCurrency?: string|null; salaryPeriod?: string|null;
  sourceOpportunityId?: string|null; offerStatus: string; verificationStatus: string;
  supersedesPlacementId?: string|null; idempotencyKey: string;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const caseRow = await requireOperationalCase(tx, input.actor, input.caseId, "outcome_record");
    if (input.actor.role === "client" && !["self_reported","unconfirmed"].includes(input.verificationStatus))
      throw repositoryError("verification_status_forbidden");
    if (input.supersedesPlacementId)
      await requirePlacement(tx, input.actor, input.supersedesPlacementId);
    const fields = {
      caseId: input.caseId, employerName: input.employerName, roleTitle: input.roleTitle,
      startDate: input.startDate?.toISOString() ?? null, sourceOpportunityId: input.sourceOpportunityId ?? null,
      supersedesPlacementId: input.supersedesPlacementId ?? null,
    };
    const prior = await replay(tx, caseRow.ownerUserId, "placement_create", input.idempotencyKey, fields);
    if (prior) return requirePlacement(tx, input.actor, prior);
    const id = `placement_${randomUUID()}`;
    const [row] = await tx.insert(careerDataAdvisorPlacementsTable).values({
      id, caseId: caseRow.id, ownerUserId: caseRow.ownerUserId,
      advisorUserId: caseRow.advisorUserId,
      employerName: plainText(input.employerName), roleTitle: plainText(input.roleTitle),
      startDate: input.startDate ?? null,
      employmentType: input.employmentType ? plainText(input.employmentType) : null,
      location: input.location ? plainText(input.location) : null,
      salaryAmount: input.salaryAmount ?? null, salaryCurrency: input.salaryCurrency ?? null,
      salaryPeriod: input.salaryPeriod ?? null, sourceOpportunityId: input.sourceOpportunityId ?? null,
      offerStatus: plainText(input.offerStatus), verificationStatus: input.verificationStatus,
      createdBy: input.actor.userId, updatedBy: input.actor.userId,
      supersedesPlacementId: input.supersedesPlacementId ?? null,
    }).returning();
    await remember(tx, caseRow.ownerUserId, "placement_create", input.idempotencyKey, fields, "advisor_placement", id);
    await activity(tx, operationalEvent(caseRow, input.actor.userId, "placement_recorded", "advisor_placement", id, {
      offerStatus: input.offerStatus, verificationStatus: input.verificationStatus,
    }));
    return row!;
  });
}

export async function listPlacements(actor: Actor, caseId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    await requireCase(tx, actor, caseId, "outcome_record", true);
    return tx.select().from(careerDataAdvisorPlacementsTable)
      .where(eq(careerDataAdvisorPlacementsTable.caseId, caseId))
      .orderBy(desc(careerDataAdvisorPlacementsTable.createdAt));
  });
}

export async function getPlacement(actor: Actor, placementId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    return requirePlacement(tx, actor, placementId);
  });
}

export async function updatePlacement(input: {
  actor: Actor; placementId: string; expectedVersion: number;
  employerName?: string; roleTitle?: string; startDate?: Date|null;
  employmentType?: string|null; location?: string|null; salaryAmount?: number|null;
  salaryCurrency?: string|null; salaryPeriod?: string|null; offerStatus?: string;
  verificationStatus?: string;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requirePlacement(tx, input.actor, input.placementId);
    await requireOperationalCase(tx, input.actor, current.caseId, "outcome_record");
    if (input.actor.role === "client" && current.createdBy !== input.actor.userId)
      throw repositoryError("resource_not_found");
    if (input.actor.role === "client" && input.verificationStatus && !["self_reported","unconfirmed"].includes(input.verificationStatus))
      throw repositoryError("verification_status_forbidden");
    const clean = (value: string|null|undefined) => value === undefined ? undefined : value ? plainText(value) : null;
    const [row] = await tx.update(careerDataAdvisorPlacementsTable).set({
      ...(input.employerName === undefined ? {} : { employerName: plainText(input.employerName) }),
      ...(input.roleTitle === undefined ? {} : { roleTitle: plainText(input.roleTitle) }),
      ...(input.startDate === undefined ? {} : { startDate: input.startDate }),
      ...(input.employmentType === undefined ? {} : { employmentType: clean(input.employmentType) }),
      ...(input.location === undefined ? {} : { location: clean(input.location) }),
      ...(input.salaryAmount === undefined ? {} : { salaryAmount: input.salaryAmount }),
      ...(input.salaryCurrency === undefined ? {} : { salaryCurrency: clean(input.salaryCurrency) }),
      ...(input.salaryPeriod === undefined ? {} : { salaryPeriod: clean(input.salaryPeriod) }),
      ...(input.offerStatus === undefined ? {} : { offerStatus: plainText(input.offerStatus) }),
      ...(input.verificationStatus === undefined ? {} : { verificationStatus: input.verificationStatus }),
      updatedBy: input.actor.userId, updatedAt: new Date(),
      recordVersion: sql`${careerDataAdvisorPlacementsTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorPlacementsTable.id, input.placementId),
      eq(careerDataAdvisorPlacementsTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    return row;
  });
}

export function supersedePlacement(input: Omit<Parameters<typeof createPlacement>[0],"supersedesPlacementId"> & { supersedesPlacementId: string }) {
  return createPlacement(input);
}

export async function createFollowUp(input: {
  actor: Actor; caseId: string; followUpType: string; dueAt: Date;
  relatedActionId?: string|null; relatedSessionId?: string|null; idempotencyKey: string; now?: Date;
}) {
  if (input.actor.role !== "advisor") throw repositoryError("case_access_denied");
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const caseRow = await requireOperationalCase(tx, input.actor, input.caseId, "case_manage");
    if (input.relatedActionId) {
      const action = await requireAction(tx, input.actor, input.relatedActionId, true);
      if (action.caseId !== input.caseId) throw repositoryError("resource_not_found");
    }
    if (input.relatedSessionId) await requireSession(tx, input.relatedSessionId, input.caseId);
    const fields = {
      caseId: input.caseId, followUpType: input.followUpType,
      dueAt: input.dueAt.toISOString(), relatedActionId: input.relatedActionId ?? null,
      relatedSessionId: input.relatedSessionId ?? null,
    };
    const prior = await replay(tx, caseRow.ownerUserId, "follow_up_create", input.idempotencyKey, fields);
    if (prior) return requireFollowUp(tx, input.actor, prior, false, input.now);
    const id = `follow_up_${randomUUID()}`;
    const status = calculateFollowUpStatus({ dueAt: input.dueAt, now: input.now });
    const [row] = await tx.insert(careerDataAdvisorFollowUpsTable).values({
      id, caseId: caseRow.id, ownerUserId: caseRow.ownerUserId,
      advisorUserId: caseRow.advisorUserId, followUpType: plainText(input.followUpType),
      dueAt: input.dueAt, status, relatedActionId: input.relatedActionId ?? null,
      relatedSessionId: input.relatedSessionId ?? null, createdBy: input.actor.userId,
    }).returning();
    await remember(tx, caseRow.ownerUserId, "follow_up_create", input.idempotencyKey, fields, "advisor_follow_up", id);
    await activity(tx, operationalEvent(caseRow, input.actor.userId, "follow_up_created", "advisor_follow_up", id, { status }));
    return withCalculatedFollowUpStatus(row!, input.now);
  });
}

export async function listFollowUps(actor: Actor, caseId: string, now?: Date) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    await requireCase(tx, actor, caseId, "case_manage", true);
    const rows = await tx.select().from(careerDataAdvisorFollowUpsTable)
      .where(eq(careerDataAdvisorFollowUpsTable.caseId, caseId))
      .orderBy(careerDataAdvisorFollowUpsTable.dueAt);
    return rows.map((row) => withCalculatedFollowUpStatus(row, now));
  });
}

export async function getFollowUp(actor: Actor, followUpId: string, now?: Date) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    return requireFollowUp(tx, actor, followUpId, true, now);
  });
}

export async function updateFollowUp(input: {
  actor: Actor; followUpId: string; expectedVersion: number;
  followUpType?: string; dueAt?: Date; now?: Date;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireFollowUp(tx, input.actor, input.followUpId, false, input.now);
    await requireOperationalCase(tx, input.actor, current.caseId, "case_manage");
    if (input.actor.role !== "advisor") throw repositoryError("case_access_denied");
    const dueAt = input.dueAt ?? current.dueAt;
    const status = calculateFollowUpStatus({
      dueAt, completedAt: current.completedAt, cancelledAt: current.cancelledAt, now: input.now,
    });
    const [row] = await tx.update(careerDataAdvisorFollowUpsTable).set({
      ...(input.followUpType === undefined ? {} : { followUpType: plainText(input.followUpType) }),
      dueAt, status, updatedAt: new Date(),
      recordVersion: sql`${careerDataAdvisorFollowUpsTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorFollowUpsTable.id, input.followUpId),
      eq(careerDataAdvisorFollowUpsTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    return withCalculatedFollowUpStatus(row, input.now);
  });
}

export async function transitionFollowUp(input: {
  actor: Actor; followUpId: string; expectedVersion: number; nextStatus: "completed"|"cancelled"; now?: Date;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireFollowUp(tx, input.actor, input.followUpId, false, input.now);
    const caseRow = await requireOperationalCase(tx, input.actor, current.caseId, "case_manage");
    if (["completed","cancelled"].includes(current.status)) throw repositoryError("invalid_follow_up_transition");
    const now = input.now ?? new Date();
    const [row] = await tx.update(careerDataAdvisorFollowUpsTable).set({
      status: input.nextStatus,
      completedAt: input.nextStatus === "completed" ? now : null,
      cancelledAt: input.nextStatus === "cancelled" ? now : null,
      updatedAt: now,
      recordVersion: sql`${careerDataAdvisorFollowUpsTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorFollowUpsTable.id, input.followUpId),
      eq(careerDataAdvisorFollowUpsTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    await activity(tx, operationalEvent(caseRow, input.actor.userId,
      input.nextStatus === "completed" ? "follow_up_completed" : "follow_up_cancelled",
      "advisor_follow_up", input.followUpId, { status: input.nextStatus }));
    return withCalculatedFollowUpStatus(row, now);
  });
}

export const completeFollowUp = (input: Omit<Parameters<typeof transitionFollowUp>[0],"nextStatus">) =>
  transitionFollowUp({ ...input, nextStatus: "completed" });
export const cancelFollowUp = (input: Omit<Parameters<typeof transitionFollowUp>[0],"nextStatus">) =>
  transitionFollowUp({ ...input, nextStatus: "cancelled" });

export async function listSessions(actor: Actor, caseId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    await requireCase(tx, actor, caseId, "case_manage", true);
    return tx.select().from(careerDataAdvisorSessionsTable)
      .where(eq(careerDataAdvisorSessionsTable.caseId, caseId))
      .orderBy(desc(careerDataAdvisorSessionsTable.scheduledStart));
  });
}

export async function getSession(actor: Actor, sessionId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    const row = await requireSessionRecord(tx, sessionId);
    await requireCase(tx, actor, row.caseId, "case_manage", true);
    return row;
  });
}

export async function updateSession(input: {
  actor: Actor; sessionId: string; expectedVersion: number;
  sessionType?: string; scheduledStart?: Date|null; scheduledEnd?: Date|null;
  deliveryMode?: string; locationOrProviderReference?: string|null;
}) {
  if (input.actor.role !== "advisor") throw repositoryError("case_access_denied");
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireSessionRecord(tx, input.sessionId);
    await requireOperationalCase(tx, input.actor, current.caseId, "case_manage");
    if (["completed","cancelled","rescheduled"].includes(current.sessionStatus))
      throw repositoryError("invalid_session_transition");
    const [row] = await tx.update(careerDataAdvisorSessionsTable).set({
      ...(input.sessionType === undefined ? {} : { sessionType: plainText(input.sessionType) }),
      ...(input.scheduledStart === undefined ? {} : { scheduledStart: input.scheduledStart }),
      ...(input.scheduledEnd === undefined ? {} : { scheduledEnd: input.scheduledEnd }),
      ...(input.deliveryMode === undefined ? {} : { deliveryMode: plainText(input.deliveryMode) }),
      ...(input.locationOrProviderReference === undefined ? {} : {
        locationOrProviderReference: input.locationOrProviderReference
          ? safeProviderReference(input.locationOrProviderReference) : null,
      }),
      updatedBy: input.actor.userId, updatedAt: new Date(),
      recordVersion: sql`${careerDataAdvisorSessionsTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorSessionsTable.id, input.sessionId),
      eq(careerDataAdvisorSessionsTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    return row;
  });
}

export async function transitionSessionRecord(input: {
  actor: Actor; sessionId: string; expectedVersion: number; nextStatus: SessionStatus;
  reason?: string|null; actualAt?: Date;
}) {
  if (input.actor.role !== "advisor") throw repositoryError("case_access_denied");
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireSessionRecord(tx, input.sessionId);
    const caseRow = await requireOperationalCase(tx, input.actor, current.caseId, "case_manage");
    transitionSession(current.sessionStatus as SessionStatus, input.nextStatus);
    if (input.nextStatus === "cancelled" && !input.reason?.trim())
      throw repositoryError("decision_reason_required");
    const now = input.actualAt ?? new Date();
    const [row] = await tx.update(careerDataAdvisorSessionsTable).set({
      sessionStatus: input.nextStatus,
      actualStart: input.nextStatus === "in_progress" ? now : current.actualStart,
      actualEnd: input.nextStatus === "completed" ? now : current.actualEnd,
      cancellationReason: input.nextStatus === "cancelled" ? plainText(input.reason ?? "") : current.cancellationReason,
      updatedBy: input.actor.userId, updatedAt: now,
      recordVersion: sql`${careerDataAdvisorSessionsTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorSessionsTable.id, input.sessionId),
      eq(careerDataAdvisorSessionsTable.recordVersion, input.expectedVersion),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    await activity(tx, operationalEvent(caseRow, input.actor.userId,
      input.nextStatus === "completed" ? "session_completed" : "session_status_changed",
      "advisor_session", input.sessionId, { fromStatus: current.sessionStatus, toStatus: input.nextStatus }));
    return row;
  });
}

export const confirmSession = (input: Omit<Parameters<typeof transitionSessionRecord>[0],"nextStatus">) =>
  transitionSessionRecord({ ...input, nextStatus: "confirmed" });
export const startSession = (input: Omit<Parameters<typeof transitionSessionRecord>[0],"nextStatus">) =>
  transitionSessionRecord({ ...input, nextStatus: "in_progress" });
export const completeSession = (input: Omit<Parameters<typeof transitionSessionRecord>[0],"nextStatus">) =>
  transitionSessionRecord({ ...input, nextStatus: "completed" });
export const cancelSession = (input: Omit<Parameters<typeof transitionSessionRecord>[0],"nextStatus">) =>
  transitionSessionRecord({ ...input, nextStatus: "cancelled" });

export async function rescheduleSession(input: {
  actor: Actor; sessionId: string; expectedVersion: number;
  scheduledStart: Date; scheduledEnd?: Date|null; reason: string; idempotencyKey: string;
}) {
  if (input.actor.role !== "advisor") throw repositoryError("case_access_denied");
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireSessionRecord(tx, input.sessionId);
    const caseRow = await requireOperationalCase(tx, input.actor, current.caseId, "case_manage");
    transitionSession(current.sessionStatus as SessionStatus, "rescheduled");
    if (!input.reason.trim()) throw repositoryError("decision_reason_required");
    const fields = {
      sessionId: input.sessionId, scheduledStart: input.scheduledStart.toISOString(),
      scheduledEnd: input.scheduledEnd?.toISOString() ?? null,
    };
    const prior = await replay(tx, caseRow.ownerUserId, "advisor_session_reschedule", input.idempotencyKey, fields);
    if (prior) return requireSessionRecord(tx, prior);
    const newId = `session_${randomUUID()}`;
    const [replacement] = await tx.insert(careerDataAdvisorSessionsTable).values({
      id: newId, caseId: current.caseId, ownerUserId: current.ownerUserId,
      advisorUserId: current.advisorUserId, sessionType: current.sessionType,
      sessionStatus: "scheduled", scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd ?? null, deliveryMode: current.deliveryMode,
      locationOrProviderReference: current.locationOrProviderReference,
      rescheduledFromSessionId: current.id,
      createdBy: input.actor.userId, updatedBy: input.actor.userId,
    }).returning();
    const updated = await tx.update(careerDataAdvisorSessionsTable).set({
      sessionStatus: "rescheduled", cancellationReason: plainText(input.reason),
      updatedBy: input.actor.userId, updatedAt: new Date(),
      recordVersion: sql`${careerDataAdvisorSessionsTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorSessionsTable.id, input.sessionId),
      eq(careerDataAdvisorSessionsTable.recordVersion, input.expectedVersion),
    )).returning({ id: careerDataAdvisorSessionsTable.id });
    if (!updated.length) throw repositoryError("record_version_conflict");
    await remember(tx, caseRow.ownerUserId, "advisor_session_reschedule", input.idempotencyKey, fields, "advisor_session", newId);
    await activity(tx, operationalEvent(caseRow, input.actor.userId, "session_rescheduled", "advisor_session", newId, {
      previousSessionId: current.id,
    }));
    return replacement!;
  });
}

export async function listSessionNotes(actor: Actor, sessionId: string) {
  const session = await getSession(actor, sessionId);
  return listVisibleSessionNotes(actor, session.caseId, sessionId);
}

export async function updateSessionNote(input: {
  actor: Actor; noteId: string; expectedVersion: number; content: string;
}) {
  if (input.actor.role !== "advisor") throw repositoryError("case_access_denied");
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireSessionNote(tx, input.actor, input.noteId);
    await requireOperationalCase(tx, input.actor, current.caseId, "case_manage");
    const [row] = await tx.update(careerDataAdvisorSessionNotesTable).set({
      content: plainText(input.content), updatedBy: input.actor.userId,
      updatedAt: new Date(),
      recordVersion: sql`${careerDataAdvisorSessionNotesTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorSessionNotesTable.id, input.noteId),
      eq(careerDataAdvisorSessionNotesTable.recordVersion, input.expectedVersion),
      isNull(careerDataAdvisorSessionNotesTable.deletedAt),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    return row;
  });
}

export async function deleteSessionNote(input: {
  actor: Actor; noteId: string; expectedVersion: number;
}) {
  if (input.actor.role !== "advisor") throw repositoryError("case_access_denied");
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const current = await requireSessionNote(tx, input.actor, input.noteId);
    await requireOperationalCase(tx, input.actor, current.caseId, "case_manage");
    const [row] = await tx.update(careerDataAdvisorSessionNotesTable).set({
      content: "[deleted]", deletedAt: new Date(), deletedBy: input.actor.userId,
      deletionReason: "author_deleted", updatedBy: input.actor.userId, updatedAt: new Date(),
      recordVersion: sql`${careerDataAdvisorSessionNotesTable.recordVersion} + 1`,
    }).where(and(
      eq(careerDataAdvisorSessionNotesTable.id, input.noteId),
      eq(careerDataAdvisorSessionNotesTable.recordVersion, input.expectedVersion),
      isNull(careerDataAdvisorSessionNotesTable.deletedAt),
    )).returning();
    if (!row) throw repositoryError("record_version_conflict");
    return { id: row.id, deleted: true, recordVersion: row.recordVersion };
  });
}

export async function listSessionSummaries(actor: Actor, sessionId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    const session = await requireSessionRecord(tx, sessionId);
    await requireCase(tx, actor, session.caseId, "session_summary_read", true);
    return tx.select().from(careerDataAdvisorSessionSummariesTable)
      .where(eq(careerDataAdvisorSessionSummariesTable.sessionId, sessionId))
      .orderBy(desc(careerDataAdvisorSessionSummariesTable.summaryVersion));
  });
}

export async function getSessionSummary(actor: Actor, summaryId: string) {
  return db.transaction(async (tx) => {
    await setActor(tx, actor.userId);
    const [row] = await tx.select().from(careerDataAdvisorSessionSummariesTable)
      .where(eq(careerDataAdvisorSessionSummariesTable.id, summaryId));
    if (!row) throw repositoryError("resource_not_found");
    await requireCase(tx, actor, row.caseId, "session_summary_read", true);
    return row;
  });
}

export function supersedeSessionSummary(input: Parameters<typeof publishSessionSummary>[0] & { supersedesSummaryId: string }) {
  return publishSessionSummary(input);
}

export async function getAdvisorOperationalQueues(advisorUserId: number, now = new Date()) {
  return db.transaction(async (tx) => {
    await setActor(tx, advisorUserId);
    await requireAdvisorProfile(tx, advisorUserId, true);
    const accessibleCases = await tx.select({ id: careerDataAdvisorCasesTable.id })
      .from(careerDataAdvisorCasesTable).where(and(
        eq(careerDataAdvisorCasesTable.advisorUserId, advisorUserId),
        isNull(careerDataAdvisorCasesTable.deletedAt),
      ));
    const caseIds = accessibleCases.map((item) => item.id);
    if (!caseIds.length) return emptyOperationalQueues();
    const actions = await tx.select().from(careerDataAdvisorActionsTable)
      .where(eq(careerDataAdvisorActionsTable.advisorUserId, advisorUserId))
      .orderBy(careerDataAdvisorActionsTable.dueAt);
    const evidence = await tx.select().from(careerDataAdvisorEvidenceRequestsTable)
        .where(and(
          eq(careerDataAdvisorEvidenceRequestsTable.advisorUserId, advisorUserId),
          eq(careerDataAdvisorEvidenceRequestsTable.status, "under_review"),
        )).orderBy(careerDataAdvisorEvidenceRequestsTable.dueAt);
    const reviews = await tx.select().from(careerDataAdvisorReviewItemsTable)
        .where(and(
          eq(careerDataAdvisorReviewItemsTable.advisorUserId, advisorUserId),
          eq(careerDataAdvisorReviewItemsTable.status, "awaiting_advisor"),
        )).orderBy(desc(careerDataAdvisorReviewItemsTable.priority));
    const sessions = await tx.select().from(careerDataAdvisorSessionsTable)
        .where(and(
          eq(careerDataAdvisorSessionsTable.advisorUserId, advisorUserId),
          sql`${careerDataAdvisorSessionsTable.sessionStatus} IN ('scheduled','confirmed')`,
        )).orderBy(careerDataAdvisorSessionsTable.scheduledStart);
    const followUps = await tx.select().from(careerDataAdvisorFollowUpsTable)
      .where(eq(careerDataAdvisorFollowUpsTable.advisorUserId, advisorUserId))
      .orderBy(careerDataAdvisorFollowUpsTable.dueAt);
    return {
      actionsOverdue: actions.filter((item) => item.dueAt && item.dueAt < now && !["completed","verified","cancelled"].includes(item.status)),
      evidenceAwaitingReview: evidence,
      reviewsAwaitingDecision: reviews,
      sessionsDue: sessions.filter((item) => item.scheduledStart && item.scheduledStart <= new Date(now.getTime() + 86_400_000)),
      followUpsDue: followUps.map((item) => withCalculatedFollowUpStatus(item, now))
        .filter((item) => ["due","overdue"].includes(item.calculatedStatus)),
    };
  });
}

export async function buildAdvisorCaseExport(input: {
  actor: Actor; caseId: string;
  format: "client_session_summary"|"agreed_action_plan"|"case_progress_summary"|"case_closure_summary"|"advisor_review_summary";
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const caseRow = await requireCase(tx, input.actor, input.caseId, "case_manage", true);
    const summaries = await tx.select({
        summaryVersion: careerDataAdvisorSessionSummariesTable.summaryVersion,
        sessionObjective: careerDataAdvisorSessionSummariesTable.sessionObjective,
        clientVisibleSummary: careerDataAdvisorSessionSummariesTable.clientVisibleSummary,
        createdAt: careerDataAdvisorSessionSummariesTable.createdAt,
      }).from(careerDataAdvisorSessionSummariesTable)
        .where(eq(careerDataAdvisorSessionSummariesTable.caseId, input.caseId));
    const actions = await tx.select({
        title: careerDataAdvisorActionsTable.title,
        description: careerDataAdvisorActionsTable.description,
        status: careerDataAdvisorActionsTable.status,
        dueAt: careerDataAdvisorActionsTable.dueAt,
        completionInformation: careerDataAdvisorActionsTable.completionInformation,
      }).from(careerDataAdvisorActionsTable)
        .where(eq(careerDataAdvisorActionsTable.caseId, input.caseId));
    const reviews = await tx.select({
        resourceType: careerDataAdvisorReviewItemsTable.resourceType,
        reviewType: careerDataAdvisorReviewItemsTable.reviewType,
        status: careerDataAdvisorReviewItemsTable.status,
        advisorDecision: careerDataAdvisorReviewItemsTable.advisorDecision,
        clientDecision: careerDataAdvisorReviewItemsTable.clientDecision,
        decisionReason: careerDataAdvisorReviewItemsTable.decisionReason,
      }).from(careerDataAdvisorReviewItemsTable)
        .where(eq(careerDataAdvisorReviewItemsTable.caseId, input.caseId));
    const outcomes = await tx.select({
        outcomeType: careerDataAdvisorOutcomesTable.outcomeType,
        outcomeDate: careerDataAdvisorOutcomesTable.outcomeDate,
        verificationStatus: careerDataAdvisorOutcomesTable.verificationStatus,
      }).from(careerDataAdvisorOutcomesTable)
        .where(eq(careerDataAdvisorOutcomesTable.caseId, input.caseId));
    const comments = await tx.select({
        reviewItemId: careerDataAdvisorCommentsTable.reviewItemId,
        authorRole: careerDataAdvisorCommentsTable.authorRole,
        content: careerDataAdvisorCommentsTable.content,
        status: careerDataAdvisorCommentsTable.status,
      }).from(careerDataAdvisorCommentsTable).where(and(
        eq(careerDataAdvisorCommentsTable.caseId, input.caseId),
        eq(careerDataAdvisorCommentsTable.visibilityScope, "client_and_advisor"),
        isNull(careerDataAdvisorCommentsTable.deletedAt),
      ));
    return {
      format: input.format,
      generatedAt: new Date().toISOString(),
      case: {
        serviceType: caseRow.serviceType, caseStatus: caseRow.caseStatus,
        caseStage: caseRow.caseStage, openedAt: caseRow.openedAt, closedAt: caseRow.closedAt,
      },
      summaries, actions, reviews, sharedComments: comments, outcomes,
      exclusions: [
        "advisor_private_notes","advisor_private_comments","admin_only_records",
        "unshared_profile_data","authentication_information","audit_metadata",
        "process_local_cv_records","process_local_interview_records",
      ],
    };
  }).catch((error) => {
    recordAdvisorMetric("export_failures");
    throw error;
  });
}

async function requireOperationalCase(tx: Transaction, actor: Actor, caseId: string, scope: AdvisorScope) {
  const row = await requireCase(tx, actor, caseId, scope, false);
  if (!["active","on_hold","awaiting_client","awaiting_advisor"].includes(row.caseStatus))
    throw repositoryError("case_not_active");
  return row;
}

async function requireAction(tx: Transaction, actor: Actor, actionId: string, allowTerminal: boolean) {
  const [row] = await tx.select().from(careerDataAdvisorActionsTable)
    .where(eq(careerDataAdvisorActionsTable.id, actionId));
  if (!row) throw repositoryError("resource_not_found");
  await requireCase(tx, actor, row.caseId, "case_manage", allowTerminal);
  return row;
}

async function requireEvidenceRequest(tx: Transaction, actor: Actor, requestId: string, allowTerminal: boolean) {
  const [row] = await tx.select().from(careerDataAdvisorEvidenceRequestsTable)
    .where(eq(careerDataAdvisorEvidenceRequestsTable.id, requestId));
  if (!row) throw repositoryError("resource_not_found");
  await requireCase(tx, actor, row.caseId, "evidence_review", allowTerminal);
  return row;
}

async function requireReviewItem(tx: Transaction, actor: Actor, reviewId: string, allowTerminal: boolean) {
  const [row] = await tx.select().from(careerDataAdvisorReviewItemsTable)
    .where(eq(careerDataAdvisorReviewItemsTable.id, reviewId));
  if (!row) throw repositoryError("resource_not_found");
  await requireCase(tx, actor, row.caseId, scopeForReview(row.resourceType as ReviewResourceType), allowTerminal);
  return row;
}

async function requireComment(tx: Transaction, actor: Actor, commentId: string) {
  const [row] = await tx.select().from(careerDataAdvisorCommentsTable).where(and(
    eq(careerDataAdvisorCommentsTable.id, commentId),
    isNull(careerDataAdvisorCommentsTable.deletedAt),
  ));
  if (!row) throw repositoryError("resource_not_found");
  if (actor.role === "client" && row.visibilityScope !== "client_and_advisor")
    throw repositoryError("resource_not_found");
  await requireCase(tx, actor, row.caseId, "case_manage", false);
  return row;
}

async function requireOutcome(tx: Transaction, actor: Actor, outcomeId: string) {
  const [row] = await tx.select().from(careerDataAdvisorOutcomesTable)
    .where(eq(careerDataAdvisorOutcomesTable.id, outcomeId));
  if (!row) throw repositoryError("resource_not_found");
  await requireCase(tx, actor, row.caseId, "outcome_record", true);
  return row;
}

async function requirePlacement(tx: Transaction, actor: Actor, placementId: string) {
  const [row] = await tx.select().from(careerDataAdvisorPlacementsTable)
    .where(eq(careerDataAdvisorPlacementsTable.id, placementId));
  if (!row) throw repositoryError("resource_not_found");
  await requireCase(tx, actor, row.caseId, "outcome_record", true);
  return row;
}

async function requireFollowUp(tx: Transaction, actor: Actor, followUpId: string, allowTerminal: boolean, now?: Date) {
  const [row] = await tx.select().from(careerDataAdvisorFollowUpsTable)
    .where(eq(careerDataAdvisorFollowUpsTable.id, followUpId));
  if (!row) throw repositoryError("resource_not_found");
  await requireCase(tx, actor, row.caseId, "case_manage", allowTerminal);
  return withCalculatedFollowUpStatus(row, now);
}

async function requireSessionRecord(tx: Transaction, sessionId: string) {
  const [row] = await tx.select().from(careerDataAdvisorSessionsTable)
    .where(eq(careerDataAdvisorSessionsTable.id, sessionId));
  if (!row) throw repositoryError("resource_not_found");
  return row;
}

async function requireSessionNote(tx: Transaction, actor: Actor, noteId: string) {
  const [row] = await tx.select().from(careerDataAdvisorSessionNotesTable).where(and(
    eq(careerDataAdvisorSessionNotesTable.id, noteId),
    isNull(careerDataAdvisorSessionNotesTable.deletedAt),
  ));
  if (!row) throw repositoryError("resource_not_found");
  if (actor.role === "client" && row.visibilityScope !== "client_and_advisor")
    throw repositoryError("resource_not_found");
  await requireCase(tx, actor, row.caseId, "case_manage", false);
  return row;
}

async function requireLinkedCaseResource(
  tx: Transaction,
  caseRow: typeof careerDataAdvisorCasesTable.$inferSelect,
  resourceType: string,
  resourceId: string,
) {
  const [link] = await tx.select().from(careerDataAdvisorCaseResourcesTable).where(and(
    eq(careerDataAdvisorCaseResourcesTable.caseId, caseRow.id),
    eq(careerDataAdvisorCaseResourcesTable.ownerUserId, caseRow.ownerUserId),
    eq(careerDataAdvisorCaseResourcesTable.resourceType, resourceType),
    eq(careerDataAdvisorCaseResourcesTable.resourceId, resourceId),
    isNull(careerDataAdvisorCaseResourcesTable.revokedAt),
  ));
  if (!link) throw repositoryError("shared_resource_required");
  await requireOwnedResource(tx, caseRow.ownerUserId, resourceType, resourceId);
  return link;
}

function scopeForReview(resourceType: ReviewResourceType): AdvisorScope {
  const scopes: Record<ReviewResourceType, AdvisorScope> = {
    career_profile: "profile_read", career_goal: "plan_read",
    career_plan: "plan_comment", career_action: "plan_action_review",
    opportunity: "opportunity_read", evidence_record: "evidence_review",
    job_match_analysis: "opportunity_read", employability_analysis: "opportunity_read",
    cv_optimisation_session: "cv_review", cv_draft: "cv_review",
    cv_ats_analysis: "cv_review", cv_recommendation: "cv_review",
    cv_claim_validation: "cv_review", application_readiness: "cv_review",
    interview_session: "interview_review", interview_response: "interview_review",
    interview_competency: "interview_review", interview_question: "interview_review",
    interview_evidence: "interview_review", interview_claim_validation: "interview_review",
    interview_readiness: "interview_review",
  };
  return scopes[resourceType];
}

function operationalEvent(
  caseRow: typeof careerDataAdvisorCasesTable.$inferSelect,
  actorUserId: number,
  eventType: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, unknown>,
) {
  return {
    caseId: caseRow.id, ownerUserId: caseRow.ownerUserId,
    advisorUserId: caseRow.advisorUserId, actorUserId,
    eventType, resourceType, resourceId, metadata,
  };
}

function withCalculatedFollowUpStatus(
  row: typeof careerDataAdvisorFollowUpsTable.$inferSelect,
  now?: Date,
) {
  return {
    ...row,
    calculatedStatus: calculateFollowUpStatus({
      dueAt: row.dueAt, completedAt: row.completedAt,
      cancelledAt: row.cancelledAt, now,
    }),
  };
}

function emptyOperationalQueues() {
  return {
    actionsOverdue: [], evidenceAwaitingReview: [], reviewsAwaitingDecision: [],
    sessionsDue: [], followUpsDue: [],
  };
}

function safeProviderReference(value: string) {
  const trimmed = plainText(value).slice(0, 200);
  if (/password|token|secret|passcode/i.test(trimmed)) throw repositoryError("unsafe_provider_reference");
  return trimmed.replace(/[?#].*$/, "");
}

async function requireCase(
  tx: Transaction, actor: Actor, caseId: string, scope: AdvisorScope, allowTerminal: boolean,
) {
  const [row] = await tx.select().from(careerDataAdvisorCasesTable).where(and(
    eq(careerDataAdvisorCasesTable.id, caseId),
    isNull(careerDataAdvisorCasesTable.deletedAt),
  ));
  if (!row) throw repositoryError("resource_not_found");
  if (actor.role === "client") {
    if (row.ownerUserId !== actor.userId) throw repositoryError("resource_not_found");
  } else {
    if (row.advisorUserId !== actor.userId) throw repositoryError("resource_not_found");
    await requireAdvisorProfile(tx, actor.userId, true);
    await requireGrant(tx, {
      grantId: row.advisorGrantId, ownerUserId: row.ownerUserId,
      advisorUserId: row.advisorUserId, scope,
    });
  }
  if (!allowTerminal && ["closed", "cancelled", "access_revoked"].includes(row.caseStatus))
    throw repositoryError("case_closed");
  if (actor.role === "advisor" && row.caseStatus === "access_revoked")
    throw repositoryError("resource_not_found");
  return row;
}

async function requireAdvisorProfile(tx: Transaction, advisorUserId: number, requireOperational: boolean) {
  const [profile] = await tx.select().from(careerDataAdvisorProfilesTable).where(and(
    eq(careerDataAdvisorProfilesTable.advisorUserId, advisorUserId),
    isNull(careerDataAdvisorProfilesTable.deletedAt),
  ));
  if (!profile) throw repositoryError("advisor_not_verified");
  if (requireOperational && profile.verificationStatus !== "verified")
    throw repositoryError("advisor_not_verified");
  if (requireOperational && profile.accountStatus !== "active")
    throw repositoryError(profile.accountStatus === "suspended" ? "advisor_suspended" : "case_access_denied");
  return profile;
}

async function requireGrant(tx: Transaction, input: {
  grantId: string; ownerUserId: number; advisorUserId: number; scope: AdvisorScope;
}) {
  const [grant] = await tx.select().from(careerDataAdvisorGrantsTable).where(and(
    eq(careerDataAdvisorGrantsTable.id, input.grantId),
    eq(careerDataAdvisorGrantsTable.ownerUserId, input.ownerUserId),
    eq(careerDataAdvisorGrantsTable.advisorUserId, input.advisorUserId),
    eq(careerDataAdvisorGrantsTable.status, "active"),
    isNull(careerDataAdvisorGrantsTable.revokedAt),
  ));
  if (!grant) throw repositoryError("advisor_grant_required");
  if (grant.expiresAt && grant.expiresAt <= new Date()) throw repositoryError("advisor_grant_expired");
  const scopes = Array.isArray(grant.scopes) ? grant.scopes : [];
  if (!scopes.includes(input.scope)) throw repositoryError("advisor_scope_insufficient");
  return grant;
}

async function requireOwnedResource(tx: Transaction, ownerUserId: number, resourceType: string, resourceId: string) {
  const resourceMap: Record<string, string> = {
    career_profile: "career_data_profiles", career_goal: "career_data_goals",
    career_assessment: "career_data_assessments", career_plan: "career_data_plans",
    career_action: "career_data_plan_items", evidence_record: "career_data_evidence",
  };
  const table = resourceMap[resourceType];
  if (!table) {
    const result = await tx.execute(sql.raw(
      `select 1 from career_data_workflow_resources
       where workflow_resource_id = '${escapeLiteral(resourceId)}'
         and resource_type = '${escapeLiteral(resourceType)}'
         and owner_user_id = ${ownerUserId} and deleted_at is null limit 1`,
    ));
    if (result.rowCount !== 1) throw repositoryError("resource_not_found");
    return;
  }
  const result = await tx.execute(sql.raw(
    `select 1 from ${table} where id = '${escapeLiteral(resourceId)}' and owner_user_id = ${ownerUserId} and deleted_at is null limit 1`,
  ));
  if (result.rowCount !== 1) throw repositoryError("resource_not_found");
}

async function requireSession(tx: Transaction, sessionId: string, caseId: string) {
  const [row] = await tx.select({ id: careerDataAdvisorSessionsTable.id })
    .from(careerDataAdvisorSessionsTable).where(and(
      eq(careerDataAdvisorSessionsTable.id, sessionId),
      eq(careerDataAdvisorSessionsTable.caseId, caseId),
    ));
  if (!row) throw repositoryError("resource_not_found");
}

async function setActor(tx: Transaction, userId: number) {
  await tx.execute(sql`select set_config('app.user_id', ${String(userId)}, true)`);
}

async function replay(tx: Transaction, ownerUserId: number, operation: string, key: string, fields: unknown) {
  const value = fingerprint(ownerUserId, operation, key, fields);
  const [row] = await tx.select().from(careerDataIdempotencyTable).where(and(
    eq(careerDataIdempotencyTable.ownerUserId, ownerUserId),
    eq(careerDataIdempotencyTable.operation, operation),
    eq(careerDataIdempotencyTable.idempotencyKeyHash, value.idempotencyKeyHash),
    gt(careerDataIdempotencyTable.expiresAt, new Date()),
  ));
  if (!row) return null;
  if (row.requestFingerprint !== value.requestFingerprint) throw repositoryError("idempotency_conflict");
  return row.resourceId;
}

async function remember(
  tx: Transaction, ownerUserId: number, operation: string, key: string,
  fields: unknown, resourceType: string, resourceId: string,
) {
  await tx.insert(careerDataIdempotencyTable).values({
    id: `idempotency_${randomUUID()}`, ownerUserId, operation,
    ...fingerprint(ownerUserId, operation, key, fields),
    resourceType, resourceId, expiresAt: new Date(Date.now() + 86_400_000),
  });
}

async function activity(tx: Transaction, input: {
  caseId?: string; ownerUserId: number; advisorUserId?: number; actorUserId: number;
  eventType: string; resourceType: string; resourceId: string;
  metadata?: Record<string, unknown>;
}) {
  await tx.insert(careerDataAdvisorActivityEventsTable).values({
    id: `advisor_event_${randomUUID()}`, caseId: input.caseId ?? null,
    ownerUserId: input.ownerUserId, advisorUserId: input.advisorUserId ?? null,
    actorUserId: input.actorUserId, eventType: input.eventType,
    resourceType: input.resourceType, resourceId: input.resourceId,
    outcome: "success", metadata: input.metadata ?? {},
  });
  await tx.insert(careerDataAuditEventsTable).values({
    id: `audit_${randomUUID()}`,
    ownerUserId: input.ownerUserId,
    actorUserId: input.actorUserId,
    subjectUserId: input.ownerUserId,
    eventType: input.eventType,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    requestId: `advisor_repository_${randomUUID()}`,
    outcome: "success",
    metadata: input.metadata ?? {},
  });
  const metric = metricForActivity(input.eventType);
  if (metric) recordAdvisorMetric(metric);
}

async function profileConflict(advisorUserId: number, expectedVersion: number): Promise<never> {
  const [row] = await db.select({ recordVersion: careerDataAdvisorProfilesTable.recordVersion })
    .from(careerDataAdvisorProfilesTable)
    .where(eq(careerDataAdvisorProfilesTable.advisorUserId, advisorUserId));
  if (!row) throw repositoryError("resource_not_found");
  if (row.recordVersion !== expectedVersion) throw repositoryError("record_version_conflict");
  throw repositoryError("persistence_failed");
}

function toDomainCase(row: typeof careerDataAdvisorCasesTable.$inferSelect): AdvisorCase {
  return {
    caseId: row.id, ownerUserId: row.ownerUserId, advisorUserId: row.advisorUserId,
    advisorGrantId: row.advisorGrantId, caseStatus: row.caseStatus as CaseStatus,
    serviceType: row.serviceType, priority: row.priority as AdvisorCase["priority"],
    currentStage: row.caseStage as CaseStage, openedAt: row.openedAt.toISOString(),
    closedAt: row.closedAt?.toISOString() ?? null,
    nextReviewAt: row.nextReviewAt?.toISOString() ?? null,
    summary: null, recordVersion: row.recordVersion,
  };
}

function fingerprint(ownerUserId: number, operation: string, key: string, fields: unknown) {
  return {
    idempotencyKeyHash: hash(`${ownerUserId}:${operation}:${key}`),
    requestFingerprint: hash(JSON.stringify(fields)),
  };
}

function plainText(value: string) {
  return value.replace(/<[^>]*>/g, "").trim();
}

function escapeLiteral(value: string) {
  return value.replaceAll("'", "''");
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function repositoryError(code: string) {
  if (code === "record_version_conflict") recordAdvisorMetric("version_conflicts");
  if ([
    "case_access_denied","advisor_scope_insufficient","advisor_grant_required",
    "advisor_grant_expired","advisor_grant_revoked","advisor_not_verified",
    "advisor_suspended","resource_not_found",
  ].includes(code)) recordAdvisorMetric("authorization_denials");
  if (code === "durable_source_required") recordAdvisorMetric("durable_source_failures");
  return Object.assign(new Error(code), { code });
}
