import { createHash, randomUUID } from "node:crypto";
import { and, asc, desc, eq, gt, isNull, lt, or, sql } from "drizzle-orm";
import {
  careerDataAdvisorGrantsTable,
  careerDataAssessmentItemsTable,
  careerDataAssessmentsTable,
  careerDataAuditEventsTable,
  careerDataCorrectionsTable,
  careerDataDeletionRequestsTable,
  careerDataDocumentsTable,
  careerDataEvidenceTable,
  careerDataExportsTable,
  careerDataGoalsTable,
  careerDataIdempotencyTable,
  careerDataPersonalDataTable,
  careerDataPlanDependenciesTable,
  careerDataPlanItemsTable,
  careerDataPlansTable,
  careerDataProfileEntitiesTable,
  careerDataProfilesTable,
  db,
} from "@workspace/db";
import type { CareerProfile } from "@workspace/career-profile";
import type {
  CareerActionPlan,
  CareerGoal,
  EvidenceRecord,
  ReadinessAssessment,
} from "@workspace/career-planning";
import {
  decodeCursor,
  encodeCursor,
  idempotencyFingerprint,
  normalizePageLimit,
  safeAuditEvent,
  type AdvisorScope,
} from "@workspace/career-data";

const engineVersion = "career-intelligence-1.0";

export async function createProfileRecord(input: {
  ownerUserId: number;
  profile: CareerProfile;
  idempotencyKey: string;
  requestId: string;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.ownerUserId);
    const replay = await idempotentReplay(tx, {
      ownerUserId: input.ownerUserId,
      operation: "create_profile",
      key: input.idempotencyKey,
      fields: { profileId: input.profile.profileId },
    });
    if (replay) return { profileId: replay, replayed: true };

    await tx.update(careerDataProfilesTable)
      .set({ active: false, updatedBy: input.ownerUserId })
      .where(and(
        eq(careerDataProfilesTable.ownerUserId, input.ownerUserId),
        eq(careerDataProfilesTable.active, true),
      ));
    await tx.insert(careerDataProfilesTable).values({
      id: input.profile.profileId,
      ownerUserId: input.ownerUserId,
      createdBy: input.ownerUserId,
      updatedBy: input.ownerUserId,
      retentionClass: "active_profile",
      profileVersion: input.profile.profileVersion,
      status: "active",
      summary: input.profile.summary,
      completeness: input.profile.confidence.profileCompleteness,
      confidence: input.profile.confidence,
      validationStatus: "valid",
      sourceDocumentIds: input.profile.sourceDocumentIds,
      active: true,
    });
    await tx.insert(careerDataPersonalDataTable).values({
      id: `personal_${input.profile.profileId}`,
      ownerUserId: input.ownerUserId,
      createdBy: input.ownerUserId,
      updatedBy: input.ownerUserId,
      retentionClass: "active_profile",
      profileId: input.profile.profileId,
      fullName: input.profile.personalData.name,
      email: input.profile.personalData.email,
      telephone: input.profile.personalData.phone,
      postalAddress: input.profile.personalData.location,
      personalUrls: input.profile.personalData.personalUrls,
      credentialIdentifiers: input.profile.certifications
        .flatMap((item) => item.credentialIdentifier ? [item.credentialIdentifier] : []),
    });
    const entities = profileEntities(input.profile).map((entity, ordinal) => ({
      id: entity.id,
      ownerUserId: input.ownerUserId,
      createdBy: input.ownerUserId,
      updatedBy: input.ownerUserId,
      retentionClass: "active_profile",
      profileId: input.profile.profileId,
      entityType: entity.type,
      ordinal,
      canonicalCode: entity.canonicalCode,
      taxonomyVersion: entity.taxonomyVersion,
      data: entity.data,
      sourceReferences: entity.sourceReferences,
    }));
    if (entities.length) await tx.insert(careerDataProfileEntitiesTable).values(entities);
    await storeIdempotency(tx, {
      ownerUserId: input.ownerUserId,
      operation: "create_profile",
      key: input.idempotencyKey,
      fields: { profileId: input.profile.profileId },
      resourceType: "profile",
      resourceId: input.profile.profileId,
    });
    await audit(tx, {
      ownerUserId: input.ownerUserId,
      requestId: input.requestId,
      eventType: "profile_created",
      resourceType: "profile",
      resourceId: input.profile.profileId,
      metadata: { recordCount: entities.length + 2, recordVersion: 1 },
    });
    return { profileId: input.profile.profileId, replayed: false };
  });
}

export async function getDocumentUsage(ownerUserId: number) {
  const rows = await db.select({
    count: sql<number>`count(*)::int`,
    bytes: sql<number>`coalesce(sum(${careerDataDocumentsTable.fileSizeBytes}), 0)::bigint`,
  }).from(careerDataDocumentsTable).where(and(
    eq(careerDataDocumentsTable.ownerUserId, ownerUserId),
    isNull(careerDataDocumentsTable.deletedAt),
  ));
  return {
    storedDocuments: rows[0]?.count ?? 0,
    storageBytes: Number(rows[0]?.bytes ?? 0),
  };
}

export async function createDocumentRecord(input: {
  ownerUserId: number;
  document: {
    id: string;
    originalFilename: string;
    safeFilename: string;
    declaredMimeType: string;
    detectedMimeType: string;
    fileSizeBytes: number;
    checksum: string;
    storageProvider: string;
    storageObjectKey: string;
    scanStatus: string;
    retentionMode: string;
    expiresAt: Date | null;
  };
}) {
  const [row] = await db.insert(careerDataDocumentsTable).values({
    id: input.document.id,
    ownerUserId: input.ownerUserId,
    createdBy: input.ownerUserId,
    updatedBy: input.ownerUserId,
    retentionClass: input.document.retentionMode === "temporary"
      ? "temporary_upload"
      : "source_document",
    originalFilename: input.document.originalFilename,
    safeFilename: input.document.safeFilename,
    declaredMimeType: input.document.declaredMimeType,
    detectedMimeType: input.document.detectedMimeType,
    fileSizeBytes: input.document.fileSizeBytes,
    checksum: input.document.checksum,
    storageProvider: input.document.storageProvider,
    storageObjectKey: input.document.storageObjectKey,
    uploadStatus: "uploaded",
    scanStatus: input.document.scanStatus,
    parseStatus: "not_started",
    retentionMode: input.document.retentionMode,
    expiresAt: input.document.expiresAt,
  }).returning({
    id: careerDataDocumentsTable.id,
    originalFilename: careerDataDocumentsTable.originalFilename,
    safeFilename: careerDataDocumentsTable.safeFilename,
    detectedMimeType: careerDataDocumentsTable.detectedMimeType,
    fileSizeBytes: careerDataDocumentsTable.fileSizeBytes,
    uploadStatus: careerDataDocumentsTable.uploadStatus,
    scanStatus: careerDataDocumentsTable.scanStatus,
    parseStatus: careerDataDocumentsTable.parseStatus,
    retentionMode: careerDataDocumentsTable.retentionMode,
    expiresAt: careerDataDocumentsTable.expiresAt,
    recordVersion: careerDataDocumentsTable.recordVersion,
  });
  return row!;
}

export async function listDocumentRecords(ownerUserId: number, limitValue?: unknown) {
  return db.select({
    id: careerDataDocumentsTable.id,
    originalFilename: careerDataDocumentsTable.originalFilename,
    safeFilename: careerDataDocumentsTable.safeFilename,
    detectedMimeType: careerDataDocumentsTable.detectedMimeType,
    fileSizeBytes: careerDataDocumentsTable.fileSizeBytes,
    uploadStatus: careerDataDocumentsTable.uploadStatus,
    scanStatus: careerDataDocumentsTable.scanStatus,
    parseStatus: careerDataDocumentsTable.parseStatus,
    retentionMode: careerDataDocumentsTable.retentionMode,
    uploadedAt: careerDataDocumentsTable.uploadedAt,
    expiresAt: careerDataDocumentsTable.expiresAt,
    recordVersion: careerDataDocumentsTable.recordVersion,
  }).from(careerDataDocumentsTable).where(and(
    eq(careerDataDocumentsTable.ownerUserId, ownerUserId),
    isNull(careerDataDocumentsTable.deletedAt),
  )).orderBy(desc(careerDataDocumentsTable.uploadedAt))
    .limit(normalizePageLimit(limitValue, 50));
}

export async function getDocumentStorageRecord(ownerUserId: number, documentId: string) {
  const [row] = await db.select().from(careerDataDocumentsTable).where(and(
    eq(careerDataDocumentsTable.id, documentId),
    eq(careerDataDocumentsTable.ownerUserId, ownerUserId),
    isNull(careerDataDocumentsTable.deletedAt),
  ));
  if (!row) throw repositoryError("resource_not_found");
  return row;
}

export async function markDocumentDeleted(input: {
  ownerUserId: number;
  documentId: string;
  reason: string;
}) {
  const [row] = await db.update(careerDataDocumentsTable).set({
    deletedAt: new Date(),
    deletedBy: input.ownerUserId,
    deletionReason: input.reason,
    uploadStatus: "deleted",
    updatedAt: new Date(),
    updatedBy: input.ownerUserId,
    recordVersion: sql`${careerDataDocumentsTable.recordVersion} + 1`,
  }).where(and(
    eq(careerDataDocumentsTable.id, input.documentId),
    eq(careerDataDocumentsTable.ownerUserId, input.ownerUserId),
    isNull(careerDataDocumentsTable.deletedAt),
  )).returning({ id: careerDataDocumentsTable.id });
  if (!row) throw repositoryError("resource_not_found");
  return row;
}

export async function listProfiles(input: {
  ownerUserId: number;
  limit?: unknown;
  cursor?: string;
  status?: string;
}) {
  const limit = normalizePageLimit(input.limit, 50);
  const cursor = decodeCursor(input.cursor);
  const conditions = [
    eq(careerDataProfilesTable.ownerUserId, input.ownerUserId),
    isNull(careerDataProfilesTable.deletedAt),
  ];
  if (input.status) conditions.push(eq(careerDataProfilesTable.status, input.status));
  if (cursor) {
    const cursorDate = new Date(cursor.createdAt);
    conditions.push(or(
      lt(careerDataProfilesTable.createdAt, cursorDate),
      and(
        eq(careerDataProfilesTable.createdAt, cursorDate),
        gt(careerDataProfilesTable.id, cursor.id),
      ),
    )!);
  }
  const rows = await db.select({
    id: careerDataProfilesTable.id,
    profileVersion: careerDataProfilesTable.profileVersion,
    status: careerDataProfilesTable.status,
    active: careerDataProfilesTable.active,
    completeness: careerDataProfilesTable.completeness,
    validationStatus: careerDataProfilesTable.validationStatus,
    recordVersion: careerDataProfilesTable.recordVersion,
    createdAt: careerDataProfilesTable.createdAt,
    updatedAt: careerDataProfilesTable.updatedAt,
  }).from(careerDataProfilesTable)
    .where(and(...conditions))
    .orderBy(desc(careerDataProfilesTable.createdAt), asc(careerDataProfilesTable.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return {
    items: page,
    nextCursor: rows.length > limit && last
      ? encodeCursor({ createdAt: last.createdAt.toISOString(), id: last.id })
      : null,
  };
}

export async function getProfileRecord(ownerUserId: number, profileId: string) {
  const [profile] = await db.select().from(careerDataProfilesTable).where(and(
    eq(careerDataProfilesTable.id, profileId),
    eq(careerDataProfilesTable.ownerUserId, ownerUserId),
    isNull(careerDataProfilesTable.deletedAt),
  ));
  if (!profile) throw repositoryError("resource_not_found");
  const [personalData, entities, corrections] = await Promise.all([
    db.select().from(careerDataPersonalDataTable).where(and(
      eq(careerDataPersonalDataTable.profileId, profileId),
      eq(careerDataPersonalDataTable.ownerUserId, ownerUserId),
      isNull(careerDataPersonalDataTable.deletedAt),
    )),
    db.select().from(careerDataProfileEntitiesTable).where(and(
      eq(careerDataProfileEntitiesTable.profileId, profileId),
      eq(careerDataProfileEntitiesTable.ownerUserId, ownerUserId),
      isNull(careerDataProfileEntitiesTable.deletedAt),
    )).orderBy(asc(careerDataProfileEntitiesTable.ordinal)),
    db.select().from(careerDataCorrectionsTable).where(and(
      eq(careerDataCorrectionsTable.profileId, profileId),
      eq(careerDataCorrectionsTable.ownerUserId, ownerUserId),
      isNull(careerDataCorrectionsTable.deletedAt),
    )),
  ]);
  return { profile, personalData: personalData[0] ?? null, entities, corrections };
}

export async function updateProfileRecord(input: {
  ownerUserId: number;
  profileId: string;
  expectedVersion: number;
  status?: string;
  summary?: string;
  requestId: string;
}) {
  const rows = await db.update(careerDataProfilesTable).set({
    ...(input.status ? { status: input.status } : {}),
    ...(typeof input.summary === "string" ? { summary: input.summary } : {}),
    updatedBy: input.ownerUserId,
    updatedAt: new Date(),
    recordVersion: sql`${careerDataProfilesTable.recordVersion} + 1`,
  }).where(and(
    eq(careerDataProfilesTable.id, input.profileId),
    eq(careerDataProfilesTable.ownerUserId, input.ownerUserId),
    eq(careerDataProfilesTable.recordVersion, input.expectedVersion),
    isNull(careerDataProfilesTable.deletedAt),
  )).returning();
  if (!rows.length) await distinguishConflict(input.ownerUserId, input.profileId, input.expectedVersion);
  return rows[0]!;
}

export async function archiveProfileRecord(input: {
  ownerUserId: number;
  profileId: string;
  expectedVersion: number;
  reason: string;
}) {
  const now = new Date();
  const rows = await db.update(careerDataProfilesTable).set({
    status: "archived",
    active: false,
    deletedAt: now,
    deletedBy: input.ownerUserId,
    deletionReason: input.reason,
    retentionClass: "archived_profile",
    updatedBy: input.ownerUserId,
    updatedAt: now,
    recordVersion: sql`${careerDataProfilesTable.recordVersion} + 1`,
  }).where(and(
    eq(careerDataProfilesTable.id, input.profileId),
    eq(careerDataProfilesTable.ownerUserId, input.ownerUserId),
    eq(careerDataProfilesTable.recordVersion, input.expectedVersion),
    isNull(careerDataProfilesTable.deletedAt),
  )).returning({ id: careerDataProfilesTable.id });
  if (!rows.length) await distinguishConflict(input.ownerUserId, input.profileId, input.expectedVersion);
  return rows[0]!;
}

export async function createGoalRecord(input: {
  ownerUserId: number;
  goal: CareerGoal;
  idempotencyKey: string;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.ownerUserId);
    const replay = await idempotentReplay(tx, {
      ownerUserId: input.ownerUserId,
      operation: "create_goal",
      key: input.idempotencyKey,
      fields: { goalId: input.goal.goalId },
    });
    if (replay) return { goalId: replay, replayed: true };
    await requireOwnedProfile(tx, input.ownerUserId, input.goal.profileId);
    await tx.insert(careerDataGoalsTable).values({
      id: input.goal.goalId,
      ownerUserId: input.ownerUserId,
      createdBy: input.ownerUserId,
      updatedBy: input.ownerUserId,
      retentionClass: "active_profile",
      profileId: input.goal.profileId,
      goalVersion: input.goal.goalVersion,
      goalType: input.goal.goalType,
      currentOccupationCode: input.goal.currentOccupationCode,
      targetOccupationCode: input.goal.targetOccupationCode,
      targetOccupationText: input.goal.targetOccupationText,
      targetCareerFamily: input.goal.targetCareerFamily,
      targetLevel: input.goal.targetLevel,
      targetDate: input.goal.targetDate ? new Date(input.goal.targetDate) : null,
      timeHorizonMonths: input.goal.timeHorizonMonths,
      constraints: input.goal.constraints,
      preferences: input.goal.preferences,
      motivation: input.goal.motivation,
      resolutionState: input.goal.targetOccupationCode ? "resolved" : "target_unresolved",
      status: input.goal.status,
    });
    await storeIdempotency(tx, {
      ownerUserId: input.ownerUserId,
      operation: "create_goal",
      key: input.idempotencyKey,
      fields: { goalId: input.goal.goalId },
      resourceType: "goal",
      resourceId: input.goal.goalId,
    });
    return { goalId: input.goal.goalId, replayed: false };
  });
}

export async function listGoalRecords(ownerUserId: number, limitValue?: unknown) {
  return db.select().from(careerDataGoalsTable).where(and(
    eq(careerDataGoalsTable.ownerUserId, ownerUserId),
    isNull(careerDataGoalsTable.deletedAt),
  )).orderBy(desc(careerDataGoalsTable.createdAt))
    .limit(normalizePageLimit(limitValue, 50));
}

export async function getGoalRecord(ownerUserId: number, goalId: string) {
  const [row] = await db.select().from(careerDataGoalsTable).where(and(
    eq(careerDataGoalsTable.id, goalId),
    eq(careerDataGoalsTable.ownerUserId, ownerUserId),
    isNull(careerDataGoalsTable.deletedAt),
  ));
  if (!row) throw repositoryError("resource_not_found");
  return row;
}

export async function createAssessmentRecord(input: {
  ownerUserId: number;
  assessment: ReadinessAssessment;
  idempotencyKey: string;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.ownerUserId);
    const replay = await idempotentReplay(tx, {
      ownerUserId: input.ownerUserId,
      operation: "create_assessment",
      key: input.idempotencyKey,
      fields: { assessmentId: input.assessment.assessmentId },
    });
    if (replay) return { assessmentId: replay, replayed: true };
    await requireOwnedGoal(tx, input.ownerUserId, input.assessment.goalId);
    await tx.insert(careerDataAssessmentsTable).values({
      id: input.assessment.assessmentId,
      ownerUserId: input.ownerUserId,
      createdBy: input.ownerUserId,
      updatedBy: input.ownerUserId,
      retentionClass: "active_profile",
      profileId: input.assessment.profileId,
      goalId: input.assessment.goalId,
      previousAssessmentId: input.assessment.previousAssessmentId,
      taxonomyVersion: input.assessment.taxonomyVersion,
      engineVersion,
      assessmentVersion: input.assessment.assessmentVersion,
      overallScore: input.assessment.overallScore,
      skillScore: input.assessment.skillScore,
      experienceScore: input.assessment.experienceScore,
      qualificationScore: input.assessment.qualificationScore,
      readinessBand: input.assessment.readinessBand,
      confidence: Math.round(input.assessment.confidence * 10_000),
      blockers: input.assessment.blockers,
      quickWins: input.assessment.quickWins,
      evidence: input.assessment.evidence,
    });
    const items = [
      ...input.assessment.strengths.map((item) => ({ type: "strength", item })),
      ...input.assessment.gaps.map((item) => ({ type: "gap", item })),
    ].map(({ type, item }) => ({
      id: `${input.assessment.assessmentId}_${type}_${hash(JSON.stringify(item)).slice(0, 12)}`,
      ownerUserId: input.ownerUserId,
      createdBy: input.ownerUserId,
      updatedBy: input.ownerUserId,
      retentionClass: "active_profile",
      assessmentId: input.assessment.assessmentId,
      itemType: type,
      skillCode: item.skillCode,
      category: type === "gap" ? (item as ReadinessAssessment["gaps"][number]).category : (item as ReadinessAssessment["strengths"][number]).strengthType,
      priority: type === "gap" ? (item as ReadinessAssessment["gaps"][number]).priority : null,
      data: item,
      sourceReferences: item.sourceReferences,
    }));
    if (items.length) await tx.insert(careerDataAssessmentItemsTable).values(items);
    await storeIdempotency(tx, {
      ownerUserId: input.ownerUserId,
      operation: "create_assessment",
      key: input.idempotencyKey,
      fields: { assessmentId: input.assessment.assessmentId },
      resourceType: "assessment",
      resourceId: input.assessment.assessmentId,
    });
    return { assessmentId: input.assessment.assessmentId, replayed: false };
  });
}

export async function createPlanRecord(input: {
  ownerUserId: number;
  plan: CareerActionPlan;
  idempotencyKey: string;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.ownerUserId);
    const replay = await idempotentReplay(tx, {
      ownerUserId: input.ownerUserId,
      operation: "create_plan",
      key: input.idempotencyKey,
      fields: { planId: input.plan.planId, version: input.plan.planVersion },
    });
    if (replay) return { planId: replay, replayed: true };
    await requireOwnedAssessment(tx, input.ownerUserId, input.plan.assessmentId);
    const revision = Number(input.plan.planVersion.split(".")[1] ?? 0);
    await tx.insert(careerDataPlansTable).values({
      id: input.plan.planId,
      ownerUserId: input.ownerUserId,
      createdBy: input.ownerUserId,
      updatedBy: input.ownerUserId,
      retentionClass: "active_profile",
      planSeriesId: input.plan.planId,
      revisionNumber: revision,
      profileId: input.plan.profileId,
      goalId: input.plan.goalId,
      assessmentId: input.plan.assessmentId,
      status: input.plan.status,
      summary: input.plan.summary,
      taxonomyVersion: input.plan.taxonomyVersion,
      engineVersion,
      changeReason: input.plan.changeReason,
      assumptions: input.plan.assumptions,
      constraints: input.plan.constraints,
      frameworkStatus: input.plan.frameworkStatus,
    });
    const items = [
      ...input.plan.actions.map((item, ordinal) => ({ type: "action", item, ordinal })),
      ...input.plan.milestones.map((item, ordinal) => ({ type: "milestone", item, ordinal })),
      ...input.plan.risks.map((item, ordinal) => ({ type: "risk", item, ordinal })),
    ].map(({ type, item, ordinal }) => ({
      id: type === "action" ? (item as CareerActionPlan["actions"][number]).actionId :
        type === "milestone" ? (item as CareerActionPlan["milestones"][number]).milestoneId :
        `${input.plan.planId}_risk_${ordinal}`,
      ownerUserId: input.ownerUserId,
      createdBy: input.ownerUserId,
      updatedBy: input.ownerUserId,
      retentionClass: "active_profile",
      planId: input.plan.planId,
      itemType: type,
      status: "status" in item ? item.status : "active",
      verificationStatus: type === "action" ? (item as CareerActionPlan["actions"][number]).completionVerification : null,
      ordinal,
      data: item,
    }));
    if (items.length) await tx.insert(careerDataPlanItemsTable).values(items);
    const dependencies = input.plan.actions.flatMap((action) =>
      action.dependencies.map((dependency) => ({
        id: `dependency_${hash(`${action.actionId}:${dependency}`).slice(0, 16)}`,
        ownerUserId: input.ownerUserId,
        createdBy: input.ownerUserId,
        updatedBy: input.ownerUserId,
        retentionClass: "active_profile",
        planId: input.plan.planId,
        fromItemId: action.actionId,
        toItemId: dependency,
        dependencyType: "prerequisite",
      })),
    );
    if (dependencies.length) await tx.insert(careerDataPlanDependenciesTable).values(dependencies);
    await storeIdempotency(tx, {
      ownerUserId: input.ownerUserId,
      operation: "create_plan",
      key: input.idempotencyKey,
      fields: { planId: input.plan.planId, version: input.plan.planVersion },
      resourceType: "plan",
      resourceId: input.plan.planId,
    });
    return { planId: input.plan.planId, replayed: false };
  });
}

export async function listAssessmentRecords(ownerUserId: number, limitValue?: unknown) {
  return db.select().from(careerDataAssessmentsTable).where(and(
    eq(careerDataAssessmentsTable.ownerUserId, ownerUserId),
    isNull(careerDataAssessmentsTable.deletedAt),
  )).orderBy(desc(careerDataAssessmentsTable.createdAt))
    .limit(normalizePageLimit(limitValue, 50));
}

export async function getAssessmentRecord(ownerUserId: number, assessmentId: string) {
  const [assessment] = await db.select().from(careerDataAssessmentsTable).where(and(
    eq(careerDataAssessmentsTable.id, assessmentId),
    eq(careerDataAssessmentsTable.ownerUserId, ownerUserId),
    isNull(careerDataAssessmentsTable.deletedAt),
  ));
  if (!assessment) throw repositoryError("resource_not_found");
  const items = await db.select().from(careerDataAssessmentItemsTable).where(and(
    eq(careerDataAssessmentItemsTable.assessmentId, assessmentId),
    eq(careerDataAssessmentItemsTable.ownerUserId, ownerUserId),
    isNull(careerDataAssessmentItemsTable.deletedAt),
  ));
  return { assessment, items };
}

export async function listPlanRecords(ownerUserId: number, limitValue?: unknown) {
  const limit = normalizePageLimit(limitValue, 50);
  return db.select().from(careerDataPlansTable).where(and(
    eq(careerDataPlansTable.ownerUserId, ownerUserId),
    isNull(careerDataPlansTable.deletedAt),
  )).orderBy(desc(careerDataPlansTable.createdAt)).limit(limit);
}

export async function getPlanRecord(ownerUserId: number, planId: string) {
  const [plan] = await db.select().from(careerDataPlansTable).where(and(
    eq(careerDataPlansTable.id, planId),
    eq(careerDataPlansTable.ownerUserId, ownerUserId),
    isNull(careerDataPlansTable.deletedAt),
  ));
  if (!plan) throw repositoryError("resource_not_found");
  const [items, dependencies] = await Promise.all([
    db.select().from(careerDataPlanItemsTable).where(and(
      eq(careerDataPlanItemsTable.planId, planId),
      eq(careerDataPlanItemsTable.ownerUserId, ownerUserId),
      isNull(careerDataPlanItemsTable.deletedAt),
    )).orderBy(asc(careerDataPlanItemsTable.ordinal)),
    db.select().from(careerDataPlanDependenciesTable).where(and(
      eq(careerDataPlanDependenciesTable.planId, planId),
      eq(careerDataPlanDependenciesTable.ownerUserId, ownerUserId),
      isNull(careerDataPlanDependenciesTable.deletedAt),
    )),
  ]);
  return { plan, items, dependencies };
}

export async function updateActionRecord(input: {
  ownerUserId: number;
  planId: string;
  actionId: string;
  expectedVersion: number;
  status: string;
  verificationStatus: string;
}) {
  const rows = await db.update(careerDataPlanItemsTable).set({
    status: input.status,
    verificationStatus: input.verificationStatus,
    updatedBy: input.ownerUserId,
    updatedAt: new Date(),
    recordVersion: sql`${careerDataPlanItemsTable.recordVersion} + 1`,
  }).where(and(
    eq(careerDataPlanItemsTable.id, input.actionId),
    eq(careerDataPlanItemsTable.planId, input.planId),
    eq(careerDataPlanItemsTable.ownerUserId, input.ownerUserId),
    eq(careerDataPlanItemsTable.itemType, "action"),
    eq(careerDataPlanItemsTable.recordVersion, input.expectedVersion),
    isNull(careerDataPlanItemsTable.deletedAt),
  )).returning();
  if (!rows.length) throw repositoryError("record_version_conflict");
  return rows[0]!;
}

export async function createEvidenceRecord(input: {
  ownerUserId: number;
  profileId: string;
  planId?: string;
  evidence: EvidenceRecord;
}) {
  await getProfileRecord(input.ownerUserId, input.profileId);
  const [row] = await db.insert(careerDataEvidenceTable).values({
    id: input.evidence.evidenceId,
    ownerUserId: input.ownerUserId,
    createdBy: input.ownerUserId,
    updatedBy: input.ownerUserId,
    retentionClass: "active_profile",
    profileId: input.profileId,
    planId: input.planId,
    actionId: input.evidence.linkedActionIds[0],
    evidenceType: input.evidence.evidenceType,
    title: input.evidence.title,
    description: input.evidence.description,
    verificationStatus: input.evidence.verificationStatus,
    linkedSkillCodes: input.evidence.linkedSkillCodes,
  }).returning();
  return row!;
}

export async function grantAdvisorAccess(input: {
  ownerUserId: number;
  advisorUserId: number;
  scopes: AdvisorScope[];
  expiresAt?: string | null;
}) {
  const allowed = new Set<AdvisorScope>([
    "profile_read", "redacted_profile_read", "assessment_read", "plan_read",
    "plan_comment", "plan_action_review", "opportunity_read", "job_match_read",
    "cv_analysis_read", "cv_draft_read", "cv_review", "interview_plan_read",
    "interview_response_read", "interview_review", "evidence_read",
    "evidence_review", "session_summary_read", "case_manage", "outcome_record",
  ]);
  if (!input.scopes.length || input.scopes.some((scope) => !allowed.has(scope)))
    throw repositoryError("forbidden");
  const id = `grant_${randomUUID()}`;
  const [row] = await db.insert(careerDataAdvisorGrantsTable).values({
    id,
    ownerUserId: input.ownerUserId,
    advisorUserId: input.advisorUserId,
    scopes: input.scopes,
    status: "active",
    grantedAt: new Date(),
    expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    createdBy: input.ownerUserId,
    updatedBy: input.ownerUserId,
    retentionClass: "active_profile",
  }).returning();
  return row!;
}

export async function revokeAdvisorAccess(ownerUserId: number, grantId: string) {
  const [row] = await db.update(careerDataAdvisorGrantsTable).set({
    status: "revoked",
    revokedAt: new Date(),
    updatedAt: new Date(),
    updatedBy: ownerUserId,
    recordVersion: sql`${careerDataAdvisorGrantsTable.recordVersion} + 1`,
  }).where(and(
    eq(careerDataAdvisorGrantsTable.id, grantId),
    eq(careerDataAdvisorGrantsTable.ownerUserId, ownerUserId),
    eq(careerDataAdvisorGrantsTable.status, "active"),
  )).returning();
  if (!row) throw repositoryError("resource_not_found");
  return row;
}

export async function listAdvisorAccess(ownerUserId: number) {
  return db.select({
    id: careerDataAdvisorGrantsTable.id,
    advisorUserId: careerDataAdvisorGrantsTable.advisorUserId,
    scopes: careerDataAdvisorGrantsTable.scopes,
    status: careerDataAdvisorGrantsTable.status,
    grantedAt: careerDataAdvisorGrantsTable.grantedAt,
    expiresAt: careerDataAdvisorGrantsTable.expiresAt,
    revokedAt: careerDataAdvisorGrantsTable.revokedAt,
    recordVersion: careerDataAdvisorGrantsTable.recordVersion,
  }).from(careerDataAdvisorGrantsTable).where(and(
    eq(careerDataAdvisorGrantsTable.ownerUserId, ownerUserId),
    isNull(careerDataAdvisorGrantsTable.deletedAt),
  )).orderBy(desc(careerDataAdvisorGrantsTable.grantedAt));
}

export async function requestAccountDeletion(input: {
  ownerUserId: number;
  idempotencyKey: string;
}) {
  return db.transaction(async (tx) => {
    await setActor(tx, input.ownerUserId);
    const replay = await idempotentReplay(tx, {
      ownerUserId: input.ownerUserId,
      operation: "request_deletion",
      key: input.idempotencyKey,
      fields: { ownerUserId: input.ownerUserId },
    });
    if (replay) return { deletionRequestId: replay, replayed: true };
    const id = `deletion_${randomUUID()}`;
    await tx.insert(careerDataDeletionRequestsTable).values({
      id,
      ownerUserId: input.ownerUserId,
      createdBy: input.ownerUserId,
      updatedBy: input.ownerUserId,
      state: "requested",
      requestedAt: new Date(),
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await storeIdempotency(tx, {
      ownerUserId: input.ownerUserId,
      operation: "request_deletion",
      key: input.idempotencyKey,
      fields: { ownerUserId: input.ownerUserId },
      resourceType: "deletion_request",
      resourceId: id,
    });
    return { deletionRequestId: id, replayed: false };
  });
}

export async function getAccountDeletionRequest(ownerUserId: number) {
  const [row] = await db.select().from(careerDataDeletionRequestsTable).where(
    eq(careerDataDeletionRequestsTable.ownerUserId, ownerUserId),
  ).orderBy(desc(careerDataDeletionRequestsTable.requestedAt)).limit(1);
  return row ?? null;
}

export async function cancelAccountDeletion(ownerUserId: number) {
  const [row] = await db.update(careerDataDeletionRequestsTable).set({
    state: "cancelled",
    updatedAt: new Date(),
    updatedBy: ownerUserId,
    recordVersion: sql`${careerDataDeletionRequestsTable.recordVersion} + 1`,
  }).where(and(
    eq(careerDataDeletionRequestsTable.ownerUserId, ownerUserId),
    or(
      eq(careerDataDeletionRequestsTable.state, "requested"),
      eq(careerDataDeletionRequestsTable.state, "scheduled"),
    ),
  )).returning();
  if (!row) throw repositoryError("resource_not_found");
  return row;
}

export async function createExportRequest(input: {
  ownerUserId: number;
  format: "json" | "markdown" | "zip";
  idempotencyKey: string;
}) {
  const id = `export_${randomUUID()}`;
  const [row] = await db.insert(careerDataExportsTable).values({
    id,
    ownerUserId: input.ownerUserId,
    createdBy: input.ownerUserId,
    updatedBy: input.ownerUserId,
    retentionClass: "generated_export",
    format: input.format,
    status: "requested",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  }).returning();
  return row!;
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function setActor(tx: Transaction, userId: number) {
  await tx.execute(sql`select set_config('app.user_id', ${String(userId)}, true)`);
}

async function requireOwnedProfile(tx: Transaction, ownerUserId: number, profileId: string) {
  const [row] = await tx.select({ id: careerDataProfilesTable.id }).from(careerDataProfilesTable).where(and(
    eq(careerDataProfilesTable.id, profileId),
    eq(careerDataProfilesTable.ownerUserId, ownerUserId),
    isNull(careerDataProfilesTable.deletedAt),
  ));
  if (!row) throw repositoryError("resource_not_found");
}

async function requireOwnedGoal(tx: Transaction, ownerUserId: number, goalId: string) {
  const [row] = await tx.select({ id: careerDataGoalsTable.id }).from(careerDataGoalsTable).where(and(
    eq(careerDataGoalsTable.id, goalId),
    eq(careerDataGoalsTable.ownerUserId, ownerUserId),
    isNull(careerDataGoalsTable.deletedAt),
  ));
  if (!row) throw repositoryError("resource_not_found");
}

async function requireOwnedAssessment(tx: Transaction, ownerUserId: number, assessmentId: string) {
  const [row] = await tx.select({ id: careerDataAssessmentsTable.id }).from(careerDataAssessmentsTable).where(and(
    eq(careerDataAssessmentsTable.id, assessmentId),
    eq(careerDataAssessmentsTable.ownerUserId, ownerUserId),
    isNull(careerDataAssessmentsTable.deletedAt),
  ));
  if (!row) throw repositoryError("resource_not_found");
}

async function distinguishConflict(ownerUserId: number, profileId: string, expectedVersion: number) {
  const [row] = await db.select({ recordVersion: careerDataProfilesTable.recordVersion })
    .from(careerDataProfilesTable).where(and(
      eq(careerDataProfilesTable.id, profileId),
      eq(careerDataProfilesTable.ownerUserId, ownerUserId),
      isNull(careerDataProfilesTable.deletedAt),
    ));
  if (!row) throw repositoryError("resource_not_found");
  if (row.recordVersion !== expectedVersion) throw repositoryError("record_version_conflict");
  throw repositoryError("persistence_failed");
}

async function idempotentReplay(
  tx: Transaction,
  input: {
    ownerUserId: number;
    operation: string;
    key: string;
    fields: unknown;
  },
) {
  const fingerprint = idempotencyFingerprint({
    ownerUserId: input.ownerUserId,
    operation: input.operation,
    idempotencyKey: input.key,
    stableRequestFields: input.fields,
  });
  const [row] = await tx.select().from(careerDataIdempotencyTable).where(and(
    eq(careerDataIdempotencyTable.ownerUserId, input.ownerUserId),
    eq(careerDataIdempotencyTable.operation, input.operation),
    eq(careerDataIdempotencyTable.idempotencyKeyHash, fingerprint.idempotencyKeyHash),
    gt(careerDataIdempotencyTable.expiresAt, new Date()),
  ));
  if (!row) return null;
  if (row.requestFingerprint !== fingerprint.requestFingerprint)
    throw repositoryError("idempotency_conflict");
  return row.resourceId;
}

async function storeIdempotency(
  tx: Transaction,
  input: {
    ownerUserId: number;
    operation: string;
    key: string;
    fields: unknown;
    resourceType: string;
    resourceId: string;
  },
) {
  const fingerprint = idempotencyFingerprint({
    ownerUserId: input.ownerUserId,
    operation: input.operation,
    idempotencyKey: input.key,
    stableRequestFields: input.fields,
  });
  await tx.insert(careerDataIdempotencyTable).values({
    id: `idempotency_${randomUUID()}`,
    ownerUserId: input.ownerUserId,
    operation: input.operation,
    ...fingerprint,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
}

async function audit(
  tx: Transaction,
  input: {
    ownerUserId: number;
    requestId: string;
    eventType: string;
    resourceType: string;
    resourceId: string;
    metadata?: Record<string, unknown>;
  },
) {
  const event = safeAuditEvent({
    eventType: input.eventType,
    actorUserId: input.ownerUserId,
    subjectUserId: input.ownerUserId,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    requestId: input.requestId,
    outcome: "success",
    metadata: input.metadata,
  });
  await tx.insert(careerDataAuditEventsTable).values({
    id: event.eventId,
    ownerUserId: input.ownerUserId,
    actorUserId: event.actorUserId,
    subjectUserId: event.subjectUserId,
    eventType: event.eventType,
    resourceType: event.resourceType,
    resourceId: event.resourceId,
    requestId: event.requestId,
    outcome: event.outcome,
    metadata: event.metadata,
  });
}

function profileEntities(profile: CareerProfile) {
  const rows: Array<{
    id: string;
    type: string;
    canonicalCode: string | null;
    taxonomyVersion: string | null;
    data: unknown;
    sourceReferences: string[];
  }> = [];
  const add = (
    type: string,
    items: Array<{ id: string; data: unknown; sourceReferences?: string[]; canonicalCode?: string | null; taxonomyVersion?: string | null }>,
  ) => rows.push(...items.map((item) => ({
    id: item.id,
    type,
    canonicalCode: item.canonicalCode ?? null,
    taxonomyVersion: item.taxonomyVersion ?? null,
    data: item.data,
    sourceReferences: item.sourceReferences ?? [],
  })));
  add("employment", profile.employment.map((item) => ({ id: item.employmentId, data: item, sourceReferences: item.sourceReferences })));
  add("education", profile.education.map((item) => ({ id: item.educationId, data: item, sourceReferences: item.sourceReferences })));
  add("certification", profile.certifications.map((item) => ({ id: item.credentialId, data: { ...item, credentialIdentifier: undefined }, sourceReferences: item.sourceReferences })));
  add("professional_membership", profile.professionalMemberships.map((item) => ({ id: item.credentialId, data: item, sourceReferences: item.sourceReferences })));
  add("project", profile.projects.map((item) => ({ id: item.projectId, data: item, sourceReferences: item.sourceReferences })));
  add("achievement", profile.achievements.map((item) => ({ id: item.achievementId, data: item, sourceReferences: item.sourceReferences })));
  add("raw_skill_evidence", profile.rawSkillEvidence.map((item) => ({ id: item.evidenceId, data: item, sourceReferences: item.sourceReferences })));
  add("resolved_skill", profile.resolvedSkills.map((item) => ({
    id: `${profile.profileId}_${item.skillCode}`,
    data: item,
    canonicalCode: item.skillCode,
    taxonomyVersion: null,
  })));
  return rows;
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function repositoryError(code: string) {
  return Object.assign(new Error(code), { code });
}
