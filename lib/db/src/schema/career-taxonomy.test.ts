import { getTableName } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  careerLevelEnum,
  careerTransitionTypeEnum,
  careerTransitionsTable,
  careerFamiliesTable,
  careerTaxonomyVersionsTable,
  insertCareerTransitionSchema,
  insertOccupationAliasSchema,
  insertOccupationSchema,
  insertOccupationSkillRequirementSchema,
  insertSkillRelationshipSchema,
  insertTaxonomySkillSchema,
  occupationAliasesTable,
  occupationSkillRequirementTypeEnum,
  occupationSkillRequirementsTable,
  occupationsTable,
  provenanceSourceTypeEnum,
  skillAliasesTable,
  skillRelationshipTypeEnum,
  skillRelationshipsTable,
  skillsTable,
  taxonomyAliasTypeEnum,
  taxonomyRecordVerificationStatusEnum,
  taxonomySkillCategoryEnum,
  taxonomySkillsTable,
  taxonomySourceReferencesTable,
  taxonomyVersionStatusEnum,
  type NewOccupation,
  type NewTaxonomySkill,
} from "./index";

const taxonomyVersionId = "11111111-1111-4111-8111-111111111111";
const careerFamilyId = "22222222-2222-4222-8222-222222222222";
const occupationId = "33333333-3333-4333-8333-333333333333";
const targetOccupationId = "44444444-4444-4444-8444-444444444444";
const skillId = "55555555-5555-4555-8555-555555555555";
const targetSkillId = "66666666-6666-4666-8666-666666666666";

const validOccupation: NewOccupation = {
  code: "CPX-OCC-PMI-000001",
  canonicalTitle: "Senior Project Manager",
  slug: "senior-project-manager",
  summary: "Leads complex delivery programmes.",
  careerFamilyId,
  careerLevel: "senior_manager",
  taxonomyVersionId,
};

const validTaxonomySkill: NewTaxonomySkill = {
  code: "CPX-SKL-TECH-000001",
  canonicalName: "Project Controls",
  slug: "project-controls",
  description: "Plans, monitors, and controls complex delivery work.",
  skillCategory: "project_delivery",
  taxonomyVersionId,
};

describe("career taxonomy schema", () => {
  it("exports taxonomy tables without replacing member skills", () => {
    expect(getTableName(careerTaxonomyVersionsTable)).toBe(
      "career_taxonomy_versions",
    );
    expect(getTableName(careerFamiliesTable)).toBe("career_families");
    expect(getTableName(occupationsTable)).toBe("occupations");
    expect(getTableName(occupationAliasesTable)).toBe("occupation_aliases");
    expect(getTableName(taxonomySkillsTable)).toBe("taxonomy_skills");
    expect(getTableName(skillAliasesTable)).toBe("skill_aliases");
    expect(getTableName(skillRelationshipsTable)).toBe("skill_relationships");
    expect(getTableName(occupationSkillRequirementsTable)).toBe(
      "occupation_skill_requirements",
    );
    expect(getTableName(careerTransitionsTable)).toBe("career_transitions");
    expect(getTableName(taxonomySourceReferencesTable)).toBe(
      "taxonomy_source_references",
    );
    expect(getTableName(skillsTable)).toBe("skills");
  });

  it("exports required enum values", () => {
    expect(taxonomyVersionStatusEnum.enumValues).toEqual([
      "draft",
      "review",
      "published",
      "retired",
    ]);
    expect(taxonomyRecordVerificationStatusEnum.enumValues).toContain(
      "employer_validated",
    );
    expect(careerLevelEnum.enumValues).toContain("senior_specialist");
    expect(taxonomySkillCategoryEnum.enumValues).toContain("regulatory");
    expect(skillRelationshipTypeEnum.enumValues).toContain(
      "commonly_used_with",
    );
    expect(occupationSkillRequirementTypeEnum.enumValues).toContain(
      "leadership_stage",
    );
    expect(careerTransitionTypeEnum.enumValues).toContain("entrepreneurship");
    expect(taxonomyAliasTypeEnum.enumValues).toContain("legacy_title");
    expect(provenanceSourceTypeEnum.enumValues).toContain("professional_body");
  });

  it("rejects invalid occupation ranges and blank titles", () => {
    expect(
      insertOccupationSchema.safeParse({
        ...validOccupation,
        canonicalTitle: "   ",
      }).success,
    ).toBe(false);
    expect(
      insertOccupationSchema.safeParse({
        ...validOccupation,
        minimumExperienceYears: -1,
      }).success,
    ).toBe(false);
    expect(
      insertOccupationSchema.safeParse({
        ...validOccupation,
        minimumExperienceYears: 5,
        typicalExperienceYears: 3,
      }).success,
    ).toBe(false);
    expect(
      insertOccupationSchema.safeParse({
        ...validOccupation,
        countryCode: "GBR",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid alias confidence and skill hierarchy values", () => {
    expect(
      insertTaxonomySkillSchema.safeParse(validTaxonomySkill).success,
    ).toBe(true);
    expect(
      insertOccupationAliasSchema.safeParse({
        occupationId,
        alias: "T&D Delivery Manager",
        normalisedAlias: "t&d delivery manager",
        confidence: 1.5,
        taxonomyVersionId,
      }).success,
    ).toBe(false);
  });

  it("rejects self-referencing skill relationships", () => {
    expect(
      insertSkillRelationshipSchema.safeParse({
        sourceSkillId: skillId,
        targetSkillId: skillId,
        relationshipType: "prerequisite_of",
        taxonomyVersionId,
      }).success,
    ).toBe(false);
    expect(
      insertSkillRelationshipSchema.safeParse({
        sourceSkillId: skillId,
        targetSkillId,
        relationshipType: "prerequisite_of",
        taxonomyVersionId,
      }).success,
    ).toBe(true);
  });

  it("rejects invalid role requirements and transitions", () => {
    expect(
      insertOccupationSkillRequirementSchema.safeParse({
        occupationId,
        skillId,
        requirementType: "essential",
        requiredLevel: 6,
        importanceWeight: 0.8,
        taxonomyVersionId,
      }).success,
    ).toBe(false);
    expect(
      insertOccupationSkillRequirementSchema.safeParse({
        occupationId,
        skillId,
        requirementType: "essential",
        requiredLevel: 3,
        minimumLevel: 4,
        importanceWeight: 0.8,
        taxonomyVersionId,
      }).success,
    ).toBe(false);
    expect(
      insertCareerTransitionSchema.safeParse({
        fromOccupationId: occupationId,
        toOccupationId: occupationId,
        transitionType: "promotion",
        difficultyScore: 3,
        taxonomyVersionId,
      }).success,
    ).toBe(false);
    expect(
      insertCareerTransitionSchema.safeParse({
        fromOccupationId: occupationId,
        toOccupationId: targetOccupationId,
        transitionType: "promotion",
        difficultyScore: 3,
        minimumReadinessScore: 101,
        taxonomyVersionId,
      }).success,
    ).toBe(false);
    expect(
      insertCareerTransitionSchema.safeParse({
        fromOccupationId: occupationId,
        toOccupationId: targetOccupationId,
        transitionType: "promotion",
        difficultyScore: 3,
        minimumDurationMonths: 12,
        typicalDurationMonths: 6,
        taxonomyVersionId,
      }).success,
    ).toBe(false);
  });
});
