import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { NormalisedSourceRecord } from "../types";
import { fileExists } from "../utils/files";

export async function readStagingRecords(
  outputRoot: string,
): Promise<NormalisedSourceRecord[]> {
  const stagingDir = join(outputRoot, "staging");
  if (!(await fileExists(stagingDir))) return [];
  const files = (await readdir(stagingDir))
    .filter((file) => file.endsWith(".jsonl"))
    .sort((left, right) => left.localeCompare(right));

  const records: NormalisedSourceRecord[] = [];
  for (const file of files) {
    const text = await readFile(join(stagingDir, file), "utf8");
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      records.push(JSON.parse(line) as NormalisedSourceRecord);
    }
  }
  return records.sort((left, right) => {
    return (
      left.recordType.localeCompare(right.recordType) ||
      left.normalisedLabel.localeCompare(right.normalisedLabel) ||
      left.sourceRecordId.localeCompare(right.sourceRecordId)
    );
  });
}
