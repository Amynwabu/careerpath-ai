import { join } from "node:path";
import { readCsv } from "../utils/files";

export interface CanonicalValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export async function validateCanonicalOutput(
  canonicalRoot: string,
): Promise<CanonicalValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const families = await readCsv(join(canonicalRoot, "career-families.csv"));
  const occupations = await readCsv(join(canonicalRoot, "occupations.csv"));
  const occupationAliases = await readCsv(
    join(canonicalRoot, "occupation-aliases.csv"),
  );
  const skills = await readCsv(join(canonicalRoot, "skills.csv"));
  const skillAliases = await readCsv(join(canonicalRoot, "skill-aliases.csv"));
  const requirements = await readCsv(
    join(canonicalRoot, "occupation-skills.csv"),
  );
  const transitions = await readCsv(
    join(canonicalRoot, "career-transitions.csv"),
  );
  const skillRelationships = await readCsv(
    join(canonicalRoot, "skill-relationships.csv"),
  );
  const sources = await readCsv(join(canonicalRoot, "taxonomy-sources.csv"));

  const familyCodes = new Set(families.map((row) => row["code"] ?? ""));
  const occupationCodes = new Set(occupations.map((row) => row["code"] ?? ""));
  const skillCodes = new Set(skills.map((row) => row["code"] ?? ""));

  rejectDuplicates(
    occupations.map((row) => row["code"] ?? ""),
    "occupation code",
    errors,
  );
  rejectDuplicates(
    occupations.map((row) => row["slug"] ?? ""),
    "occupation slug",
    errors,
  );
  rejectDuplicates(
    skills.map((row) => row["code"] ?? ""),
    "skill code",
    errors,
  );
  rejectDuplicates(
    skills.map((row) => row["slug"] ?? ""),
    "skill slug",
    errors,
  );
  rejectDuplicates(
    families.map((row) => row["code"] ?? ""),
    "family code",
    errors,
  );

  for (const row of occupations) {
    if (!row["code"]) errors.push("Occupation missing code");
    if (!row["canonical_title"])
      errors.push(`Occupation ${row["code"]} missing canonical_title`);
    if (!familyCodes.has(row["career_family_code"] ?? "")) {
      errors.push(
        `Occupation ${row["code"]} has broken family reference ${row["career_family_code"]}`,
      );
    }
    validateReviewEvidence("Occupation", row["code"] ?? "", row, errors);
  }

  for (const row of skills) {
    if (!row["code"]) errors.push("Skill missing code");
    if (!row["canonical_name"])
      errors.push(`Skill ${row["code"]} missing canonical_name`);
    if (
      row["parent_skill_code"] &&
      !skillCodes.has(row["parent_skill_code"] ?? "")
    ) {
      errors.push(
        `Skill ${row["code"]} has broken parent skill ${row["parent_skill_code"]}`,
      );
    }
    validateReviewEvidence("Skill", row["code"] ?? "", row, errors);
  }

  for (const row of occupationAliases) {
    if (!occupationCodes.has(row["occupation_code"] ?? "")) {
      errors.push(
        `Occupation alias ${row["alias"]} has broken occupation reference ${row["occupation_code"]}`,
      );
    }
    validateConfidence("Occupation alias", row["alias"] ?? "", row, errors);
  }

  for (const row of skillAliases) {
    if (!skillCodes.has(row["skill_code"] ?? "")) {
      errors.push(
        `Skill alias ${row["alias"]} has broken skill reference ${row["skill_code"]}`,
      );
    }
    validateConfidence("Skill alias", row["alias"] ?? "", row, errors);
  }

  for (const row of requirements) {
    if (!occupationCodes.has(row["occupation_code"] ?? "")) {
      errors.push(
        `Occupation-skill row ${row["source_record_id"]} has broken occupation reference ${row["occupation_code"]}`,
      );
    }
    if (!skillCodes.has(row["skill_code"] ?? "")) {
      errors.push(
        `Occupation-skill row ${row["source_record_id"]} has broken skill reference ${row["skill_code"]}`,
      );
    }
    validateIntegerRange(
      "required_level",
      row["required_level"] ?? "",
      1,
      5,
      errors,
    );
    validateNumberRange(
      "importance_weight",
      row["importance_weight"] ?? "",
      0,
      1,
      errors,
    );
  }

  for (const row of transitions) {
    if (!occupationCodes.has(row["from_occupation_code"] ?? "")) {
      errors.push(
        `Transition ${row["source_record_id"]} has broken from occupation ${row["from_occupation_code"]}`,
      );
    }
    if (!occupationCodes.has(row["to_occupation_code"] ?? "")) {
      errors.push(
        `Transition ${row["source_record_id"]} has broken to occupation ${row["to_occupation_code"]}`,
      );
    }
    if (row["from_occupation_code"] === row["to_occupation_code"]) {
      errors.push(`Transition ${row["source_record_id"]} is a self-transition`);
    }
    validateNumberRange(
      "transferability_score",
      row["transferability_score"] ?? "",
      0,
      1,
      errors,
    );
  }

  for (const row of skillRelationships) {
    if (!skillCodes.has(row["source_skill_code"] ?? "")) {
      errors.push(
        `Skill relationship ${row["source_record_id"]} has broken source skill ${row["source_skill_code"]}`,
      );
    }
    if (!skillCodes.has(row["target_skill_code"] ?? "")) {
      errors.push(
        `Skill relationship ${row["source_record_id"]} has broken target skill ${row["target_skill_code"]}`,
      );
    }
    if (row["source_skill_code"] === row["target_skill_code"]) {
      errors.push(
        `Skill relationship ${row["source_record_id"]} links a skill to itself`,
      );
    }
    validateNumberRange("weight", row["weight"] ?? "", 0, 1, errors);
  }

  rejectDuplicateContextualRows(
    transitions.map((row) =>
      [
        row["from_occupation_code"],
        row["to_occupation_code"],
        row["transition_type"],
        row["source_id"],
      ].join("|"),
    ),
    "transition",
    errors,
  );
  rejectDuplicateContextualRows(
    requirements.map((row) =>
      [
        row["occupation_code"],
        row["skill_code"],
        row["requirement_type"],
        row["source_id"],
      ].join("|"),
    ),
    "occupation-skill mapping",
    errors,
  );
  rejectCycles(families, "code", "parent_family_code", "family", errors);
  rejectCycles(skills, "code", "parent_skill_code", "skill", errors);

  if (sources.length === 0 && (occupations.length > 0 || skills.length > 0)) {
    errors.push("Canonical output has generated records but no provenance rows");
  }
  if (sources.some((row) => !row["source_checksum"])) {
    errors.push("Canonical source provenance contains rows without checksums");
  }
  if (errors.length === 0 && warnings.length > 0) {
    warnings.push("Validation completed with warnings; review before import.");
  }

  return { ok: errors.length === 0, errors, warnings };
}

function rejectDuplicates(
  values: string[],
  label: string,
  errors: string[],
): void {
  const seen = new Set<string>();
  for (const value of values.filter(Boolean)) {
    if (seen.has(value)) errors.push(`Duplicate ${label}: ${value}`);
    seen.add(value);
  }
}

function rejectDuplicateContextualRows(
  values: string[],
  label: string,
  errors: string[],
): void {
  const seen = new Set<string>();
  for (const value of values.filter(Boolean)) {
    if (seen.has(value)) errors.push(`Duplicate contextual ${label}: ${value}`);
    seen.add(value);
  }
}

function validateReviewEvidence(
  entity: string,
  code: string,
  row: Record<string, string>,
  errors: string[],
): void {
  if (
    ["expert_reviewed", "employer_validated", "published"].includes(
      row["verification_status"] ?? "",
    ) &&
    (!row["reviewed_by"] || !row["reviewed_at"])
  ) {
    errors.push(`${entity} ${code} claims review or publication without evidence`);
  }
}

function validateConfidence(
  entity: string,
  label: string,
  row: Record<string, string>,
  errors: string[],
): void {
  validateNumberRange(`${entity} ${label} confidence`, row["confidence"] ?? "", 0, 1, errors);
}

function validateIntegerRange(
  label: string,
  value: string,
  min: number,
  max: number,
  errors: string[],
): void {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric < min || numeric > max) {
    errors.push(`${label} must be an integer from ${min} to ${max}: ${value}`);
  }
}

function validateNumberRange(
  label: string,
  value: string,
  min: number,
  max: number,
  errors: string[],
): void {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < min || numeric > max) {
    errors.push(`${label} must be between ${min} and ${max}: ${value}`);
  }
}

function rejectCycles(
  rows: Array<Record<string, string>>,
  codeColumn: string,
  parentColumn: string,
  label: string,
  errors: string[],
): void {
  const parents = new Map(
    rows
      .filter((row) => row[codeColumn])
      .map((row) => [row[codeColumn] ?? "", row[parentColumn] ?? ""]),
  );
  for (const code of parents.keys()) {
    const seen = new Set<string>();
    let current = code;
    while (current) {
      if (seen.has(current)) {
        errors.push(`Circular ${label} hierarchy includes ${code}`);
        break;
      }
      seen.add(current);
      current = parents.get(current) ?? "";
    }
  }
}
