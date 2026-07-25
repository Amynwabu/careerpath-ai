import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { usersTable } from "./users";

const ownerFields = {
  ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  updatedBy: integer("updated_by").notNull().references(() => usersTable.id),
  recordVersion: integer("record_version").notNull().default(1),
};

const deletionFields = {
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedBy: integer("deleted_by").references(() => usersTable.id),
  deletionReason: text("deletion_reason"),
  retentionClass: text("retention_class").notNull(),
};

export const careerDataProfilesTable = pgTable("career_data_profiles", {
  id: text("id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  profileVersion: text("profile_version").notNull(),
  status: text("status").notNull(),
  summary: text("summary").notNull().default(""),
  completeness: jsonb("completeness").notNull(),
  confidence: jsonb("confidence").notNull(),
  validationStatus: text("validation_status").notNull(),
  sourceDocumentIds: jsonb("source_document_ids").notNull(),
  active: boolean("active").notNull().default(false),
}, (table) => [
  index("career_data_profiles_owner_idx").on(table.ownerUserId),
  index("career_data_profiles_status_idx").on(table.ownerUserId, table.status),
  uniqueIndex("career_data_profiles_one_active_idx").on(table.ownerUserId).where(sql`${table.active} = true`),
  index("career_data_profiles_retention_idx").on(table.retentionClass, table.deletedAt),
]);

export const careerDataPersonalDataTable = pgTable("career_data_personal_data", {
  id: text("id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  profileId: text("profile_id").notNull().references(() => careerDataProfilesTable.id, { onDelete: "cascade" }),
  fullName: text("full_name"),
  email: text("email"),
  telephone: text("telephone"),
  postalAddress: text("postal_address"),
  personalUrls: jsonb("personal_urls").notNull().default([]),
  credentialIdentifiers: jsonb("credential_identifiers").notNull().default([]),
}, (table) => [
  uniqueIndex("career_data_personal_profile_idx").on(table.profileId),
  index("career_data_personal_owner_idx").on(table.ownerUserId),
]);

export const careerDataDocumentsTable = pgTable("career_data_documents", {
  id: text("id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  originalFilename: text("original_filename").notNull(),
  safeFilename: text("safe_filename").notNull(),
  detectedMimeType: text("detected_mime_type"),
  declaredMimeType: text("declared_mime_type").notNull(),
  fileSizeBytes: bigint("file_size_bytes", { mode: "number" }).notNull(),
  checksum: text("checksum").notNull(),
  storageProvider: text("storage_provider"),
  storageObjectKey: text("storage_object_key"),
  uploadStatus: text("upload_status").notNull(),
  scanStatus: text("scan_status").notNull(),
  parseStatus: text("parse_status").notNull(),
  retentionMode: text("retention_mode").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
  parsedAt: timestamp("parsed_at", { withTimezone: true }),
}, (table) => [
  index("career_data_documents_owner_idx").on(table.ownerUserId),
  index("career_data_documents_expiry_idx").on(table.expiresAt, table.deletedAt),
  uniqueIndex("career_data_documents_owner_checksum_idx").on(table.ownerUserId, table.checksum),
]);

export const careerDataProfileEntitiesTable = pgTable("career_data_profile_entities", {
  id: text("id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  profileId: text("profile_id").notNull().references(() => careerDataProfilesTable.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  ordinal: integer("ordinal").notNull().default(0),
  canonicalCode: text("canonical_code"),
  taxonomyVersion: text("taxonomy_version"),
  data: jsonb("data").notNull(),
  sourceReferences: jsonb("source_references").notNull().default([]),
}, (table) => [
  index("career_data_profile_entities_owner_idx").on(table.ownerUserId),
  index("career_data_profile_entities_profile_idx").on(table.profileId, table.entityType),
]);

export const careerDataCorrectionsTable = pgTable("career_data_corrections", {
  id: text("id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  profileId: text("profile_id").notNull().references(() => careerDataProfilesTable.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  fieldPath: text("field_path").notNull(),
  originalValue: jsonb("original_value"),
  correctedValue: jsonb("corrected_value"),
  correctedAt: timestamp("corrected_at", { withTimezone: true }).notNull(),
  correctionReason: text("correction_reason").notNull(),
  reviewStatus: text("review_status").notNull(),
}, (table) => [
  index("career_data_corrections_owner_idx").on(table.ownerUserId),
  index("career_data_corrections_entity_idx").on(table.entityType, table.entityId),
]);

export const careerDataGoalsTable = pgTable("career_data_goals", {
  id: text("id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  profileId: text("profile_id").notNull().references(() => careerDataProfilesTable.id, { onDelete: "cascade" }),
  goalVersion: text("goal_version").notNull(),
  goalType: text("goal_type").notNull(),
  currentOccupationCode: text("current_occupation_code"),
  targetOccupationCode: text("target_occupation_code"),
  targetOccupationText: text("target_occupation_text"),
  targetCareerFamily: text("target_career_family"),
  targetLevel: text("target_level"),
  targetDate: timestamp("target_date", { withTimezone: true }),
  timeHorizonMonths: integer("time_horizon_months").notNull(),
  constraints: jsonb("constraints").notNull(),
  preferences: jsonb("preferences").notNull(),
  motivation: text("motivation"),
  resolutionState: text("resolution_state").notNull(),
  confirmation: jsonb("confirmation"),
  status: text("status").notNull(),
}, (table) => [
  index("career_data_goals_owner_idx").on(table.ownerUserId),
  index("career_data_goals_status_idx").on(table.ownerUserId, table.status),
]);

export const careerDataAssessmentsTable = pgTable("career_data_assessments", {
  id: text("id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  profileId: text("profile_id").notNull().references(() => careerDataProfilesTable.id, { onDelete: "cascade" }),
  goalId: text("goal_id").notNull().references(() => careerDataGoalsTable.id, { onDelete: "cascade" }),
  previousAssessmentId: text("previous_assessment_id"),
  taxonomyVersion: text("taxonomy_version").notNull(),
  engineVersion: text("engine_version").notNull(),
  assessmentVersion: text("assessment_version").notNull(),
  overallScore: integer("overall_score").notNull(),
  skillScore: integer("skill_score").notNull(),
  experienceScore: integer("experience_score").notNull(),
  qualificationScore: integer("qualification_score").notNull(),
  readinessBand: text("readiness_band").notNull(),
  confidence: integer("confidence_basis_points").notNull(),
  blockers: jsonb("blockers").notNull(),
  quickWins: jsonb("quick_wins").notNull(),
  evidence: jsonb("evidence").notNull(),
}, (table) => [
  index("career_data_assessments_owner_idx").on(table.ownerUserId),
  index("career_data_assessments_goal_idx").on(table.goalId, table.createdAt),
]);

export const careerDataAssessmentItemsTable = pgTable("career_data_assessment_items", {
  id: text("id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  assessmentId: text("assessment_id").notNull().references(() => careerDataAssessmentsTable.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  skillCode: text("skill_code"),
  category: text("category").notNull(),
  priority: text("priority"),
  data: jsonb("data").notNull(),
  sourceReferences: jsonb("source_references").notNull(),
}, (table) => [
  index("career_data_assessment_items_owner_idx").on(table.ownerUserId),
  index("career_data_assessment_items_assessment_idx").on(table.assessmentId, table.itemType),
]);

export const careerDataPlansTable = pgTable("career_data_plans", {
  id: text("id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  planSeriesId: text("plan_series_id").notNull(),
  revisionNumber: integer("revision_number").notNull(),
  profileId: text("profile_id").notNull().references(() => careerDataProfilesTable.id, { onDelete: "cascade" }),
  goalId: text("goal_id").notNull().references(() => careerDataGoalsTable.id, { onDelete: "cascade" }),
  assessmentId: text("assessment_id").notNull().references(() => careerDataAssessmentsTable.id),
  supersedesPlanId: text("supersedes_plan_id"),
  status: text("status").notNull(),
  summary: text("summary").notNull(),
  taxonomyVersion: text("taxonomy_version").notNull(),
  engineVersion: text("engine_version").notNull(),
  changeReason: text("change_reason"),
  assumptions: jsonb("assumptions").notNull(),
  constraints: jsonb("constraints").notNull(),
  frameworkStatus: text("framework_status").notNull(),
}, (table) => [
  index("career_data_plans_owner_idx").on(table.ownerUserId),
  uniqueIndex("career_data_plans_series_revision_idx").on(table.planSeriesId, table.revisionNumber),
  index("career_data_plans_profile_idx").on(table.profileId, table.createdAt),
]);

export const careerDataPlanItemsTable = pgTable("career_data_plan_items", {
  id: text("id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  planId: text("plan_id").notNull().references(() => careerDataPlansTable.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(),
  status: text("status").notNull(),
  verificationStatus: text("verification_status"),
  ordinal: integer("ordinal").notNull(),
  data: jsonb("data").notNull(),
}, (table) => [
  index("career_data_plan_items_owner_idx").on(table.ownerUserId),
  index("career_data_plan_items_plan_idx").on(table.planId, table.itemType, table.ordinal),
]);

export const careerDataPlanDependenciesTable = pgTable("career_data_plan_dependencies", {
  id: text("id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  planId: text("plan_id").notNull().references(() => careerDataPlansTable.id, { onDelete: "cascade" }),
  fromItemId: text("from_item_id").notNull(),
  toItemId: text("to_item_id").notNull(),
  dependencyType: text("dependency_type").notNull(),
}, (table) => [
  index("career_data_dependencies_owner_idx").on(table.ownerUserId),
  uniqueIndex("career_data_dependencies_edge_idx").on(table.planId, table.fromItemId, table.toItemId),
]);

export const careerDataEvidenceTable = pgTable("career_data_evidence", {
  id: text("id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  profileId: text("profile_id").notNull().references(() => careerDataProfilesTable.id, { onDelete: "cascade" }),
  planId: text("plan_id").references(() => careerDataPlansTable.id, { onDelete: "cascade" }),
  actionId: text("action_id"),
  evidenceType: text("evidence_type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  verificationStatus: text("verification_status").notNull(),
  sourceDocumentId: text("source_document_id").references(() => careerDataDocumentsTable.id, { onDelete: "set null" }),
  externalReference: text("external_reference"),
  linkedSkillCodes: jsonb("linked_skill_codes").notNull(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verifiedBy: integer("verified_by").references(() => usersTable.id),
}, (table) => [
  index("career_data_evidence_owner_idx").on(table.ownerUserId),
  index("career_data_evidence_plan_idx").on(table.planId, table.actionId),
]);

export const careerDataAdvisorGrantsTable = pgTable("career_data_advisor_grants", {
  id: text("id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  advisorUserId: integer("advisor_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  scopes: jsonb("scopes").notNull(),
  status: text("status").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
}, (table) => [
  index("career_data_grants_owner_idx").on(table.ownerUserId, table.status),
  index("career_data_grants_advisor_idx").on(table.advisorUserId, table.status, table.expiresAt),
]);

export const careerDataExportsTable = pgTable("career_data_exports", {
  id: text("id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  format: text("format").notNull(),
  status: text("status").notNull(),
  storageProvider: text("storage_provider"),
  storageObjectKey: text("storage_object_key"),
  checksum: text("checksum"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  index("career_data_exports_owner_idx").on(table.ownerUserId),
  index("career_data_exports_expiry_idx").on(table.expiresAt, table.deletedAt),
]);

export const careerDataDeletionRequestsTable = pgTable("career_data_deletion_requests", {
  id: text("id").primaryKey(),
  ...ownerFields,
  state: text("state").notNull(),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  failureCategory: text("failure_category"),
  retryCount: integer("retry_count").notNull().default(0),
}, (table) => [
  index("career_data_deletion_owner_idx").on(table.ownerUserId, table.state),
  index("career_data_deletion_schedule_idx").on(table.state, table.scheduledAt),
]);

export const careerDataAuditEventsTable = pgTable("career_data_audit_events", {
  id: text("id").primaryKey(),
  ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  actorUserId: integer("actor_user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  subjectUserId: integer("subject_user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  eventType: text("event_type").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  requestId: text("request_id").notNull(),
  outcome: text("outcome").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  retentionClass: text("retention_class").notNull().default("audit_event"),
}, (table) => [
  index("career_data_audit_owner_idx").on(table.ownerUserId, table.timestamp),
  index("career_data_audit_resource_idx").on(table.resourceType, table.resourceId),
]);

export const careerDataIdempotencyTable = pgTable("career_data_idempotency", {
  id: text("id").primaryKey(),
  ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  operation: text("operation").notNull(),
  idempotencyKeyHash: text("idempotency_key_hash").notNull(),
  requestFingerprint: text("request_fingerprint").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
}, (table) => [
  uniqueIndex("career_data_idempotency_key_idx").on(table.ownerUserId, table.operation, table.idempotencyKeyHash),
  index("career_data_idempotency_expiry_idx").on(table.expiresAt),
]);

export const careerDataRateLimitsTable = pgTable("career_data_rate_limits", {
  id: text("id").primaryKey(),
  ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  endpointClass: text("endpoint_class").notNull(),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull(),
  requestCount: integer("request_count").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("career_data_rate_limit_window_idx").on(table.ownerUserId, table.endpointClass, table.windowStartedAt),
  index("career_data_rate_limit_cleanup_idx").on(table.windowStartedAt),
]);
