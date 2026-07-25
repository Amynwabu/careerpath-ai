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

export const careerDataAdvisorProfilesTable = pgTable("career_data_advisor_profiles", {
  id: text("advisor_profile_id").primaryKey(),
  advisorUserId: integer("advisor_user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  displayName: text("display_name").notNull(),
  professionalTitle: text("professional_title"),
  verificationStatus: text("verification_status").notNull().default("unverified"),
  accountStatus: text("account_status").notNull().default("inactive"),
  capacityStatus: text("capacity_status").notNull().default("not_accepting_new_clients"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  recordVersion: integer("record_version").notNull().default(1),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("career_data_advisor_profiles_user_idx").on(table.advisorUserId),
  index("career_data_advisor_profiles_status_idx").on(table.verificationStatus, table.accountStatus),
]);

export const careerDataAdvisorSpecialismsTable = pgTable("career_data_advisor_specialisms", {
  id: text("id").primaryKey(),
  advisorProfileId: text("advisor_profile_id").notNull().references(() => careerDataAdvisorProfilesTable.id, { onDelete: "cascade" }),
  specialismCode: text("specialism_code").notNull(),
  declarationStatus: text("declaration_status").notNull(),
  reviewStatus: text("review_status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("career_data_advisor_specialism_unique_idx").on(table.advisorProfileId, table.specialismCode)]);

export const careerDataAdvisorCapacityTable = pgTable("career_data_advisor_capacity", {
  id: text("id").primaryKey(),
  advisorProfileId: text("advisor_profile_id").notNull().references(() => careerDataAdvisorProfilesTable.id, { onDelete: "cascade" }),
  capacityStatus: text("capacity_status").notNull(),
  maximumActiveCases: integer("maximum_active_cases"),
  availableSessionSlots: integer("available_session_slots"),
  serviceCategories: jsonb("service_categories").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  recordVersion: integer("record_version").notNull().default(1),
}, (table) => [uniqueIndex("career_data_advisor_capacity_profile_idx").on(table.advisorProfileId)]);

export const careerDataAdvisorCasesTable = pgTable("career_data_advisor_cases", {
  id: text("case_id").primaryKey(),
  ...ownerFields,
  ...deletionFields,
  advisorUserId: integer("advisor_user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  advisorProfileId: text("advisor_profile_id").notNull().references(() => careerDataAdvisorProfilesTable.id, { onDelete: "restrict" }),
  advisorGrantId: text("advisor_grant_id").notNull().references(() => careerDataAdvisorGrantsTable.id, { onDelete: "restrict" }),
  serviceType: text("service_type").notNull(),
  caseStatus: text("case_status").notNull(),
  caseStage: text("case_stage").notNull(),
  priority: text("priority").notNull().default("standard"),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
}, (table) => [
  index("career_data_advisor_cases_advisor_idx").on(table.advisorUserId, table.caseStatus),
  index("career_data_advisor_cases_owner_idx").on(table.ownerUserId, table.caseStatus),
  index("career_data_advisor_cases_grant_idx").on(table.advisorGrantId),
  index("career_data_advisor_cases_review_idx").on(table.nextReviewAt),
]);

export const careerDataAdvisorCaseResourcesTable = pgTable("career_data_advisor_case_resources", {
  id: text("case_resource_id").primaryKey(),
  caseId: text("case_id").notNull().references(() => careerDataAdvisorCasesTable.id, { onDelete: "restrict" }),
  ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  requiredScope: text("required_scope").notNull(),
  sharedAt: timestamp("shared_at", { withTimezone: true }).notNull().defaultNow(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdBy: integer("created_by").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("career_data_advisor_case_resource_unique_idx").on(table.caseId, table.resourceType, table.resourceId),
  index("career_data_advisor_case_resource_owner_idx").on(table.ownerUserId, table.resourceType),
]);

export const careerDataAdvisorSessionsTable = pgTable("career_data_advisor_sessions", {
  id: text("session_id").primaryKey(), ...ownerFields,
  caseId: text("case_id").notNull().references(() => careerDataAdvisorCasesTable.id, { onDelete: "restrict" }),
  advisorUserId: integer("advisor_user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  sessionType: text("session_type").notNull(), sessionStatus: text("session_status").notNull(),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }), scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
  actualStart: timestamp("actual_start", { withTimezone: true }), actualEnd: timestamp("actual_end", { withTimezone: true }),
  deliveryMode: text("delivery_mode").notNull(), locationOrProviderReference: text("location_or_provider_reference"),
}, (table) => [index("career_data_advisor_sessions_case_idx").on(table.caseId, table.scheduledStart)]);

export const careerDataAdvisorSessionNotesTable = pgTable("career_data_advisor_session_notes", {
  id: text("note_id").primaryKey(), ...ownerFields, ...deletionFields,
  sessionId: text("session_id").notNull().references(() => careerDataAdvisorSessionsTable.id, { onDelete: "restrict" }),
  caseId: text("case_id").notNull().references(() => careerDataAdvisorCasesTable.id, { onDelete: "restrict" }),
  advisorUserId: integer("advisor_user_id").notNull().references(() => usersTable.id, { onDelete: "restrict" }),
  noteType: text("note_type").notNull(), visibilityScope: text("visibility_scope").notNull(), content: text("content").notNull(),
}, (table) => [index("career_data_advisor_notes_session_idx").on(table.sessionId, table.visibilityScope)]);

export const careerDataAdvisorSessionSummariesTable = pgTable("career_data_advisor_session_summaries", {
  id: text("summary_id").primaryKey(), ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id),
  advisorUserId: integer("advisor_user_id").notNull().references(() => usersTable.id),
  sessionId: text("session_id").notNull().references(() => careerDataAdvisorSessionsTable.id, { onDelete: "restrict" }),
  caseId: text("case_id").notNull().references(() => careerDataAdvisorCasesTable.id, { onDelete: "restrict" }),
  summaryVersion: integer("summary_version").notNull(), sessionObjective: text("session_objective").notNull(),
  topicsDiscussed: jsonb("topics_discussed").notNull().default([]), keyObservations: jsonb("key_observations").notNull().default([]),
  agreedDecisions: jsonb("agreed_decisions").notNull().default([]), risksOrBlockers: jsonb("risks_or_blockers").notNull().default([]),
  nextReviewAt: timestamp("next_review_at", { withTimezone: true }), clientVisibleSummary: text("client_visible_summary").notNull(),
  createdBy: integer("created_by").notNull().references(() => usersTable.id), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  supersedesSummaryId: text("supersedes_summary_id"),
}, (table) => [uniqueIndex("career_data_advisor_summary_version_idx").on(table.sessionId, table.summaryVersion)]);

export const careerDataAdvisorActionsTable = pgTable("career_data_advisor_actions", {
  id: text("action_id").primaryKey(), ...ownerFields,
  caseId: text("case_id").notNull().references(() => careerDataAdvisorCasesTable.id, { onDelete: "restrict" }),
  advisorUserId: integer("advisor_user_id").notNull().references(() => usersTable.id), assignedTo: text("assigned_to").notNull(),
  actionType: text("action_type").notNull(), title: text("title").notNull(), description: text("description").notNull(),
  priority: text("priority").notNull(), status: text("status").notNull(), dueAt: timestamp("due_at", { withTimezone: true }),
  sourceSessionId: text("source_session_id").references(() => careerDataAdvisorSessionsTable.id), relatedResourceType: text("related_resource_type"),
  relatedResourceId: text("related_resource_id"), completionEvidenceRequired: boolean("completion_evidence_required").notNull().default(false),
  completedAt: timestamp("completed_at", { withTimezone: true }), verifiedAt: timestamp("verified_at", { withTimezone: true }),
}, (table) => [index("career_data_advisor_actions_case_idx").on(table.caseId, table.status), index("career_data_advisor_actions_due_idx").on(table.assignedTo, table.dueAt)]);

export const careerDataAdvisorEvidenceRequestsTable = pgTable("career_data_advisor_evidence_requests", {
  id: text("evidence_request_id").primaryKey(), ...ownerFields,
  caseId: text("case_id").notNull().references(() => careerDataAdvisorCasesTable.id, { onDelete: "restrict" }),
  advisorUserId: integer("advisor_user_id").notNull().references(() => usersTable.id), requestedBy: integer("requested_by").notNull().references(() => usersTable.id),
  requestedFrom: integer("requested_from").notNull().references(() => usersTable.id), evidenceType: text("evidence_type").notNull(),
  description: text("description").notNull(), relatedRequirement: text("related_requirement"), relatedResourceType: text("related_resource_type"),
  relatedResourceId: text("related_resource_id"), dueAt: timestamp("due_at", { withTimezone: true }), status: text("status").notNull(),
  submittedEvidenceId: text("submitted_evidence_id"), reviewDecision: text("review_decision"), reviewNotes: text("review_notes"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => [index("career_data_advisor_evidence_case_idx").on(table.caseId, table.status)]);

export const careerDataAdvisorReviewItemsTable = pgTable("career_data_advisor_review_items", {
  id: text("review_item_id").primaryKey(), ...ownerFields,
  caseId: text("case_id").notNull().references(() => careerDataAdvisorCasesTable.id, { onDelete: "restrict" }),
  advisorUserId: integer("advisor_user_id").notNull().references(() => usersTable.id), resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(), reviewType: text("review_type").notNull(), status: text("status").notNull(),
  priority: text("priority").notNull(), advisorDecision: text("advisor_decision"), clientDecision: text("client_decision"),
  decisionReason: text("decision_reason"), resolvedAt: timestamp("resolved_at", { withTimezone: true }),
}, (table) => [index("career_data_advisor_reviews_case_idx").on(table.caseId, table.status)]);

export const careerDataAdvisorCommentsTable = pgTable("career_data_advisor_comments", {
  id: text("comment_id").primaryKey(), caseId: text("case_id").notNull().references(() => careerDataAdvisorCasesTable.id, { onDelete: "restrict" }),
  reviewItemId: text("review_item_id").notNull().references(() => careerDataAdvisorReviewItemsTable.id, { onDelete: "restrict" }),
  parentCommentId: text("parent_comment_id"), authorUserId: integer("author_user_id").notNull().references(() => usersTable.id),
  authorRole: text("author_role").notNull(), visibilityScope: text("visibility_scope").notNull(), content: text("content").notNull(),
  status: text("status").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(), recordVersion: integer("record_version").notNull().default(1),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
}, (table) => [index("career_data_advisor_comments_review_idx").on(table.reviewItemId, table.visibilityScope)]);

export const careerDataAdvisorOutcomesTable = pgTable("career_data_advisor_outcomes", {
  id: text("outcome_id").primaryKey(), caseId: text("case_id").notNull().references(() => careerDataAdvisorCasesTable.id, { onDelete: "restrict" }),
  ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id), advisorUserId: integer("advisor_user_id").notNull().references(() => usersTable.id),
  outcomeType: text("outcome_type").notNull(), outcomeDate: timestamp("outcome_date", { withTimezone: true }).notNull(),
  verificationStatus: text("verification_status").notNull(), sourceReference: text("source_reference"), notes: text("notes"),
  createdBy: integer("created_by").notNull().references(() => usersTable.id), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  recordVersion: integer("record_version").notNull().default(1),
}, (table) => [index("career_data_advisor_outcomes_case_idx").on(table.caseId, table.outcomeType)]);

export const careerDataAdvisorPlacementsTable = pgTable("career_data_advisor_placements", {
  id: text("placement_id").primaryKey(), caseId: text("case_id").notNull().references(() => careerDataAdvisorCasesTable.id, { onDelete: "restrict" }),
  ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id), advisorUserId: integer("advisor_user_id").notNull().references(() => usersTable.id),
  employerName: text("employer_name").notNull(), roleTitle: text("role_title").notNull(), startDate: timestamp("start_date", { withTimezone: true }),
  employmentType: text("employment_type"), location: text("location"), salaryAmount: bigint("salary_amount", { mode: "number" }),
  salaryCurrency: text("salary_currency"), salaryPeriod: text("salary_period"), sourceOpportunityId: text("source_opportunity_id"),
  offerStatus: text("offer_status").notNull(), verificationStatus: text("verification_status").notNull(),
  createdBy: integer("created_by").notNull().references(() => usersTable.id), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(), recordVersion: integer("record_version").notNull().default(1),
}, (table) => [index("career_data_advisor_placements_case_idx").on(table.caseId)]);

export const careerDataAdvisorFollowUpsTable = pgTable("career_data_advisor_follow_ups", {
  id: text("follow_up_id").primaryKey(), caseId: text("case_id").notNull().references(() => careerDataAdvisorCasesTable.id, { onDelete: "restrict" }),
  ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id), advisorUserId: integer("advisor_user_id").notNull().references(() => usersTable.id),
  followUpType: text("follow_up_type").notNull(), dueAt: timestamp("due_at", { withTimezone: true }).notNull(), status: text("status").notNull(),
  relatedActionId: text("related_action_id").references(() => careerDataAdvisorActionsTable.id), relatedSessionId: text("related_session_id").references(() => careerDataAdvisorSessionsTable.id),
  createdBy: integer("created_by").notNull().references(() => usersTable.id), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(), completedAt: timestamp("completed_at", { withTimezone: true }),
  recordVersion: integer("record_version").notNull().default(1),
}, (table) => [index("career_data_advisor_followups_due_idx").on(table.advisorUserId, table.dueAt)]);

export const careerDataAdvisorActivityEventsTable = pgTable("career_data_advisor_activity_events", {
  id: text("id").primaryKey(), caseId: text("case_id").references(() => careerDataAdvisorCasesTable.id, { onDelete: "restrict" }),
  ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id), advisorUserId: integer("advisor_user_id").references(() => usersTable.id),
  actorUserId: integer("actor_user_id").notNull().references(() => usersTable.id), eventType: text("event_type").notNull(),
  resourceType: text("resource_type").notNull(), resourceId: text("resource_id").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(), outcome: text("outcome").notNull(),
  metadata: jsonb("metadata").notNull().default({}), retentionClass: text("retention_class").notNull().default("advisor_activity"),
}, (table) => [index("career_data_advisor_activity_case_idx").on(table.caseId, table.occurredAt)]);
