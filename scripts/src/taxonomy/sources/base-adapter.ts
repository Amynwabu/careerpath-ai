import { join } from "node:path";
import { sourceConfigs } from "../config";
import type {
  NormalisedSourceRecord,
  RawSourceRecord,
  SourceInput,
  SourceInspection,
  SourceMetadata,
  SourceProvenance,
  SourceValidationResult,
  TaxonomySourceId,
  TaxonomySourceType,
} from "../types";
import type { CsvRow } from "../utils/csv";
import {
  fileExists,
  readCsv,
  readText,
  sha256File,
  sourcePath,
} from "../utils/files";

export interface TaxonomySourceAdapter {
  readonly sourceId: TaxonomySourceId;
  readonly sourceType: TaxonomySourceType;
  readonly adapterVersion: string;

  inspect(input: SourceInput): Promise<SourceInspection>;
  validate(input: SourceInput): Promise<SourceValidationResult>;
  extract(input: SourceInput): AsyncIterable<RawSourceRecord>;
  normalise(record: RawSourceRecord): NormalisedSourceRecord[];
  getProvenance(record: RawSourceRecord): SourceProvenance;
}

export abstract class CsvSourceAdapter implements TaxonomySourceAdapter {
  abstract readonly sourceId: TaxonomySourceId;
  abstract readonly sourceType: TaxonomySourceType;
  readonly adapterVersion = "1.0.0";
  abstract normalise(record: RawSourceRecord): NormalisedSourceRecord[];

  protected abstract readonly files: Array<{
    path: string;
    recordType: RawSourceRecord["recordType"];
    requiredColumns: string[];
  }>;

  async inspect(input: SourceInput): Promise<SourceInspection> {
    const discoveredFiles: string[] = [];
    const missingFiles: string[] = [];
    const metadata: SourceMetadata[] = [];

    for (const file of this.files) {
      const absolutePath = sourcePath(input.inputRoot, file.path);
      if (await fileExists(absolutePath)) {
        discoveredFiles.push(file.path);
        metadata.push(await this.metadataFor(input, file.path));
      } else {
        missingFiles.push(file.path);
      }
    }

    return {
      sourceId: this.sourceId,
      adapterVersion: this.adapterVersion,
      expectedFiles: this.files.map((file) => file.path),
      discoveredFiles,
      missingFiles,
      metadata,
      warnings:
        this.sourceId === "professional-bodies"
          ? [
              "Professional-body adapters only support controlled local imports.",
            ]
          : [],
    };
  }

  async validate(input: SourceInput): Promise<SourceValidationResult> {
    const inspection = await this.inspect(input);
    const errors = inspection.missingFiles.map(
      (file) => `Missing required file: ${file}`,
    );
    let recordCount = 0;
    const fileResults: SourceValidationResult["files"] = [];

    for (const file of this.files) {
      if (inspection.missingFiles.includes(file.path)) continue;
      const absolutePath = sourcePath(input.inputRoot, file.path);
      const rows = await readCsv(absolutePath);
      recordCount += rows.length;
      const missingColumns = this.missingColumns(rows, file.requiredColumns);
      if (missingColumns.length > 0) {
        errors.push(
          `${file.path} missing columns: ${missingColumns.join(", ")}`,
        );
      }
      fileResults.push({
        fileName: file.path,
        accepted: missingColumns.length === 0,
        expectedColumns: file.requiredColumns,
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
      files: fileResults,
    };
  }

  async *extract(input: SourceInput): AsyncIterable<RawSourceRecord> {
    const validation = await this.validate(input);
    if (!validation.ok) {
      throw new Error(
        `${this.sourceId} validation failed: ${validation.errors.join("; ")}`,
      );
    }

    for (const file of this.files) {
      const absolutePath = sourcePath(input.inputRoot, file.path);
      const checksum = await sha256File(absolutePath);
      const rows = await readCsv(absolutePath);
      for (const [index, row] of rows.entries()) {
        yield {
          sourceId: this.sourceId,
          sourceType: this.sourceType,
          sourceRecordId: this.recordId(row, file.path, index + 2),
          sourceVersion: row["source_version"] || input.version,
          recordType: file.recordType,
          fileName: file.path,
          rowNumber: index + 2,
          original: row,
          sourceChecksum: checksum,
          retrievedAt: row["retrieved_at"] || new Date(0).toISOString(),
        };
      }
    }
  }

  getProvenance(record: RawSourceRecord): SourceProvenance {
    const config = sourceConfigs[this.sourceId];
    return {
      sourceId: this.sourceId,
      sourceType: this.sourceType,
      sourceName: config.sourceName,
      sourceRecordId: record.sourceRecordId,
      sourceVersion: record.sourceVersion,
      sourceUrl: record.original["source_url"] || config.sourceUrl,
      licenceName: record.original["licence_name"] || "See source manifest",
      licenceUrl: record.original["licence_url"] || "",
      retrievedAt: record.retrievedAt,
      sourceChecksum: record.sourceChecksum,
      adapterVersion: this.adapterVersion,
    };
  }

  protected baseRecord(
    record: RawSourceRecord,
    values: Omit<
      NormalisedSourceRecord,
      | "sourceId"
      | "sourceType"
      | "sourceRecordId"
      | "sourceVersion"
      | "sourceChecksum"
      | "retrievedAt"
      | "provenance"
      | "rawAttributes"
    >,
  ): NormalisedSourceRecord {
    return {
      sourceId: record.sourceId,
      sourceType: record.sourceType,
      sourceRecordId: record.sourceRecordId,
      sourceVersion: record.sourceVersion,
      rawAttributes: record.original,
      sourceChecksum: record.sourceChecksum,
      retrievedAt: record.retrievedAt,
      provenance: this.getProvenance(record),
      ...values,
    };
  }

  protected recordId(row: CsvRow, filePath: string, rowNumber: number): string {
    return (
      row["source_record_id"] ||
      row["soc_code"] ||
      row["concept_uri"] ||
      row["skill_uri"] ||
      row["onet_code"] ||
      row["competency_id"] ||
      `${filePath}:${rowNumber}`
    );
  }

  private async metadataFor(
    input: SourceInput,
    filePath: string,
  ): Promise<SourceMetadata> {
    const config = sourceConfigs[this.sourceId];
    const absolutePath = join(input.inputRoot, filePath);
    const manifest = await this.manifestMetadataFor(input, filePath);
    return {
      sourceId: this.sourceId,
      sourceName: config.sourceName,
      sourceType: config.sourceType,
      sourceVersion: manifest?.sourceVersion ?? input.version,
      publisher: config.publisher,
      sourceUrl: manifest?.sourceUrl ?? config.sourceUrl,
      downloadUrl: manifest?.downloadUrl ?? "",
      licenceName: manifest?.licenceName ?? "See source manifest",
      licenceUrl: manifest?.licenceUrl ?? "",
      retrievedAt: manifest?.retrievedAt ?? new Date(0).toISOString(),
      checksum: await sha256File(absolutePath),
      fileName: filePath,
      fileFormat: "csv",
      language: config.language,
      country: config.country,
      permittedUseNotes:
        "Raw source files are read from local input directories and are not committed by this pipeline.",
      adapterVersion: this.adapterVersion,
      rawFileCommitted: false,
      redistributionAllowed: manifest?.redistributionAllowed ?? false,
      fileSizeBytes: manifest?.fileSizeBytes,
      recordCount: manifest?.recordCount,
      encoding: manifest?.encoding,
      localPath: manifest?.localPath,
      sourceRole: manifest?.sourceRole,
    };
  }

  private async manifestMetadataFor(
    input: SourceInput,
    filePath: string,
  ): Promise<
    | {
        sourceVersion: string;
        sourceUrl: string;
        downloadUrl: string;
        licenceName: string;
        licenceUrl: string;
        retrievedAt: string;
        redistributionAllowed: boolean;
        fileSizeBytes?: number;
        recordCount?: number;
        encoding?: string;
        localPath?: string;
        sourceRole?: string;
      }
    | undefined
  > {
    try {
      const manifest = JSON.parse(await readText(input.manifestPath)) as {
        sources?: Array<{
          source_id?: string;
          source_version?: string;
          source_url?: string;
          download_url?: string;
          licence_name?: string;
          licence_url?: string;
          retrieved_at?: string;
          redistribution_allowed?: boolean;
          files?: Array<{
            local_path?: string;
            file_size_bytes?: number;
            record_count?: number;
            encoding?: string;
            source_role?: string;
          }>;
        }>;
      };
      const source = manifest.sources?.find(
        (entry) => entry.source_id === this.sourceId,
      );
      const file = source?.files?.find((entry) => entry.local_path === filePath);
      if (!source || !file) return undefined;
      return {
        sourceVersion: source.source_version ?? input.version,
        sourceUrl: source.source_url ?? sourceConfigs[this.sourceId].sourceUrl,
        downloadUrl: source.download_url ?? "",
        licenceName: source.licence_name ?? "See source manifest",
        licenceUrl: source.licence_url ?? "",
        retrievedAt: source.retrieved_at ?? new Date(0).toISOString(),
        redistributionAllowed: Boolean(source.redistribution_allowed),
        fileSizeBytes: file.file_size_bytes,
        recordCount: file.record_count,
        encoding: file.encoding,
        localPath: file.local_path,
        sourceRole: file.source_role,
      };
    } catch {
      return undefined;
    }
  }

  private missingColumns(rows: CsvRow[], requiredColumns: string[]): string[] {
    const headers = new Set(Object.keys(rows[0] ?? {}));
    return requiredColumns.filter((column) => !headers.has(column));
  }
}
