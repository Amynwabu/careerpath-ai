import { createHash, randomUUID } from "node:crypto";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import {
  careerDataAdvisorActionsTable,
  careerDataAdvisorActivityEventsTable,
  careerDataAdvisorCapacityTable,
  careerDataAdvisorCaseResourcesTable,
  careerDataAdvisorCasesTable,
  careerDataAdvisorEvidenceRequestsTable,
  careerDataAdvisorGrantsTable,
  careerDataAdvisorProfilesTable,
  careerDataAdvisorSessionNotesTable,
  careerDataAdvisorSessionSummariesTable,
  careerDataAdvisorSessionsTable,
  careerDataAuditEventsTable,
  careerDataIdempotencyTable,
  db,
} from "@workspace/db";
import {
  advisorScopes,
  transitionCase,
  type AdvisorCase,
  type AdvisorScope,
  type CaseStage,
  type CaseStatus,
} from "@workspace/advisor-workspace";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ActorRole = "client" | "advisor";
type Actor = { userId: number; role: ActorRole };

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
  return db.transaction(async (tx) => {
    await setActor(tx, input.actor.userId);
    const caseRow = await requireCase(tx, input.actor, input.caseId, "case_manage", false);
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
      createdBy: input.actor.userId, updatedBy: input.actor.userId,
    }).returning();
    await remember(tx, caseRow.ownerUserId, operation, input.idempotencyKey, fields, "advisor_session", id);
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
    const caseRow = await requireCase(tx, input.actor, input.caseId, "case_manage", false);
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
    const caseRow = await requireCase(tx, input.actor, input.caseId, "case_manage", false);
    await requireSession(tx, input.sessionId, input.caseId);
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
    return row!;
  });
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
  if (!table) throw repositoryError("unsupported_resource_type");
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
  return Object.assign(new Error(code), { code });
}
