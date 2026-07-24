import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { sourceConfigs } from "../../config";
import {
  normaliseCountry,
  normaliseLanguage,
} from "../../normalisation/language-normaliser";
import { normaliseSkill } from "../../normalisation/skill-normaliser";
import type {
  NormalisedSourceRecord,
  RawSourceRecord,
  SourceInput,
  SourceInspection,
  SourceValidationResult,
} from "../../types";
import { fileExists, readCsv, sha256File, sourcePath } from "../../utils/files";
import { CsvSourceAdapter } from "../base-adapter";

export class ProfessionalBodiesAdapter extends CsvSourceAdapter {
  readonly sourceId = "professional-bodies" as const;
  readonly sourceType = "professional_body" as const;
  protected readonly files = [
    {
      path: "professional-bodies/sources.json",
      recordType: "competency" as const,
      requiredColumns: ["source_id"],
    },
  ];

  override async inspect(input: SourceInput): Promise<SourceInspection> {
    const base = await super.inspect(input);
    const bodyDirs = await this.bodyDirectories(input);
    const expectedCompetencyFiles = bodyDirs.map(
      (body) => `professional-bodies/${body}/competencies.csv`,
    );
    const discoveredFiles = [...base.discoveredFiles];
    const missingFiles = [...base.missingFiles];

    for (const file of expectedCompetencyFiles) {
      if (await fileExists(sourcePath(input.inputRoot, file))) {
        discoveredFiles.push(file);
      } else {
        missingFiles.push(file);
      }
    }

    return {
      ...base,
      expectedFiles: [...base.expectedFiles, ...expectedCompetencyFiles],
      discoveredFiles,
      missingFiles,
      warnings: [
        ...base.warnings,
        "No professional-body web scraping is performed. Only controlled local CSV imports are supported.",
      ],
    };
  }

  override async validate(input: SourceInput): Promise<SourceValidationResult> {
    const inspection = await this.inspect(input);
    const errors = inspection.missingFiles.map(
      (file) => `Missing required file: ${file}`,
    );
    let recordCount = 0;
    const files: SourceValidationResult["files"] = [];

    for (const file of inspection.discoveredFiles.filter((item) =>
      item.endsWith("competencies.csv"),
    )) {
      const absolutePath = sourcePath(input.inputRoot, file);
      const rows = await readCsv(absolutePath);
      recordCount += rows.length;
      const headers = new Set(Object.keys(rows[0] ?? {}));
      const missingColumns: string[] = [];
      for (const column of ["competency_id", "competency_label", "source_id"]) {
        if (!headers.has(column)) {
          missingColumns.push(column);
          errors.push(`${file} missing column: ${column}`);
        }
      }
      files.push({
        fileName: file,
        accepted: missingColumns.length === 0,
        expectedColumns: ["competency_id", "competency_label", "source_id"],
        missingColumns,
        recordCount: rows.length,
        encoding: "utf-8",
        checksum: await sha256File(absolutePath),
      });
    }

    return {
      sourceId: this.sourceId,
      ok: errors.length === 0,
      errors,
      warnings: inspection.warnings,
      recordCount,
      rejectedCount: errors.length,
      metadata: inspection.metadata,
      files,
    };
  }

  override async *extract(input: SourceInput): AsyncIterable<RawSourceRecord> {
    const validation = await this.validate(input);
    if (!validation.ok) {
      throw new Error(
        `${this.sourceId} validation failed: ${validation.errors.join("; ")}`,
      );
    }

    for (const body of await this.bodyDirectories(input)) {
      const filePath = `professional-bodies/${body}/competencies.csv`;
      const absolutePath = sourcePath(input.inputRoot, filePath);
      if (!(await fileExists(absolutePath))) continue;
      const checksum = await sha256File(absolutePath);
      const rows = await readCsv(absolutePath);
      for (const [index, row] of rows.entries()) {
        yield {
          sourceId: this.sourceId,
          sourceType: this.sourceType,
          sourceRecordId: row["competency_id"] || `${body}:${index + 2}`,
          sourceVersion: row["source_version"] || input.version,
          recordType: "competency",
          fileName: filePath,
          rowNumber: index + 2,
          original: row,
          sourceChecksum: checksum,
          retrievedAt: row["retrieved_at"] || new Date(0).toISOString(),
        };
      }
    }
  }

  normalise(record: RawSourceRecord): NormalisedSourceRecord[] {
    const row = record.original;
    const skill = normaliseSkill(row["competency_label"] ?? "");
    const config = sourceConfigs[this.sourceId];
    return [
      this.baseRecord(record, {
        recordType: "competency",
        preferredLabel: skill.display,
        normalisedLabel: skill.normalised,
        alternativeLabels: [],
        description: row["concise_statement"] ?? "",
        externalCodes: {
          professional_body: row["source_id"] ?? "",
          competency_id: row["competency_id"] ?? "",
        },
        parentIdentifiers: [row["framework_section"] ?? ""].filter(Boolean),
        relatedIdentifiers: [row["career_stage"] ?? ""].filter(Boolean),
        country: normaliseCountry(row["country"], config.country),
        language: normaliseLanguage(row["language"], config.language),
        attributes: {
          skillCategory: skill.skillCategory,
          requirementType: row["requirement_type"] || "leadership_stage",
          requiredLevel: Number(row["cpx_level"] || 3),
        },
      }),
    ];
  }

  private async bodyDirectories(input: SourceInput): Promise<string[]> {
    const root = join(input.inputRoot, "professional-bodies");
    if (!(await fileExists(root))) return [];
    const entries = await readdir(root, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  }
}
