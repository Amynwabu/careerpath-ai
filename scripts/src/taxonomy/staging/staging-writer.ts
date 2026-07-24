import { join } from "node:path";
import type { NormalisedSourceRecord, TaxonomyRecordType } from "../types";
import { stableJson, writeText } from "../utils/files";

const stagingFileByType: Record<TaxonomyRecordType, string> = {
  occupation: "occupations.jsonl",
  occupation_alias: "occupation-aliases.jsonl",
  skill: "skills.jsonl",
  skill_alias: "skill-aliases.jsonl",
  occupation_skill: "occupation-skills.jsonl",
  skill_relationship: "skill-relationships.jsonl",
  career_transition: "career-transitions.jsonl",
  competency: "professional-body-competencies.jsonl",
};

export async function writeStagingRecords(
  outputRoot: string,
  records: NormalisedSourceRecord[],
): Promise<Record<string, number>> {
  const grouped = new Map<TaxonomyRecordType, NormalisedSourceRecord[]>();
  for (const record of records) {
    const existing = grouped.get(record.recordType) ?? [];
    existing.push(record);
    grouped.set(record.recordType, existing);
  }

  const counts: Record<string, number> = {};
  for (const [recordType, values] of grouped.entries()) {
    values.sort(compareStagedRecords);
    const path = join(outputRoot, "staging", stagingFileByType[recordType]);
    await writeText(
      path,
      `${values.map((record) => stableJson(record)).join("\n")}\n`,
    );
    counts[recordType] = values.length;
  }
  return counts;
}

function compareStagedRecords(
  left: NormalisedSourceRecord,
  right: NormalisedSourceRecord,
): number {
  return (
    [
      left.sourceId.localeCompare(right.sourceId),
      left.recordType.localeCompare(right.recordType),
      left.sourceRecordId.localeCompare(right.sourceRecordId),
    ].find((value) => value !== 0) ?? 0
  );
}
