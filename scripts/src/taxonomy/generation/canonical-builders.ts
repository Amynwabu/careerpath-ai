import { join } from "node:path";
import type {
  CandidateCanonicalRecord,
  NormalisedSourceRecord,
  ReconciliationDecision,
} from "../types";
import { writeCsv } from "../utils/files";

export async function writeCanonicalCsvs(
  canonicalRoot: string,
  candidates: CandidateCanonicalRecord[],
  records: NormalisedSourceRecord[],
  decisions: ReconciliationDecision[],
  version: string,
): Promise<Record<string, number>> {
  const occupationCandidates = candidates.filter(
    (candidate) => candidate.entityType === "occupation",
  );
  const skillCandidates = candidates.filter(
    (candidate) => candidate.entityType === "skill",
  );
  const canonicalSkillCodes = canonicalSkillCodeMap(skillCandidates);
  const canonicalSkillCandidates = uniqueRows(
    skillCandidates
      .map((candidate) => ({
        ...candidate,
        code: canonicalSkillCodes.get(candidate.code) ?? candidate.code,
      }))
      .sort((left, right) => left.code.localeCompare(right.code)),
    (candidate) => slug(candidate.label),
  );
  const canonicalDecisions = decisions.map((decision) => ({
    ...decision,
    candidateCanonicalId:
      canonicalSkillCodes.get(decision.candidateCanonicalId) ??
      decision.candidateCanonicalId,
  }));

  const families = familyRows(occupationCandidates, version);
  const occupations = occupationRows(occupationCandidates, version);
  const skills = skillRows(canonicalSkillCandidates, version);
  const occupationAliases = occupationAliasRows(
    records,
    canonicalDecisions,
    version,
  );
  const skillAliases = skillAliasRows(records, canonicalDecisions, version);
  const occupationSkills = requirementRows(
    records,
    canonicalDecisions,
    version,
  );
  const transitions = transitionRows(records, canonicalDecisions, version);
  const skillRelationships = skillRelationshipRows(
    records,
    canonicalDecisions,
    version,
  );
  const sources = provenanceRows(records, canonicalDecisions);

  await writeCsv(join(canonicalRoot, "career-families.csv"), families, [
    "code",
    "name",
    "slug",
    "description",
    "parent_family_code",
    "taxonomy_version",
    "verification_status",
    "review_status",
    "reviewed_by",
    "reviewed_at",
    "review_notes",
    "is_active",
    "display_order",
  ]);
  await writeCsv(join(canonicalRoot, "occupations.csv"), occupations, [
    "code",
    "canonical_title",
    "slug",
    "summary",
    "description",
    "career_family_code",
    "career_level",
    "country_code",
    "industry_context",
    "uk_soc_code",
    "onet_code",
    "esco_uri",
    "verification_status",
    "review_status",
    "reviewed_by",
    "reviewed_at",
    "review_notes",
    "is_active",
    "taxonomy_version",
  ]);
  await writeCsv(join(canonicalRoot, "skills.csv"), skills, [
    "code",
    "canonical_name",
    "slug",
    "description",
    "skill_category",
    "parent_skill_code",
    "proficiency_framework",
    "verification_status",
    "review_status",
    "reviewed_by",
    "reviewed_at",
    "review_notes",
    "is_active",
    "taxonomy_version",
  ]);
  await writeCsv(join(canonicalRoot, "occupation-aliases.csv"), occupationAliases, [
    "occupation_code",
    "alias",
    "normalised_alias",
    "alias_type",
    "country_code",
    "industry_context",
    "language_code",
    "source_id",
    "source_record_id",
    "source_name",
    "confidence",
    "verification_status",
    "review_status",
    "reviewed_by",
    "reviewed_at",
    "review_notes",
    "taxonomy_version",
  ]);
  await writeCsv(join(canonicalRoot, "skill-aliases.csv"), skillAliases, [
    "skill_code",
    "alias",
    "normalised_alias",
    "language_code",
    "country_code",
    "industry_context",
    "source_id",
    "source_record_id",
    "source_name",
    "confidence",
    "verification_status",
    "review_status",
    "reviewed_by",
    "reviewed_at",
    "review_notes",
    "taxonomy_version",
  ]);
  await writeCsv(join(canonicalRoot, "occupation-skills.csv"), occupationSkills, [
    "occupation_code",
    "skill_code",
    "source_id",
    "source_record_id",
    "requirement_type",
    "required_level",
    "minimum_level",
    "importance_weight",
    "evidence_required",
    "verification_status",
    "review_status",
    "reviewed_by",
    "reviewed_at",
    "review_notes",
    "taxonomy_version",
  ]);
  await writeCsv(join(canonicalRoot, "career-transitions.csv"), transitions, [
    "from_occupation_code",
    "to_occupation_code",
    "source_id",
    "source_record_id",
    "transition_type",
    "difficulty_score",
    "transferability_score",
    "verification_status",
    "review_status",
    "reviewed_by",
    "reviewed_at",
    "review_notes",
    "taxonomy_version",
  ]);
  await writeCsv(join(canonicalRoot, "skill-relationships.csv"), skillRelationships, [
    "source_skill_code",
    "target_skill_code",
    "source_id",
    "source_record_id",
    "relationship_type",
    "weight",
    "verification_status",
    "review_status",
    "reviewed_by",
    "reviewed_at",
    "review_notes",
    "taxonomy_version",
  ]);
  await writeCsv(join(canonicalRoot, "taxonomy-sources.csv"), sources, [
    "entity_type",
    "entity_code",
    "source_id",
    "source_record_id",
    "source_type",
    "source_name",
    "source_version",
    "licence_name",
    "licence_url",
    "retrieved_at",
    "source_checksum",
  ]);

  return {
    careerFamilies: families.length,
    occupations: occupations.length,
    occupationAliases: occupationAliases.length,
    skills: skills.length,
    skillAliases: skillAliases.length,
    occupationSkills: occupationSkills.length,
    careerTransitions: transitions.length,
    skillRelationships: skillRelationships.length,
    sourceReferences: sources.length,
  };
}

function familyRows(candidates: CandidateCanonicalRecord[], version: string) {
  const names = [
    ...new Set(
      candidates.map(
        (candidate) => candidate.familyCode || "Business and Operations",
      ),
    ),
  ].sort();
  return names.map((name, index) => ({
    code: familyCode(name),
    name,
    slug: slug(name),
    description: `CareerPathX canonical family candidate for ${name}.`,
    parent_family_code: "",
    taxonomy_version: version,
    verification_status: "source_mapped",
    review_status: "not_reviewed",
    reviewed_by: "",
    reviewed_at: "",
    review_notes: "",
    is_active: "true",
    display_order: String(index + 1),
  }));
}

function occupationRows(
  candidates: CandidateCanonicalRecord[],
  version: string,
) {
  return candidates.map((candidate) => ({
    code: candidate.code,
    canonical_title: candidate.label,
    slug: slug(candidate.label),
    summary:
      candidate.description || `Candidate occupation for ${candidate.label}.`,
    description: candidate.description,
    career_family_code: familyCode(
      candidate.familyCode || "Business and Operations",
    ),
    career_level: candidate.careerLevel || inferCareerLevel(candidate.label),
    country_code: "GB",
    industry_context: candidate.principalUkContext || candidate.familyCode || "",
    uk_soc_code: candidate.externalCodes["uk_soc_code"] ?? "",
    onet_code: candidate.externalCodes["onet_code"] ?? "",
    esco_uri: candidate.externalCodes["esco_uri"] ?? "",
    verification_status: candidate.verificationStatus ?? "source_mapped",
    review_status: "not_reviewed",
    reviewed_by: "",
    reviewed_at: "",
    review_notes: "",
    is_active: "true",
    taxonomy_version: version,
  }));
}

function skillRows(candidates: CandidateCanonicalRecord[], version: string) {
  return candidates.map((candidate) => ({
    code: candidate.code,
    canonical_name: candidate.label,
    slug: slug(candidate.label),
    description:
      candidate.description || `Candidate skill for ${candidate.label}.`,
    skill_category: normaliseSkillCategory(
      candidate.skillCategory || "transferable",
    ),
    parent_skill_code: "",
    proficiency_framework: "cpx_1_5",
    verification_status: "source_mapped",
    review_status: "not_reviewed",
    reviewed_by: "",
    reviewed_at: "",
    review_notes: "",
    is_active: "true",
    taxonomy_version: version,
  }));
}

function occupationAliasRows(
  records: NormalisedSourceRecord[],
  decisions: ReconciliationDecision[],
  version: string,
) {
  const rows = records
    .filter((record) =>
      ["occupation", "occupation_alias"].includes(record.recordType),
    )
    .map((record) => {
      const parent =
        record.recordType === "occupation"
          ? record.sourceRecordId
          : record.parentIdentifiers[0] ?? "";
      const decision = decisionFor(decisions, record.sourceId, parent);
      return {
        occupation_code: decision?.candidateCanonicalId ?? "",
        alias: record.preferredLabel,
        normalised_alias: record.normalisedLabel,
        alias_type:
          record.recordType === "occupation"
            ? "source_preferred_label"
            : "alternative_title",
        country_code: record.country,
        industry_context: record.attributes.sector ?? "",
        language_code: record.language,
        source_id: record.sourceId,
        source_record_id: record.sourceRecordId,
        source_name: record.provenance.sourceName,
        confidence: String(decision?.confidence ?? 0.75),
        verification_status: "source_mapped",
        review_status: "not_reviewed",
        reviewed_by: "",
        reviewed_at: "",
        review_notes: "",
        taxonomy_version: version,
      };
    })
    .filter((row) => row.occupation_code && row.alias);
  return uniqueRows(rows, (row) =>
    [
      row.occupation_code,
      row.normalised_alias,
      row.country_code,
      row.language_code,
      row.source_id,
      row.source_record_id,
    ].join("|"),
  );
}

function skillAliasRows(
  records: NormalisedSourceRecord[],
  decisions: ReconciliationDecision[],
  version: string,
) {
  const rows = records
    .filter((record) => ["skill", "skill_alias"].includes(record.recordType))
    .map((record) => {
      const parent =
        record.recordType === "skill"
          ? record.sourceRecordId
          : record.parentIdentifiers[0] ?? "";
      const decision = decisionFor(decisions, record.sourceId, parent);
      return {
        skill_code: decision?.candidateCanonicalId ?? "",
        alias: record.preferredLabel,
        normalised_alias: record.normalisedLabel,
        language_code: record.language,
        country_code: record.country,
        industry_context: record.attributes.skillCategory ?? "",
        source_id: record.sourceId,
        source_record_id: record.sourceRecordId,
        source_name: record.provenance.sourceName,
        confidence: String(decision?.confidence ?? 0.75),
        verification_status: "source_mapped",
        review_status: "not_reviewed",
        reviewed_by: "",
        reviewed_at: "",
        review_notes: "",
        taxonomy_version: version,
      };
    })
    .filter((row) => row.skill_code && row.alias);
  return uniqueRows(rows, (row) =>
    [
      row.skill_code,
      row.normalised_alias,
      row.language_code,
      row.source_id,
      row.source_record_id,
    ].join("|"),
  );
}

function requirementRows(
  records: NormalisedSourceRecord[],
  decisions: ReconciliationDecision[],
  version: string,
) {
  const rows = records
    .filter(
      (record) =>
        record.recordType === "occupation_skill" ||
        record.recordType === "competency",
    )
    .map((record) => {
      const occupationCode = decisionCode(
        decisions,
        record.sourceId,
        record.parentIdentifiers[0] ?? "",
      );
      const skillCode = decisionCode(
        decisions,
        record.sourceId,
        record.relatedIdentifiers[0] ?? record.sourceRecordId,
      );
      return {
        occupation_code: occupationCode,
        skill_code: skillCode,
        source_id: record.sourceId,
        source_record_id: record.sourceRecordId,
        requirement_type: record.attributes.requirementType ?? "desirable",
        required_level: String(record.attributes.requiredLevel ?? 3),
        minimum_level: "",
        importance_weight: String(record.attributes.importanceWeight ?? 0.5),
        evidence_required: "true",
        verification_status: "source_mapped",
        review_status: "not_reviewed",
        reviewed_by: "",
        reviewed_at: "",
        review_notes: "",
        taxonomy_version: version,
      };
    })
    .filter((row) => row.occupation_code && row.skill_code);
  return uniqueRows(rows, (row) =>
    [
      row.occupation_code,
      row.skill_code,
      row.requirement_type,
      row.source_id,
    ].join("|"),
  );
}

function transitionRows(
  records: NormalisedSourceRecord[],
  decisions: ReconciliationDecision[],
  version: string,
) {
  const rows = records
    .filter((record) => record.recordType === "career_transition")
    .map((record) => {
      const from = decisionCode(
        decisions,
        record.sourceId,
        record.parentIdentifiers[0] ?? "",
      );
      const to = decisionCode(
        decisions,
        record.sourceId,
        record.relatedIdentifiers[0] ?? "",
      );
      return {
        from_occupation_code: from,
        to_occupation_code: to,
        source_id: record.sourceId,
        source_record_id: record.sourceRecordId,
        transition_type: record.attributes.transitionType ?? "lateral",
        difficulty_score: String(record.attributes.difficultyScore ?? 3),
        transferability_score: String(
          record.attributes.transferabilityScore ?? 0.5,
        ),
        verification_status: "source_mapped",
        review_status: "not_reviewed",
        reviewed_by: "",
        reviewed_at: "",
        review_notes: "",
        taxonomy_version: version,
      };
    })
    .filter(
      (row) =>
        row.from_occupation_code &&
        row.to_occupation_code &&
        row.from_occupation_code !== row.to_occupation_code,
    );
  return uniqueRows(rows, (row) =>
    [
      row.from_occupation_code,
      row.to_occupation_code,
      row.transition_type,
      row.source_id,
    ].join("|"),
  );
}

function skillRelationshipRows(
  records: NormalisedSourceRecord[],
  decisions: ReconciliationDecision[],
  version: string,
) {
  const rows = records
    .filter((record) => record.recordType === "skill_relationship")
    .map((record) => {
      const sourceSkill = decisionCode(
        decisions,
        record.sourceId,
        record.parentIdentifiers[0] ?? "",
      );
      const targetSkill = decisionCode(
        decisions,
        record.sourceId,
        record.relatedIdentifiers[0] ?? "",
      );
      return {
        source_skill_code: sourceSkill,
        target_skill_code: targetSkill,
        source_id: record.sourceId,
        source_record_id: record.sourceRecordId,
        relationship_type: record.attributes.relationshipType ?? "related_to",
        weight: String(record.attributes.importanceWeight ?? 0.5),
        verification_status: "source_mapped",
        review_status: "not_reviewed",
        reviewed_by: "",
        reviewed_at: "",
        review_notes: "",
        taxonomy_version: version,
      };
    })
    .filter(
      (row) =>
        row.source_skill_code &&
        row.target_skill_code &&
        row.source_skill_code !== row.target_skill_code,
    );
  return uniqueRows(rows, (row) =>
    [
      row.source_skill_code,
      row.target_skill_code,
      row.relationship_type,
      row.source_id,
    ].join("|"),
  );
}

function provenanceRows(
  records: NormalisedSourceRecord[],
  decisions: ReconciliationDecision[],
) {
  return records.map((record) => ({
    entity_type: record.recordType,
    entity_code:
      decisionFor(decisions, record.sourceId, record.sourceRecordId)
        ?.candidateCanonicalId ?? "",
    source_id: record.sourceId,
    source_record_id: record.sourceRecordId,
    source_type: record.sourceType,
    source_name: record.provenance.sourceName,
    source_version: record.sourceVersion,
    licence_name: record.provenance.licenceName,
    licence_url: record.provenance.licenceUrl,
    retrieved_at: record.retrievedAt,
    source_checksum: record.sourceChecksum,
  }));
}

function decisionCode(
  decisions: ReconciliationDecision[],
  sourceId: string,
  sourceRecordId: string,
): string {
  return (
    decisionFor(decisions, sourceId, sourceRecordId)?.candidateCanonicalId ?? ""
  );
}

function decisionFor(
  decisions: ReconciliationDecision[],
  sourceId: string,
  sourceRecordId: string,
): ReconciliationDecision | undefined {
  return decisions.find(
    (decision) =>
      decision.sourceId === sourceId &&
      decision.sourceRecordId === sourceRecordId &&
      Boolean(decision.candidateCanonicalId),
  );
}

function familyCode(name: string): string {
  return `CPX-FAM-${slug(name).toUpperCase().replaceAll("-", "_")}`;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function inferCareerLevel(label: string): string {
  const normalised = label.toLowerCase();
  if (normalised.includes("director") || normalised.includes("head"))
    return "executive";
  if (normalised.includes("senior") || normalised.includes("lead"))
    return "senior_practitioner";
  if (normalised.includes("manager")) return "manager";
  return "practitioner";
}

function normaliseSkillCategory(value: string): string {
  if (value === "knowledge") return "domain_knowledge";
  return value;
}

function uniqueRows<T>(rows: T[], keyFor: (row: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const row of rows) {
    const key = keyFor(row);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(row);
  }
  return result;
}

function canonicalSkillCodeMap(
  candidates: CandidateCanonicalRecord[],
): Map<string, string> {
  const codesBySlug = new Map<string, string[]>();
  for (const candidate of candidates) {
    const key = slug(candidate.label);
    const codes = codesBySlug.get(key) ?? [];
    codes.push(candidate.code);
    codesBySlug.set(key, codes);
  }

  const result = new Map<string, string>();
  for (const codes of codesBySlug.values()) {
    const canonicalCode = [...codes].sort()[0] ?? "";
    for (const code of codes) result.set(code, canonicalCode);
  }
  return result;
}
