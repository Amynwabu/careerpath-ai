import { join } from "node:path";
import type {
  CandidateCanonicalRecord,
  CuratedMapping,
  NormalisedSourceRecord,
} from "../types";
import { cpxCode } from "../normalisation/code-normaliser";
import { normaliseTitle } from "../normalisation/title-normaliser";
import { textSimilarity } from "../normalisation/text-normaliser";
import type { OccupationPlanRow } from "../selection/domain-policy";
import { readCsv } from "../utils/files";
import { stableHash } from "../utils/files";

const mappingFiles = [
  "uk-soc-to-cpx.csv",
  "esco-occupation-to-cpx.csv",
  "esco-skill-to-cpx.csv",
  "onet-to-cpx.csv",
  "professional-competency-to-cpx.csv",
];

export async function readCuratedMappings(
  mappingDir: string,
): Promise<CuratedMapping[]> {
  const mappings: CuratedMapping[] = [];
  for (const file of mappingFiles) {
    try {
      const rows = await readCsv(join(mappingDir, file));
      for (const row of rows) {
        if (!row["source_id"] || !row["source_record_id"]) continue;
        mappings.push({
          sourceId: row["source_id"] ?? "",
          sourceRecordId: row["source_record_id"] ?? "",
          careerpathxCode: row["careerpathx_code"] ?? "",
          mappingType: row["mapping_type"] ?? "",
          confidence: Number(row["confidence"] || 0),
          mappingStatus: (row["mapping_status"] ||
            "proposed") as CuratedMapping["mappingStatus"],
          reviewedBy: row["reviewed_by"] ?? "",
          reviewedAt: row["reviewed_at"] ?? "",
          notes: row["notes"] ?? "",
        });
      }
    } catch {
      // Missing mapping files are allowed; headers are committed for normal operation.
    }
  }
  return mappings;
}

export function mappingForRecord(
  mappings: CuratedMapping[],
  record: NormalisedSourceRecord,
): CuratedMapping | undefined {
  return mappings.find(
    (mapping) =>
      mapping.sourceId === record.sourceId &&
      mapping.sourceRecordId === record.sourceRecordId &&
      mapping.mappingStatus !== "rejected" &&
      mapping.mappingStatus !== "deprecated",
  );
}

export function buildCandidateRecords(
  records: NormalisedSourceRecord[],
  occupationPlan: OccupationPlanRow[] = [],
): CandidateCanonicalRecord[] {
  const canonical = new Map<string, CandidateCanonicalRecord>();
  for (const planRow of occupationPlan) {
    canonical.set(`occupation-plan:${planRow.cpxCode}`, {
      code: planRow.cpxCode,
      entityType: "occupation",
      label: planRow.canonicalTitle,
      normalisedLabel: planRow.normalisedTitle,
      sourceRecordIds: [],
      sourceIds: ["internal"],
      externalCodes: {},
      description: planRow.principalUkContext,
      familyCode: planRow.careerFamily,
      careerLevel: planRow.careerLevel,
      principalUkContext: planRow.principalUkContext,
      regulated: planRow.regulated,
      humanReviewMandatory: planRow.humanReviewMandatory,
      verificationStatus: planRow.humanReviewMandatory
        ? "draft"
        : "source_mapped",
    });
  }

  for (const record of records.filter((item) =>
    ["occupation", "skill", "competency"].includes(item.recordType),
  )) {
    const entityType =
      record.recordType === "occupation" ? "occupation" : "skill";
    if (entityType === "occupation" && occupationPlan.length > 0) {
      const plannedCode = record.attributes.plannedCpxCode;
      const planned = plannedCode
        ? [...canonical.values()].find(
            (candidate) => candidate.code === plannedCode,
          )
        : undefined;
      if (planned) {
        planned.sourceRecordIds.push(record.sourceRecordId);
        planned.sourceIds.push(record.sourceId);
        Object.assign(planned.externalCodes, record.externalCodes);
      }
      continue;
    }

    const key = `${entityType}:${record.normalisedLabel}:${record.country}:${record.attributes.sector ?? ""}:${record.attributes.skillCategory ?? ""}`;
    const existing = canonical.get(key);
    if (existing) {
      existing.sourceRecordIds.push(record.sourceRecordId);
      existing.sourceIds.push(record.sourceId);
      existing.description ||= record.description;
      Object.assign(existing.externalCodes, record.externalCodes);
      continue;
    }

    const hash = stableHash({
      entityType,
      normalisedLabel: record.normalisedLabel,
      country: record.country,
      sector: record.attributes.sector ?? "",
      category: record.attributes.skillCategory ?? "",
    });
    canonical.set(key, {
      code: cpxCode(entityType, hash),
      entityType,
      label: record.preferredLabel,
      normalisedLabel: record.normalisedLabel,
      sourceRecordIds: [record.sourceRecordId],
      sourceIds: [record.sourceId],
      externalCodes: { ...record.externalCodes },
      description: record.description,
      familyCode: record.attributes.sector,
      skillCategory: record.attributes.skillCategory,
    });
  }
  return [...canonical.values()].sort((left, right) =>
    left.code.localeCompare(right.code),
  );
}

export function candidateForRecord(
  candidates: CandidateCanonicalRecord[],
  record: NormalisedSourceRecord,
): CandidateCanonicalRecord {
  const entityType =
    record.recordType === "occupation" ? "occupation" : "skill";
  const sameType = candidates.filter(
    (candidate) => candidate.entityType === entityType,
  );
  if (record.attributes.plannedCpxCode) {
    const planned = sameType.find(
      (candidate) => candidate.code === record.attributes.plannedCpxCode,
    );
    if (planned) return planned;
  }
  const exact = sameType.find(
    (candidate) => candidate.normalisedLabel === record.normalisedLabel,
  );
  if (exact) return exact;
  const best = sameType
    .map((candidate) => ({
      candidate,
      score: textSimilarity(
        normaliseTitle(record.preferredLabel).normalised,
        candidate.normalisedLabel,
      ),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.candidate.code.localeCompare(right.candidate.code),
    )[0];
  return best?.candidate ?? buildCandidateRecords([record])[0]!;
}
