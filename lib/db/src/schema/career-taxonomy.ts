import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const taxonomyVersionStatusEnum = pgEnum("taxonomy_version_status", [
  "draft",
  "review",
  "published",
  "retired",
]);

export const taxonomyRecordVerificationStatusEnum = pgEnum(
  "taxonomy_record_verification_status",
  [
    "draft",
    "ai_generated",
    "source_mapped",
    "expert_reviewed",
    "employer_validated",
    "published",
    "deprecated",
  ],
);

export const careerLevelEnum = pgEnum("career_level", [
  "entry",
  "practitioner",
  "senior_practitioner",
  "manager",
  "senior_manager",
  "executive",
  "specialist",
  "senior_specialist",
]);

export const taxonomySkillCategoryEnum = pgEnum("taxonomy_skill_category", [
  "technical",
  "domain_knowledge",
  "digital",
  "tool",
  "project_delivery",
  "commercial",
  "leadership",
  "behavioural",
  "transferable",
  "regulatory",
  "language",
]);

export const skillRelationshipTypeEnum = pgEnum("skill_relationship_type", [
  "prerequisite_of",
  "specialisation_of",
  "related_to",
  "alternative_to",
  "builds_on",
  "commonly_used_with",
]);

export const occupationSkillRequirementTypeEnum = pgEnum(
  "occupation_skill_requirement_type",
  ["essential", "desirable", "emerging", "regulatory", "leadership_stage"],
);

export const careerTransitionTypeEnum = pgEnum("career_transition_type", [
  "promotion",
  "lateral",
  "specialisation",
  "career_change",
  "return_to_work",
  "leadership",
  "consulting",
  "entrepreneurship",
  "bridge",
]);

export const taxonomyAliasTypeEnum = pgEnum("taxonomy_alias_type", [
  "alternative_title",
  "abbreviation",
  "regional_title",
  "industry_title",
  "legacy_title",
  "informal_title",
]);

export const provenanceSourceTypeEnum = pgEnum("provenance_source_type", [
  "internal",
  "esco",
  "onet",
  "uk_soc",
  "professional_body",
  "employer",
  "industry_expert",
  "government",
  "academic",
  "other",
]);

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

const nonEmptyText = (message: string) => z.string().trim().min(1, message);
const nullableCountryCode = (schema: z.ZodString) =>
  schema.trim().length(2, "Country code must be exactly 2 characters");
const nullableConfidence = (schema: z.ZodNumber) =>
  schema
    .min(0, "Confidence must be at least 0")
    .max(1, "Confidence must be at most 1");
const nonNegativeNumeric = (schema: z.ZodNumber) =>
  schema.min(0, "Value cannot be negative");
const oneToFiveLevel = (schema: z.ZodNumber) =>
  schema
    .int()
    .min(1, "Level must be at least 1")
    .max(5, "Level must be at most 5");

export const careerTaxonomyVersionsTable = pgTable(
  "career_taxonomy_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    version: text("version").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    status: taxonomyVersionStatusEnum("status").notNull().default("draft"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedBy: uuid("published_by"),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("career_taxonomy_versions_version_uidx").on(table.version),
    index("career_taxonomy_versions_status_idx").on(table.status),
    index("career_taxonomy_versions_effective_from_idx").on(
      table.effectiveFrom,
    ),
    index("career_taxonomy_versions_effective_to_idx").on(table.effectiveTo),
    check(
      "career_taxonomy_versions_version_not_blank",
      sql`btrim(${table.version}) <> ''`,
    ),
    check(
      "career_taxonomy_versions_name_not_blank",
      sql`btrim(${table.name}) <> ''`,
    ),
    check(
      "career_taxonomy_versions_effective_range_chk",
      sql`${table.effectiveTo} is null or ${table.effectiveFrom} is null or ${table.effectiveTo} > ${table.effectiveFrom}`,
    ),
  ],
);

export const careerFamiliesTable = pgTable(
  "career_families",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    parentFamilyId: uuid("parent_family_id").references(
      (): AnyPgColumn => careerFamiliesTable.id,
      { onDelete: "set null" },
    ),
    taxonomyVersionId: uuid("taxonomy_version_id")
      .notNull()
      .references(() => careerTaxonomyVersionsTable.id, {
        onDelete: "restrict",
      }),
    verificationStatus: taxonomyRecordVerificationStatusEnum(
      "verification_status",
    )
      .notNull()
      .default("draft"),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("career_families_code_uidx").on(table.code),
    uniqueIndex("career_families_slug_uidx").on(table.slug),
    index("career_families_parent_family_id_idx").on(table.parentFamilyId),
    index("career_families_taxonomy_version_id_idx").on(
      table.taxonomyVersionId,
    ),
    index("career_families_verification_status_idx").on(
      table.verificationStatus,
    ),
    index("career_families_is_active_idx").on(table.isActive),
    check("career_families_code_not_blank", sql`btrim(${table.code}) <> ''`),
    check("career_families_name_not_blank", sql`btrim(${table.name}) <> ''`),
    check("career_families_slug_not_blank", sql`btrim(${table.slug}) <> ''`),
    check(
      "career_families_not_own_parent_chk",
      sql`${table.parentFamilyId} is null or ${table.parentFamilyId} <> ${table.id}`,
    ),
    check(
      "career_families_display_order_non_negative_chk",
      sql`${table.displayOrder} >= 0`,
    ),
  ],
);

export const occupationsTable = pgTable(
  "occupations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    canonicalTitle: text("canonical_title").notNull(),
    slug: text("slug").notNull(),
    summary: text("summary").notNull(),
    description: text("description"),
    careerFamilyId: uuid("career_family_id")
      .notNull()
      .references(() => careerFamiliesTable.id, { onDelete: "restrict" }),
    careerLevel: careerLevelEnum("career_level").notNull(),
    countryCode: text("country_code"),
    industryContext: text("industry_context"),
    ukSocCode: text("uk_soc_code"),
    onetCode: text("onet_code"),
    escoUri: text("esco_uri"),
    minimumExperienceYears: numeric("minimum_experience_years", {
      precision: 5,
      scale: 2,
      mode: "number",
    }),
    typicalExperienceYears: numeric("typical_experience_years", {
      precision: 5,
      scale: 2,
      mode: "number",
    }),
    maximumExperienceYears: numeric("maximum_experience_years", {
      precision: 5,
      scale: 2,
      mode: "number",
    }),
    regulated: boolean("regulated").notNull().default(false),
    regulationNotes: text("regulation_notes"),
    taxonomyVersionId: uuid("taxonomy_version_id")
      .notNull()
      .references(() => careerTaxonomyVersionsTable.id, {
        onDelete: "restrict",
      }),
    verificationStatus: taxonomyRecordVerificationStatusEnum(
      "verification_status",
    )
      .notNull()
      .default("draft"),
    isActive: boolean("is_active").notNull().default(true),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("occupations_code_uidx").on(table.code),
    uniqueIndex("occupations_slug_uidx").on(table.slug),
    index("occupations_canonical_title_idx").on(table.canonicalTitle),
    index("occupations_career_family_id_idx").on(table.careerFamilyId),
    index("occupations_career_level_idx").on(table.careerLevel),
    index("occupations_country_code_idx").on(table.countryCode),
    index("occupations_uk_soc_code_idx").on(table.ukSocCode),
    index("occupations_onet_code_idx").on(table.onetCode),
    index("occupations_taxonomy_version_id_idx").on(table.taxonomyVersionId),
    index("occupations_verification_status_idx").on(table.verificationStatus),
    index("occupations_is_active_idx").on(table.isActive),
    index("occupations_active_family_level_idx").on(
      table.isActive,
      table.careerFamilyId,
      table.careerLevel,
    ),
    check("occupations_code_not_blank", sql`btrim(${table.code}) <> ''`),
    check(
      "occupations_canonical_title_not_blank",
      sql`btrim(${table.canonicalTitle}) <> ''`,
    ),
    check("occupations_slug_not_blank", sql`btrim(${table.slug}) <> ''`),
    check("occupations_summary_not_blank", sql`btrim(${table.summary}) <> ''`),
    check(
      "occupations_country_code_length_chk",
      sql`${table.countryCode} is null or char_length(${table.countryCode}) = 2`,
    ),
    check(
      "occupations_minimum_experience_non_negative_chk",
      sql`${table.minimumExperienceYears} is null or ${table.minimumExperienceYears} >= 0`,
    ),
    check(
      "occupations_typical_experience_non_negative_chk",
      sql`${table.typicalExperienceYears} is null or ${table.typicalExperienceYears} >= 0`,
    ),
    check(
      "occupations_maximum_experience_non_negative_chk",
      sql`${table.maximumExperienceYears} is null or ${table.maximumExperienceYears} >= 0`,
    ),
    check(
      "occupations_minimum_typical_order_chk",
      sql`${table.minimumExperienceYears} is null or ${table.typicalExperienceYears} is null or ${table.minimumExperienceYears} <= ${table.typicalExperienceYears}`,
    ),
    check(
      "occupations_typical_maximum_order_chk",
      sql`${table.typicalExperienceYears} is null or ${table.maximumExperienceYears} is null or ${table.typicalExperienceYears} <= ${table.maximumExperienceYears}`,
    ),
    check(
      "occupations_minimum_maximum_order_chk",
      sql`${table.minimumExperienceYears} is null or ${table.maximumExperienceYears} is null or ${table.minimumExperienceYears} <= ${table.maximumExperienceYears}`,
    ),
    check(
      "occupations_effective_range_chk",
      sql`${table.effectiveTo} is null or ${table.effectiveFrom} is null or ${table.effectiveTo} > ${table.effectiveFrom}`,
    ),
  ],
);

export const taxonomySkillsTable = pgTable(
  "taxonomy_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: text("code").notNull(),
    canonicalName: text("canonical_name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull(),
    skillCategory: taxonomySkillCategoryEnum("skill_category").notNull(),
    parentSkillId: uuid("parent_skill_id").references(
      (): AnyPgColumn => taxonomySkillsTable.id,
      { onDelete: "set null" },
    ),
    proficiencyFramework: text("proficiency_framework")
      .notNull()
      .default("cpx_1_5"),
    taxonomyVersionId: uuid("taxonomy_version_id")
      .notNull()
      .references(() => careerTaxonomyVersionsTable.id, {
        onDelete: "restrict",
      }),
    verificationStatus: taxonomyRecordVerificationStatusEnum(
      "verification_status",
    )
      .notNull()
      .default("draft"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("taxonomy_skills_code_uidx").on(table.code),
    uniqueIndex("taxonomy_skills_slug_uidx").on(table.slug),
    index("taxonomy_skills_canonical_name_idx").on(table.canonicalName),
    index("taxonomy_skills_skill_category_idx").on(table.skillCategory),
    index("taxonomy_skills_parent_skill_id_idx").on(table.parentSkillId),
    index("taxonomy_skills_taxonomy_version_id_idx").on(
      table.taxonomyVersionId,
    ),
    index("taxonomy_skills_verification_status_idx").on(
      table.verificationStatus,
    ),
    index("taxonomy_skills_is_active_idx").on(table.isActive),
    check("taxonomy_skills_code_not_blank", sql`btrim(${table.code}) <> ''`),
    check(
      "taxonomy_skills_canonical_name_not_blank",
      sql`btrim(${table.canonicalName}) <> ''`,
    ),
    check("taxonomy_skills_slug_not_blank", sql`btrim(${table.slug}) <> ''`),
    check(
      "taxonomy_skills_description_not_blank",
      sql`btrim(${table.description}) <> ''`,
    ),
    check(
      "taxonomy_skills_proficiency_framework_not_blank",
      sql`btrim(${table.proficiencyFramework}) <> ''`,
    ),
    check(
      "taxonomy_skills_not_own_parent_chk",
      sql`${table.parentSkillId} is null or ${table.parentSkillId} <> ${table.id}`,
    ),
  ],
);

export const occupationAliasesTable = pgTable(
  "occupation_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    occupationId: uuid("occupation_id")
      .notNull()
      .references(() => occupationsTable.id, { onDelete: "restrict" }),
    alias: text("alias").notNull(),
    normalisedAlias: text("normalised_alias").notNull(),
    aliasType: taxonomyAliasTypeEnum("alias_type")
      .notNull()
      .default("alternative_title"),
    countryCode: text("country_code"),
    industryContext: text("industry_context"),
    languageCode: text("language_code").notNull().default("en"),
    sourceName: text("source_name"),
    confidence: numeric("confidence", {
      precision: 5,
      scale: 4,
      mode: "number",
    }),
    taxonomyVersionId: uuid("taxonomy_version_id")
      .notNull()
      .references(() => careerTaxonomyVersionsTable.id, {
        onDelete: "restrict",
      }),
    verificationStatus: taxonomyRecordVerificationStatusEnum(
      "verification_status",
    )
      .notNull()
      .default("draft"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    index("occupation_aliases_occupation_id_idx").on(table.occupationId),
    index("occupation_aliases_normalised_alias_idx").on(table.normalisedAlias),
    index("occupation_aliases_country_code_idx").on(table.countryCode),
    index("occupation_aliases_industry_context_idx").on(table.industryContext),
    index("occupation_aliases_taxonomy_version_id_idx").on(
      table.taxonomyVersionId,
    ),
    index("occupation_aliases_is_active_idx").on(table.isActive),
    uniqueIndex("occupation_aliases_context_uidx").on(
      table.occupationId,
      table.normalisedAlias,
      table.languageCode,
      sql`coalesce(${table.countryCode}, '')`,
      sql`coalesce(${table.industryContext}, '')`,
    ),
    check(
      "occupation_aliases_alias_not_blank",
      sql`btrim(${table.alias}) <> ''`,
    ),
    check(
      "occupation_aliases_normalised_alias_not_blank",
      sql`btrim(${table.normalisedAlias}) <> ''`,
    ),
    check(
      "occupation_aliases_language_code_not_blank",
      sql`btrim(${table.languageCode}) <> ''`,
    ),
    check(
      "occupation_aliases_country_code_length_chk",
      sql`${table.countryCode} is null or char_length(${table.countryCode}) = 2`,
    ),
    check(
      "occupation_aliases_confidence_range_chk",
      sql`${table.confidence} is null or (${table.confidence} >= 0 and ${table.confidence} <= 1)`,
    ),
  ],
);

export const skillAliasesTable = pgTable(
  "skill_aliases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => taxonomySkillsTable.id, { onDelete: "restrict" }),
    alias: text("alias").notNull(),
    normalisedAlias: text("normalised_alias").notNull(),
    languageCode: text("language_code").notNull().default("en"),
    countryCode: text("country_code"),
    industryContext: text("industry_context"),
    sourceName: text("source_name"),
    confidence: numeric("confidence", {
      precision: 5,
      scale: 4,
      mode: "number",
    }),
    taxonomyVersionId: uuid("taxonomy_version_id")
      .notNull()
      .references(() => careerTaxonomyVersionsTable.id, {
        onDelete: "restrict",
      }),
    verificationStatus: taxonomyRecordVerificationStatusEnum(
      "verification_status",
    )
      .notNull()
      .default("draft"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    index("skill_aliases_skill_id_idx").on(table.skillId),
    index("skill_aliases_normalised_alias_idx").on(table.normalisedAlias),
    index("skill_aliases_taxonomy_version_id_idx").on(table.taxonomyVersionId),
    index("skill_aliases_is_active_idx").on(table.isActive),
    uniqueIndex("skill_aliases_context_uidx").on(
      table.skillId,
      table.normalisedAlias,
      table.languageCode,
      sql`coalesce(${table.countryCode}, '')`,
      sql`coalesce(${table.industryContext}, '')`,
    ),
    check("skill_aliases_alias_not_blank", sql`btrim(${table.alias}) <> ''`),
    check(
      "skill_aliases_normalised_alias_not_blank",
      sql`btrim(${table.normalisedAlias}) <> ''`,
    ),
    check(
      "skill_aliases_language_code_not_blank",
      sql`btrim(${table.languageCode}) <> ''`,
    ),
    check(
      "skill_aliases_country_code_length_chk",
      sql`${table.countryCode} is null or char_length(${table.countryCode}) = 2`,
    ),
    check(
      "skill_aliases_confidence_range_chk",
      sql`${table.confidence} is null or (${table.confidence} >= 0 and ${table.confidence} <= 1)`,
    ),
  ],
);

export const skillRelationshipsTable = pgTable(
  "skill_relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sourceSkillId: uuid("source_skill_id")
      .notNull()
      .references(() => taxonomySkillsTable.id, { onDelete: "restrict" }),
    targetSkillId: uuid("target_skill_id")
      .notNull()
      .references(() => taxonomySkillsTable.id, { onDelete: "restrict" }),
    relationshipType: skillRelationshipTypeEnum("relationship_type").notNull(),
    weight: numeric("weight", {
      precision: 5,
      scale: 4,
      mode: "number",
    }),
    description: text("description"),
    taxonomyVersionId: uuid("taxonomy_version_id")
      .notNull()
      .references(() => careerTaxonomyVersionsTable.id, {
        onDelete: "restrict",
      }),
    verificationStatus: taxonomyRecordVerificationStatusEnum(
      "verification_status",
    )
      .notNull()
      .default("draft"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    index("skill_relationships_source_skill_id_idx").on(table.sourceSkillId),
    index("skill_relationships_target_skill_id_idx").on(table.targetSkillId),
    index("skill_relationships_relationship_type_idx").on(
      table.relationshipType,
    ),
    index("skill_relationships_taxonomy_version_id_idx").on(
      table.taxonomyVersionId,
    ),
    index("skill_relationships_source_relationship_idx").on(
      table.sourceSkillId,
      table.relationshipType,
    ),
    uniqueIndex("skill_relationships_context_uidx").on(
      table.sourceSkillId,
      table.targetSkillId,
      table.relationshipType,
      table.taxonomyVersionId,
    ),
    check(
      "skill_relationships_distinct_skills_chk",
      sql`${table.sourceSkillId} <> ${table.targetSkillId}`,
    ),
    check(
      "skill_relationships_weight_range_chk",
      sql`${table.weight} is null or (${table.weight} >= 0 and ${table.weight} <= 1)`,
    ),
  ],
);

export const occupationSkillRequirementsTable = pgTable(
  "occupation_skill_requirements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    occupationId: uuid("occupation_id")
      .notNull()
      .references(() => occupationsTable.id, { onDelete: "restrict" }),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => taxonomySkillsTable.id, { onDelete: "restrict" }),
    requirementType:
      occupationSkillRequirementTypeEnum("requirement_type").notNull(),
    requiredLevel: integer("required_level").notNull(),
    minimumLevel: integer("minimum_level"),
    importanceWeight: numeric("importance_weight", {
      precision: 5,
      scale: 4,
      mode: "number",
    }).notNull(),
    yearsExpected: numeric("years_expected", {
      precision: 5,
      scale: 2,
      mode: "number",
    }),
    evidenceRequired: boolean("evidence_required").notNull().default(true),
    description: text("description"),
    countryCode: text("country_code"),
    industryContext: text("industry_context"),
    taxonomyVersionId: uuid("taxonomy_version_id")
      .notNull()
      .references(() => careerTaxonomyVersionsTable.id, {
        onDelete: "restrict",
      }),
    verificationStatus: taxonomyRecordVerificationStatusEnum(
      "verification_status",
    )
      .notNull()
      .default("draft"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    index("occupation_skill_requirements_occupation_id_idx").on(
      table.occupationId,
    ),
    index("occupation_skill_requirements_skill_id_idx").on(table.skillId),
    index("occupation_skill_requirements_requirement_type_idx").on(
      table.requirementType,
    ),
    index("occupation_skill_requirements_taxonomy_version_id_idx").on(
      table.taxonomyVersionId,
    ),
    index("occupation_skill_requirements_occupation_requirement_idx").on(
      table.occupationId,
      table.requirementType,
    ),
    index("occupation_skill_requirements_occupation_active_idx").on(
      table.occupationId,
      table.isActive,
    ),
    uniqueIndex("occupation_skill_requirements_context_uidx").on(
      table.occupationId,
      table.skillId,
      table.requirementType,
      sql`coalesce(${table.countryCode}, '')`,
      sql`coalesce(${table.industryContext}, '')`,
      table.taxonomyVersionId,
    ),
    check(
      "occupation_skill_requirements_required_level_range_chk",
      sql`${table.requiredLevel} between 1 and 5`,
    ),
    check(
      "occupation_skill_requirements_minimum_level_range_chk",
      sql`${table.minimumLevel} is null or ${table.minimumLevel} between 1 and 5`,
    ),
    check(
      "occupation_skill_requirements_minimum_required_order_chk",
      sql`${table.minimumLevel} is null or ${table.minimumLevel} <= ${table.requiredLevel}`,
    ),
    check(
      "occupation_skill_requirements_importance_weight_range_chk",
      sql`${table.importanceWeight} > 0 and ${table.importanceWeight} <= 1`,
    ),
    check(
      "occupation_skill_requirements_years_expected_non_negative_chk",
      sql`${table.yearsExpected} is null or ${table.yearsExpected} >= 0`,
    ),
    check(
      "occupation_skill_requirements_country_code_length_chk",
      sql`${table.countryCode} is null or char_length(${table.countryCode}) = 2`,
    ),
  ],
);

export const careerTransitionsTable = pgTable(
  "career_transitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fromOccupationId: uuid("from_occupation_id")
      .notNull()
      .references(() => occupationsTable.id, { onDelete: "restrict" }),
    toOccupationId: uuid("to_occupation_id")
      .notNull()
      .references(() => occupationsTable.id, { onDelete: "restrict" }),
    transitionType: careerTransitionTypeEnum("transition_type").notNull(),
    difficultyScore: integer("difficulty_score").notNull(),
    transferabilityScore: numeric("transferability_score", {
      precision: 5,
      scale: 4,
      mode: "number",
    }),
    minimumReadinessScore: numeric("minimum_readiness_score", {
      precision: 5,
      scale: 2,
      mode: "number",
    }),
    typicalDurationMonths: integer("typical_duration_months"),
    minimumDurationMonths: integer("minimum_duration_months"),
    maximumDurationMonths: integer("maximum_duration_months"),
    description: text("description"),
    rationale: text("rationale"),
    countryCode: text("country_code"),
    industryContext: text("industry_context"),
    taxonomyVersionId: uuid("taxonomy_version_id")
      .notNull()
      .references(() => careerTaxonomyVersionsTable.id, {
        onDelete: "restrict",
      }),
    verificationStatus: taxonomyRecordVerificationStatusEnum(
      "verification_status",
    )
      .notNull()
      .default("draft"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps(),
  },
  (table) => [
    index("career_transitions_from_occupation_id_idx").on(
      table.fromOccupationId,
    ),
    index("career_transitions_to_occupation_id_idx").on(table.toOccupationId),
    index("career_transitions_transition_type_idx").on(table.transitionType),
    index("career_transitions_taxonomy_version_id_idx").on(
      table.taxonomyVersionId,
    ),
    index("career_transitions_from_active_idx").on(
      table.fromOccupationId,
      table.isActive,
    ),
    index("career_transitions_to_active_idx").on(
      table.toOccupationId,
      table.isActive,
    ),
    uniqueIndex("career_transitions_context_uidx").on(
      table.fromOccupationId,
      table.toOccupationId,
      table.transitionType,
      sql`coalesce(${table.countryCode}, '')`,
      sql`coalesce(${table.industryContext}, '')`,
      table.taxonomyVersionId,
    ),
    check(
      "career_transitions_distinct_occupations_chk",
      sql`${table.fromOccupationId} <> ${table.toOccupationId}`,
    ),
    check(
      "career_transitions_difficulty_score_range_chk",
      sql`${table.difficultyScore} between 1 and 5`,
    ),
    check(
      "career_transitions_transferability_score_range_chk",
      sql`${table.transferabilityScore} is null or (${table.transferabilityScore} >= 0 and ${table.transferabilityScore} <= 1)`,
    ),
    check(
      "career_transitions_minimum_readiness_score_range_chk",
      sql`${table.minimumReadinessScore} is null or (${table.minimumReadinessScore} >= 0 and ${table.minimumReadinessScore} <= 100)`,
    ),
    check(
      "career_transitions_typical_duration_non_negative_chk",
      sql`${table.typicalDurationMonths} is null or ${table.typicalDurationMonths} >= 0`,
    ),
    check(
      "career_transitions_minimum_duration_non_negative_chk",
      sql`${table.minimumDurationMonths} is null or ${table.minimumDurationMonths} >= 0`,
    ),
    check(
      "career_transitions_maximum_duration_non_negative_chk",
      sql`${table.maximumDurationMonths} is null or ${table.maximumDurationMonths} >= 0`,
    ),
    check(
      "career_transitions_minimum_typical_duration_order_chk",
      sql`${table.minimumDurationMonths} is null or ${table.typicalDurationMonths} is null or ${table.minimumDurationMonths} <= ${table.typicalDurationMonths}`,
    ),
    check(
      "career_transitions_typical_maximum_duration_order_chk",
      sql`${table.typicalDurationMonths} is null or ${table.maximumDurationMonths} is null or ${table.typicalDurationMonths} <= ${table.maximumDurationMonths}`,
    ),
    check(
      "career_transitions_minimum_maximum_duration_order_chk",
      sql`${table.minimumDurationMonths} is null or ${table.maximumDurationMonths} is null or ${table.minimumDurationMonths} <= ${table.maximumDurationMonths}`,
    ),
    check(
      "career_transitions_country_code_length_chk",
      sql`${table.countryCode} is null or char_length(${table.countryCode}) = 2`,
    ),
  ],
);

export const taxonomySourceReferencesTable = pgTable(
  "taxonomy_source_references",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    sourceType: provenanceSourceTypeEnum("source_type").notNull(),
    sourceName: text("source_name").notNull(),
    sourceRecordId: text("source_record_id"),
    sourceUrl: text("source_url"),
    sourceVersion: text("source_version"),
    licenceName: text("licence_name"),
    licenceUrl: text("licence_url"),
    retrievedAt: timestamp("retrieved_at", { withTimezone: true }),
    notes: text("notes"),
    ...timestamps(),
  },
  (table) => [
    index("taxonomy_source_references_entity_idx").on(
      table.entityType,
      table.entityId,
    ),
    index("taxonomy_source_references_source_type_idx").on(table.sourceType),
    uniqueIndex("taxonomy_source_references_source_record_uidx").on(
      table.entityType,
      table.entityId,
      table.sourceType,
      table.sourceName,
      sql`coalesce(${table.sourceRecordId}, '')`,
      sql`coalesce(${table.sourceUrl}, '')`,
    ),
    check(
      "taxonomy_source_references_entity_type_not_blank",
      sql`btrim(${table.entityType}) <> ''`,
    ),
    check(
      "taxonomy_source_references_source_name_not_blank",
      sql`btrim(${table.sourceName}) <> ''`,
    ),
  ],
);

export const careerTaxonomyVersionsRelations = relations(
  careerTaxonomyVersionsTable,
  ({ many }) => ({
    careerFamilies: many(careerFamiliesTable),
    occupations: many(occupationsTable),
    taxonomySkills: many(taxonomySkillsTable),
    occupationAliases: many(occupationAliasesTable),
    skillAliases: many(skillAliasesTable),
    skillRelationships: many(skillRelationshipsTable),
    occupationSkillRequirements: many(occupationSkillRequirementsTable),
    careerTransitions: many(careerTransitionsTable),
  }),
);

export const careerFamiliesRelations = relations(
  careerFamiliesTable,
  ({ one, many }) => ({
    taxonomyVersion: one(careerTaxonomyVersionsTable, {
      fields: [careerFamiliesTable.taxonomyVersionId],
      references: [careerTaxonomyVersionsTable.id],
    }),
    parentFamily: one(careerFamiliesTable, {
      fields: [careerFamiliesTable.parentFamilyId],
      references: [careerFamiliesTable.id],
      relationName: "careerFamilyHierarchy",
    }),
    childFamilies: many(careerFamiliesTable, {
      relationName: "careerFamilyHierarchy",
    }),
    occupations: many(occupationsTable),
  }),
);

export const occupationsRelations = relations(
  occupationsTable,
  ({ one, many }) => ({
    careerFamily: one(careerFamiliesTable, {
      fields: [occupationsTable.careerFamilyId],
      references: [careerFamiliesTable.id],
    }),
    taxonomyVersion: one(careerTaxonomyVersionsTable, {
      fields: [occupationsTable.taxonomyVersionId],
      references: [careerTaxonomyVersionsTable.id],
    }),
    aliases: many(occupationAliasesTable),
    skillRequirements: many(occupationSkillRequirementsTable),
    outgoingTransitions: many(careerTransitionsTable, {
      relationName: "outgoingCareerTransitions",
    }),
    incomingTransitions: many(careerTransitionsTable, {
      relationName: "incomingCareerTransitions",
    }),
  }),
);

export const taxonomySkillsRelations = relations(
  taxonomySkillsTable,
  ({ one, many }) => ({
    taxonomyVersion: one(careerTaxonomyVersionsTable, {
      fields: [taxonomySkillsTable.taxonomyVersionId],
      references: [careerTaxonomyVersionsTable.id],
    }),
    parentSkill: one(taxonomySkillsTable, {
      fields: [taxonomySkillsTable.parentSkillId],
      references: [taxonomySkillsTable.id],
      relationName: "taxonomySkillHierarchy",
    }),
    childSkills: many(taxonomySkillsTable, {
      relationName: "taxonomySkillHierarchy",
    }),
    aliases: many(skillAliasesTable),
    occupationRequirements: many(occupationSkillRequirementsTable),
    outgoingRelationships: many(skillRelationshipsTable, {
      relationName: "outgoingSkillRelationships",
    }),
    incomingRelationships: many(skillRelationshipsTable, {
      relationName: "incomingSkillRelationships",
    }),
  }),
);

export const occupationAliasesRelations = relations(
  occupationAliasesTable,
  ({ one }) => ({
    occupation: one(occupationsTable, {
      fields: [occupationAliasesTable.occupationId],
      references: [occupationsTable.id],
    }),
    taxonomyVersion: one(careerTaxonomyVersionsTable, {
      fields: [occupationAliasesTable.taxonomyVersionId],
      references: [careerTaxonomyVersionsTable.id],
    }),
  }),
);

export const skillAliasesRelations = relations(
  skillAliasesTable,
  ({ one }) => ({
    skill: one(taxonomySkillsTable, {
      fields: [skillAliasesTable.skillId],
      references: [taxonomySkillsTable.id],
    }),
    taxonomyVersion: one(careerTaxonomyVersionsTable, {
      fields: [skillAliasesTable.taxonomyVersionId],
      references: [careerTaxonomyVersionsTable.id],
    }),
  }),
);

export const skillRelationshipsRelations = relations(
  skillRelationshipsTable,
  ({ one }) => ({
    sourceSkill: one(taxonomySkillsTable, {
      fields: [skillRelationshipsTable.sourceSkillId],
      references: [taxonomySkillsTable.id],
      relationName: "outgoingSkillRelationships",
    }),
    targetSkill: one(taxonomySkillsTable, {
      fields: [skillRelationshipsTable.targetSkillId],
      references: [taxonomySkillsTable.id],
      relationName: "incomingSkillRelationships",
    }),
    taxonomyVersion: one(careerTaxonomyVersionsTable, {
      fields: [skillRelationshipsTable.taxonomyVersionId],
      references: [careerTaxonomyVersionsTable.id],
    }),
  }),
);

export const occupationSkillRequirementsRelations = relations(
  occupationSkillRequirementsTable,
  ({ one }) => ({
    occupation: one(occupationsTable, {
      fields: [occupationSkillRequirementsTable.occupationId],
      references: [occupationsTable.id],
    }),
    skill: one(taxonomySkillsTable, {
      fields: [occupationSkillRequirementsTable.skillId],
      references: [taxonomySkillsTable.id],
    }),
    taxonomyVersion: one(careerTaxonomyVersionsTable, {
      fields: [occupationSkillRequirementsTable.taxonomyVersionId],
      references: [careerTaxonomyVersionsTable.id],
    }),
  }),
);

export const careerTransitionsRelations = relations(
  careerTransitionsTable,
  ({ one }) => ({
    fromOccupation: one(occupationsTable, {
      fields: [careerTransitionsTable.fromOccupationId],
      references: [occupationsTable.id],
      relationName: "outgoingCareerTransitions",
    }),
    toOccupation: one(occupationsTable, {
      fields: [careerTransitionsTable.toOccupationId],
      references: [occupationsTable.id],
      relationName: "incomingCareerTransitions",
    }),
    taxonomyVersion: one(careerTaxonomyVersionsTable, {
      fields: [careerTransitionsTable.taxonomyVersionId],
      references: [careerTaxonomyVersionsTable.id],
    }),
  }),
);

export const selectCareerTaxonomyVersionSchema = createSelectSchema(
  careerTaxonomyVersionsTable,
);
export const insertCareerTaxonomyVersionSchema = createInsertSchema(
  careerTaxonomyVersionsTable,
  {
    version: () => nonEmptyText("Version is required"),
    name: () => nonEmptyText("Name is required"),
  },
)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .refine(
    (value) =>
      !value.effectiveFrom ||
      !value.effectiveTo ||
      value.effectiveTo > value.effectiveFrom,
    {
      message: "effectiveTo must be later than effectiveFrom",
      path: ["effectiveTo"],
    },
  );

export const selectCareerFamilySchema = createSelectSchema(careerFamiliesTable);
export const insertCareerFamilySchema = createInsertSchema(
  careerFamiliesTable,
  {
    code: () => nonEmptyText("Code is required"),
    name: () => nonEmptyText("Name is required"),
    slug: () => nonEmptyText("Slug is required"),
    displayOrder: (schema) => schema.int().min(0),
  },
).omit({ id: true, createdAt: true, updatedAt: true });

export const selectOccupationSchema = createSelectSchema(occupationsTable);
export const insertOccupationSchema = createInsertSchema(occupationsTable, {
  code: () => nonEmptyText("Code is required"),
  canonicalTitle: () => nonEmptyText("Canonical title is required"),
  slug: () => nonEmptyText("Slug is required"),
  summary: () => nonEmptyText("Summary is required"),
  countryCode: nullableCountryCode,
  minimumExperienceYears: nonNegativeNumeric,
  typicalExperienceYears: nonNegativeNumeric,
  maximumExperienceYears: nonNegativeNumeric,
})
  .omit({ id: true, createdAt: true, updatedAt: true })
  .refine(
    (value) =>
      value.minimumExperienceYears == null ||
      value.typicalExperienceYears == null ||
      value.minimumExperienceYears <= value.typicalExperienceYears,
    {
      message: "minimumExperienceYears cannot exceed typicalExperienceYears",
      path: ["typicalExperienceYears"],
    },
  )
  .refine(
    (value) =>
      value.typicalExperienceYears == null ||
      value.maximumExperienceYears == null ||
      value.typicalExperienceYears <= value.maximumExperienceYears,
    {
      message: "typicalExperienceYears cannot exceed maximumExperienceYears",
      path: ["maximumExperienceYears"],
    },
  )
  .refine(
    (value) =>
      value.minimumExperienceYears == null ||
      value.maximumExperienceYears == null ||
      value.minimumExperienceYears <= value.maximumExperienceYears,
    {
      message: "minimumExperienceYears cannot exceed maximumExperienceYears",
      path: ["maximumExperienceYears"],
    },
  )
  .refine(
    (value) =>
      !value.effectiveFrom ||
      !value.effectiveTo ||
      value.effectiveTo > value.effectiveFrom,
    {
      message: "effectiveTo must be later than effectiveFrom",
      path: ["effectiveTo"],
    },
  );

export const selectTaxonomySkillSchema =
  createSelectSchema(taxonomySkillsTable);
export const insertTaxonomySkillSchema = createInsertSchema(
  taxonomySkillsTable,
  {
    code: () => nonEmptyText("Code is required"),
    canonicalName: () => nonEmptyText("Canonical name is required"),
    slug: () => nonEmptyText("Slug is required"),
    description: () => nonEmptyText("Description is required"),
    proficiencyFramework: (schema) => schema.trim().min(1),
  },
).omit({ id: true, createdAt: true, updatedAt: true });

export const selectOccupationAliasSchema = createSelectSchema(
  occupationAliasesTable,
);
export const insertOccupationAliasSchema = createInsertSchema(
  occupationAliasesTable,
  {
    alias: () => nonEmptyText("Alias is required"),
    normalisedAlias: () => nonEmptyText("Normalised alias is required"),
    languageCode: (schema) => schema.trim().min(1),
    countryCode: nullableCountryCode,
    confidence: nullableConfidence,
  },
).omit({ id: true, createdAt: true, updatedAt: true });

export const selectSkillAliasSchema = createSelectSchema(skillAliasesTable);
export const insertSkillAliasSchema = createInsertSchema(skillAliasesTable, {
  alias: () => nonEmptyText("Alias is required"),
  normalisedAlias: () => nonEmptyText("Normalised alias is required"),
  languageCode: (schema) => schema.trim().min(1),
  countryCode: nullableCountryCode,
  confidence: nullableConfidence,
}).omit({ id: true, createdAt: true, updatedAt: true });

export const selectSkillRelationshipSchema = createSelectSchema(
  skillRelationshipsTable,
);
export const insertSkillRelationshipSchema = createInsertSchema(
  skillRelationshipsTable,
  {
    weight: nullableConfidence,
  },
)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .refine((value) => value.sourceSkillId !== value.targetSkillId, {
    message: "sourceSkillId and targetSkillId must differ",
    path: ["targetSkillId"],
  });

export const selectOccupationSkillRequirementSchema = createSelectSchema(
  occupationSkillRequirementsTable,
);
export const insertOccupationSkillRequirementSchema = createInsertSchema(
  occupationSkillRequirementsTable,
  {
    requiredLevel: oneToFiveLevel,
    minimumLevel: oneToFiveLevel,
    importanceWeight: (schema) => schema.gt(0).max(1),
    yearsExpected: nonNegativeNumeric,
    countryCode: nullableCountryCode,
  },
)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .refine(
    (value) =>
      value.minimumLevel == null || value.minimumLevel <= value.requiredLevel,
    {
      message: "minimumLevel cannot exceed requiredLevel",
      path: ["minimumLevel"],
    },
  );

export const selectCareerTransitionSchema = createSelectSchema(
  careerTransitionsTable,
);
export const insertCareerTransitionSchema = createInsertSchema(
  careerTransitionsTable,
  {
    difficultyScore: oneToFiveLevel,
    transferabilityScore: nullableConfidence,
    minimumReadinessScore: (schema) => schema.min(0).max(100),
    typicalDurationMonths: (schema) => schema.int().min(0),
    minimumDurationMonths: (schema) => schema.int().min(0),
    maximumDurationMonths: (schema) => schema.int().min(0),
    countryCode: nullableCountryCode,
  },
)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .refine((value) => value.fromOccupationId !== value.toOccupationId, {
    message: "fromOccupationId and toOccupationId must differ",
    path: ["toOccupationId"],
  })
  .refine(
    (value) =>
      value.minimumDurationMonths == null ||
      value.typicalDurationMonths == null ||
      value.minimumDurationMonths <= value.typicalDurationMonths,
    {
      message: "minimumDurationMonths cannot exceed typicalDurationMonths",
      path: ["typicalDurationMonths"],
    },
  )
  .refine(
    (value) =>
      value.typicalDurationMonths == null ||
      value.maximumDurationMonths == null ||
      value.typicalDurationMonths <= value.maximumDurationMonths,
    {
      message: "typicalDurationMonths cannot exceed maximumDurationMonths",
      path: ["maximumDurationMonths"],
    },
  )
  .refine(
    (value) =>
      value.minimumDurationMonths == null ||
      value.maximumDurationMonths == null ||
      value.minimumDurationMonths <= value.maximumDurationMonths,
    {
      message: "minimumDurationMonths cannot exceed maximumDurationMonths",
      path: ["maximumDurationMonths"],
    },
  );

export const selectTaxonomySourceReferenceSchema = createSelectSchema(
  taxonomySourceReferencesTable,
);
export const insertTaxonomySourceReferenceSchema = createInsertSchema(
  taxonomySourceReferencesTable,
  {
    entityType: () => nonEmptyText("Entity type is required"),
    sourceName: () => nonEmptyText("Source name is required"),
  },
).omit({ id: true, createdAt: true, updatedAt: true });

export type CareerTaxonomyVersion =
  typeof careerTaxonomyVersionsTable.$inferSelect;
export type NewCareerTaxonomyVersion =
  typeof careerTaxonomyVersionsTable.$inferInsert;
export type CareerFamily = typeof careerFamiliesTable.$inferSelect;
export type NewCareerFamily = typeof careerFamiliesTable.$inferInsert;
export type Occupation = typeof occupationsTable.$inferSelect;
export type NewOccupation = typeof occupationsTable.$inferInsert;
export type TaxonomySkill = typeof taxonomySkillsTable.$inferSelect;
export type NewTaxonomySkill = typeof taxonomySkillsTable.$inferInsert;
export type OccupationAlias = typeof occupationAliasesTable.$inferSelect;
export type NewOccupationAlias = typeof occupationAliasesTable.$inferInsert;
export type SkillAlias = typeof skillAliasesTable.$inferSelect;
export type NewSkillAlias = typeof skillAliasesTable.$inferInsert;
export type SkillRelationship = typeof skillRelationshipsTable.$inferSelect;
export type NewSkillRelationship = typeof skillRelationshipsTable.$inferInsert;
export type OccupationSkillRequirement =
  typeof occupationSkillRequirementsTable.$inferSelect;
export type NewOccupationSkillRequirement =
  typeof occupationSkillRequirementsTable.$inferInsert;
export type CareerTransition = typeof careerTransitionsTable.$inferSelect;
export type NewCareerTransition = typeof careerTransitionsTable.$inferInsert;
export type TaxonomySourceReference =
  typeof taxonomySourceReferencesTable.$inferSelect;
export type NewTaxonomySourceReference =
  typeof taxonomySourceReferencesTable.$inferInsert;
