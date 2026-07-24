import { eq } from "drizzle-orm";
import {
  careerFamiliesTable,
  careerTaxonomyVersionsTable,
  careerTransitionsTable,
  db,
  occupationAliasesTable,
  occupationSkillRequirementsTable,
  occupationsTable,
  pool,
  skillAliasesTable,
  skillRelationshipsTable,
  taxonomySkillsTable,
  taxonomySourceReferencesTable,
} from "@workspace/db";

function first<T>(rows: T[], label: string): T {
  const row = rows[0];
  if (!row) throw new Error(`Expected ${label} to return one row`);
  return row;
}

const suffix = Date.now().toString(36);

let taxonomyVersionId: string | undefined;
let careerFamilyId: string | undefined;
let fromOccupationId: string | undefined;
let toOccupationId: string | undefined;
let sourceSkillId: string | undefined;
let targetSkillId: string | undefined;
let occupationAliasId: string | undefined;
let skillAliasId: string | undefined;
let occupationRequirementId: string | undefined;
let skillRelationshipId: string | undefined;
let careerTransitionId: string | undefined;
let sourceReferenceId: string | undefined;

try {
  const taxonomyVersion = first(
    await db
      .insert(careerTaxonomyVersionsTable)
      .values({
        version: `verify-${suffix}`,
        name: "Career taxonomy verification",
        status: "draft",
      })
      .returning(),
    "taxonomy version insert",
  );
  taxonomyVersionId = taxonomyVersion.id;

  const family = first(
    await db
      .insert(careerFamiliesTable)
      .values({
        code: `CPX-FAM-VERIFY-${suffix}`,
        name: "Verification Family",
        slug: `verification-family-${suffix}`,
        taxonomyVersionId,
      })
      .returning(),
    "career family insert",
  );
  careerFamilyId = family.id;

  const fromOccupation = first(
    await db
      .insert(occupationsTable)
      .values({
        code: `CPX-OCC-VERIFY-FROM-${suffix}`,
        canonicalTitle: "Verification Project Manager",
        slug: `verification-project-manager-${suffix}`,
        summary: "Temporary occupation used by the taxonomy verifier.",
        careerFamilyId,
        careerLevel: "manager",
        taxonomyVersionId,
      })
      .returning(),
    "source occupation insert",
  );
  fromOccupationId = fromOccupation.id;

  const toOccupation = first(
    await db
      .insert(occupationsTable)
      .values({
        code: `CPX-OCC-VERIFY-TO-${suffix}`,
        canonicalTitle: "Verification Programme Lead",
        slug: `verification-programme-lead-${suffix}`,
        summary: "Temporary target occupation used by the taxonomy verifier.",
        careerFamilyId,
        careerLevel: "senior_manager",
        taxonomyVersionId,
      })
      .returning(),
    "target occupation insert",
  );
  toOccupationId = toOccupation.id;

  const sourceSkill = first(
    await db
      .insert(taxonomySkillsTable)
      .values({
        code: `CPX-SKL-VERIFY-SRC-${suffix}`,
        canonicalName: "Verification Delivery Planning",
        slug: `verification-delivery-planning-${suffix}`,
        description: "Temporary skill used by the taxonomy verifier.",
        skillCategory: "project_delivery",
        taxonomyVersionId,
      })
      .returning(),
    "source skill insert",
  );
  sourceSkillId = sourceSkill.id;

  const targetSkill = first(
    await db
      .insert(taxonomySkillsTable)
      .values({
        code: `CPX-SKL-VERIFY-TGT-${suffix}`,
        canonicalName: "Verification Stakeholder Governance",
        slug: `verification-stakeholder-governance-${suffix}`,
        description: "Temporary related skill used by the taxonomy verifier.",
        skillCategory: "leadership",
        taxonomyVersionId,
      })
      .returning(),
    "target skill insert",
  );
  targetSkillId = targetSkill.id;

  const occupationAlias = first(
    await db
      .insert(occupationAliasesTable)
      .values({
        occupationId: fromOccupationId,
        alias: "Verification PM",
        normalisedAlias: "verification pm",
        aliasType: "abbreviation",
        confidence: 0.9,
        taxonomyVersionId,
      })
      .returning(),
    "occupation alias insert",
  );
  occupationAliasId = occupationAlias.id;

  const skillAlias = first(
    await db
      .insert(skillAliasesTable)
      .values({
        skillId: sourceSkillId,
        alias: "Delivery planning verification",
        normalisedAlias: "delivery planning verification",
        confidence: 0.9,
        taxonomyVersionId,
      })
      .returning(),
    "skill alias insert",
  );
  skillAliasId = skillAlias.id;

  const occupationRequirement = first(
    await db
      .insert(occupationSkillRequirementsTable)
      .values({
        occupationId: fromOccupationId,
        skillId: sourceSkillId,
        requirementType: "essential",
        requiredLevel: 3,
        minimumLevel: 2,
        importanceWeight: 0.8,
        taxonomyVersionId,
      })
      .returning(),
    "occupation skill requirement insert",
  );
  occupationRequirementId = occupationRequirement.id;

  const skillRelationship = first(
    await db
      .insert(skillRelationshipsTable)
      .values({
        sourceSkillId,
        targetSkillId,
        relationshipType: "commonly_used_with",
        weight: 0.6,
        taxonomyVersionId,
      })
      .returning(),
    "skill relationship insert",
  );
  skillRelationshipId = skillRelationship.id;

  const careerTransition = first(
    await db
      .insert(careerTransitionsTable)
      .values({
        fromOccupationId,
        toOccupationId,
        transitionType: "promotion",
        difficultyScore: 3,
        transferabilityScore: 0.75,
        minimumReadinessScore: 60,
        typicalDurationMonths: 12,
        taxonomyVersionId,
      })
      .returning(),
    "career transition insert",
  );
  careerTransitionId = careerTransition.id;

  const sourceReference = first(
    await db
      .insert(taxonomySourceReferencesTable)
      .values({
        entityType: "occupation",
        entityId: fromOccupationId,
        sourceType: "internal",
        sourceName: "CareerPathX verification script",
        sourceRecordId: `verify-${suffix}`,
      })
      .returning(),
    "source reference insert",
  );
  sourceReferenceId = sourceReference.id;

  const readBack = await Promise.all([
    db
      .select()
      .from(careerTaxonomyVersionsTable)
      .where(eq(careerTaxonomyVersionsTable.id, taxonomyVersionId)),
    db
      .select()
      .from(occupationsTable)
      .where(eq(occupationsTable.id, fromOccupationId)),
    db
      .select()
      .from(taxonomySkillsTable)
      .where(eq(taxonomySkillsTable.id, sourceSkillId)),
    db
      .select()
      .from(careerTransitionsTable)
      .where(eq(careerTransitionsTable.id, careerTransitionId)),
  ]);

  if (readBack.some((rows) => rows.length !== 1)) {
    throw new Error("Verification read-back failed");
  }

  console.log("Career taxonomy verification succeeded.");
} finally {
  if (sourceReferenceId) {
    await db
      .delete(taxonomySourceReferencesTable)
      .where(eq(taxonomySourceReferencesTable.id, sourceReferenceId));
  }
  if (careerTransitionId) {
    await db
      .delete(careerTransitionsTable)
      .where(eq(careerTransitionsTable.id, careerTransitionId));
  }
  if (skillRelationshipId) {
    await db
      .delete(skillRelationshipsTable)
      .where(eq(skillRelationshipsTable.id, skillRelationshipId));
  }
  if (occupationRequirementId) {
    await db
      .delete(occupationSkillRequirementsTable)
      .where(eq(occupationSkillRequirementsTable.id, occupationRequirementId));
  }
  if (skillAliasId) {
    await db
      .delete(skillAliasesTable)
      .where(eq(skillAliasesTable.id, skillAliasId));
  }
  if (occupationAliasId) {
    await db
      .delete(occupationAliasesTable)
      .where(eq(occupationAliasesTable.id, occupationAliasId));
  }
  if (targetSkillId) {
    await db
      .delete(taxonomySkillsTable)
      .where(eq(taxonomySkillsTable.id, targetSkillId));
  }
  if (sourceSkillId) {
    await db
      .delete(taxonomySkillsTable)
      .where(eq(taxonomySkillsTable.id, sourceSkillId));
  }
  if (toOccupationId) {
    await db
      .delete(occupationsTable)
      .where(eq(occupationsTable.id, toOccupationId));
  }
  if (fromOccupationId) {
    await db
      .delete(occupationsTable)
      .where(eq(occupationsTable.id, fromOccupationId));
  }
  if (careerFamilyId) {
    await db
      .delete(careerFamiliesTable)
      .where(eq(careerFamiliesTable.id, careerFamilyId));
  }
  if (taxonomyVersionId) {
    await db
      .delete(careerTaxonomyVersionsTable)
      .where(eq(careerTaxonomyVersionsTable.id, taxonomyVersionId));
  }
  await pool.end();
}
