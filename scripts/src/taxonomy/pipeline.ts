import { join } from "node:path";
import {
  defaultCanonicalRoot,
  defaultDomainPolicyPath,
  defaultInputRoot,
  defaultManifestPath,
  defaultMappingDir,
  defaultOutputRoot,
  defaultPlanPath,
  defaultReportRoot,
  selectedSources,
} from "./config";
import { prepareSourceSnapshot } from "./acquisition/prepare-source-snapshot";
import { writeCanonicalCsvs } from "./generation/canonical-builders";
import {
  governanceSummary as readGovernanceSummary,
  publishTaxonomy as publishGovernedTaxonomy,
  reviewTaxonomy as reviewGovernedTaxonomy,
  validateGovernance as validateGovernedTaxonomy,
} from "./governance/governance";
import {
  applyReviewDecisions,
  prepareReviewProgramme,
  publicationReadiness,
  reviewConflicts,
  reviewProgress,
  validateReviewProgramme,
} from "./governance/review-operations";
import {
  prepareReviewerOnboarding,
  validateReviewerRegistry,
} from "./governance/reviewer-onboarding";
import {
  pilotStatus,
  preparePilotReview,
} from "./governance/pilot-review";
import {
  buildCandidateRecords,
  readCuratedMappings,
} from "./reconciliation/candidate-generator";
import { reconcileOccupations } from "./reconciliation/occupation-reconciler";
import { reconcileRelationships } from "./reconciliation/relationship-reconciler";
import { writeReviewReports } from "./reconciliation/review-queue";
import { reconcileSkills } from "./reconciliation/skill-reconciler";
import { getAdapter } from "./sources";
import { readOccupationPlan } from "./selection/domain-policy";
import { readStagingRecords } from "./staging/staging-reader";
import { writeStagingRecords } from "./staging/staging-writer";
import type {
  NormalisedSourceRecord,
  ReconciliationDecision,
  SourceInput,
  SourceInspection,
  SourceValidationResult,
  TaxonomySourceSelection,
} from "./types";
import { assertValidSources } from "./validation/source-validator";
import { validateCanonicalOutput } from "./validation/canonical-validator";
import { readCsv, stableJson, writeJson, writeText } from "./utils/files";

export interface PipelineOptions {
  source: TaxonomySourceSelection;
  inputRoot: string;
  outputRoot: string;
  canonicalRoot: string;
  reportRoot: string;
  mappingDir: string;
  manifestPath: string;
  planPath: string;
  domainPolicyPath: string;
  version: string;
  dryRun: boolean;
  fetchEsco: boolean;
  retrievedAt: string;
}

export function defaultPipelineOptions(
  overrides: Partial<PipelineOptions> = {},
): PipelineOptions {
  return {
    source: "all",
    inputRoot: defaultInputRoot,
    outputRoot: defaultOutputRoot,
    canonicalRoot: defaultCanonicalRoot,
    reportRoot: defaultReportRoot,
    mappingDir: defaultMappingDir,
    manifestPath: defaultManifestPath,
    planPath: defaultPlanPath,
    domainPolicyPath: defaultDomainPolicyPath,
    version: "2026.1",
    dryRun: false,
    fetchEsco: false,
    retrievedAt: "2026-07-24T00:00:00.000Z",
    ...overrides,
  };
}

export async function prepareSources(options: PipelineOptions) {
  return prepareSourceSnapshot({
    inputRoot: options.inputRoot,
    manifestPath: options.manifestPath,
    planPath: options.planPath,
    domainPolicyPath: options.domainPolicyPath,
    version: options.version,
    retrievedAt: options.retrievedAt,
    fetchEsco: options.fetchEsco,
  });
}

export async function inspectSources(
  options: PipelineOptions,
): Promise<SourceInspection[]> {
  const inspections: SourceInspection[] = [];
  for (const sourceId of selectedSources(options.source)) {
    inspections.push(
      await getAdapter(sourceId).inspect(inputFor(options, sourceId)),
    );
  }
  return inspections;
}

export async function validateSources(
  options: PipelineOptions,
): Promise<SourceValidationResult[]> {
  const validations: SourceValidationResult[] = [];
  for (const sourceId of selectedSources(options.source)) {
    validations.push(
      await getAdapter(sourceId).validate(inputFor(options, sourceId)),
    );
  }
  return validations;
}

export async function ingestSources(
  options: PipelineOptions,
): Promise<Record<string, number>> {
  const validations = await validateSources(options);
  assertValidSources(validations);

  const staged: NormalisedSourceRecord[] = [];
  for (const sourceId of selectedSources(options.source)) {
    const adapter = getAdapter(sourceId);
    for await (const rawRecord of adapter.extract(
      inputFor(options, sourceId),
    )) {
      staged.push(...adapter.normalise(rawRecord));
    }
  }

  if (options.dryRun) {
    return countBy(staged.map((record) => record.recordType));
  }
  return writeStagingRecords(options.outputRoot, staged);
}

export async function reconcile(options: PipelineOptions): Promise<{
  decisions: ReconciliationDecision[];
  candidates: ReturnType<typeof buildCandidateRecords>;
}> {
  const records = await readStagingRecords(options.outputRoot);
  const mappings = await readCuratedMappings(options.mappingDir);
  const occupationPlan = await readOccupationPlan(options.planPath);
  const candidates = buildCandidateRecords(records, occupationPlan);
  const decisions = [
    ...reconcileOccupations(records, candidates, mappings),
    ...reconcileSkills(records, candidates, mappings),
    ...reconcileRelationships(records),
  ].sort((left, right) => left.decisionId.localeCompare(right.decisionId));

  await writeText(
    join(options.outputRoot, "reconciliation", "reconciliation-log.jsonl"),
    `${decisions.map((decision) => stableJson(decision)).join("\n")}\n`,
  );
  await writeReviewReports(
    options.reportRoot,
    options.version,
    decisions,
    records,
  );
  return { decisions, candidates };
}

export async function generateCanonical(options: PipelineOptions) {
  const records = await readStagingRecords(options.outputRoot);
  const mappings = await readCuratedMappings(options.mappingDir);
  const occupationPlan = await readOccupationPlan(options.planPath);
  const candidates = buildCandidateRecords(records, occupationPlan);
  const decisions = [
    ...reconcileOccupations(records, candidates, mappings),
    ...reconcileSkills(records, candidates, mappings),
    ...reconcileRelationships(records),
  ];
  return writeCanonicalCsvs(
    options.canonicalRoot,
    candidates,
    records,
    decisions,
    options.version,
  );
}

export async function validateCanonical(options: PipelineOptions) {
  return validateCanonicalOutput(options.canonicalRoot);
}

export async function reviewTaxonomy(options: PipelineOptions) {
  const validation = await validateCanonical(options);
  if (!validation.ok) {
    throw new Error(`Governance review blocked: ${validation.errors.join("; ")}`);
  }
  return reviewGovernedTaxonomy(options);
}

export async function governanceSummary(options: PipelineOptions) {
  return readGovernanceSummary(options);
}

export async function validateGovernance(options: PipelineOptions) {
  return validateGovernedTaxonomy(options);
}

export async function publishTaxonomy(options: PipelineOptions) {
  const validation = await validateCanonical(options);
  if (!validation.ok) {
    throw new Error(`Publication blocked: ${validation.errors.join("; ")}`);
  }
  return publishGovernedTaxonomy(options);
}

export {
  applyReviewDecisions,
  prepareReviewProgramme,
  publicationReadiness,
  reviewConflicts,
  reviewProgress,
  validateReviewProgramme,
  prepareReviewerOnboarding,
  validateReviewerRegistry,
  preparePilotReview,
  pilotStatus,
};

export async function writeImportPlan(options: PipelineOptions) {
  const validation = await validateCanonical(options);
  const tableFiles = {
    career_families: "career-families.csv",
    taxonomy_occupations: "occupations.csv",
    taxonomy_occupation_aliases: "occupation-aliases.csv",
    taxonomy_skills: "skills.csv",
    taxonomy_skill_aliases: "skill-aliases.csv",
    taxonomy_occupation_skills: "occupation-skills.csv",
    taxonomy_career_transitions: "career-transitions.csv",
    taxonomy_skill_relationships: "skill-relationships.csv",
    taxonomy_source_records: "taxonomy-sources.csv",
  };
  const insertsByTable: Record<string, number> = {};
  for (const [table, file] of Object.entries(tableFiles)) {
    insertsByTable[table] = (
      await readCsv(join(options.canonicalRoot, file))
    ).length;
  }
  const skippedRecords = validation.ok ? 0 : Object.values(insertsByTable).reduce(
    (total, count) => total + count,
    0,
  );
  const plan = {
    dryRun: options.dryRun,
    version: options.version,
    taxonomyVersionStatus: validation.ok ? "candidate_ready" : "blocked",
    insertsByTable,
    updatesByTable: Object.fromEntries(
      Object.keys(tableFiles).map((table) => [table, 0]),
    ),
    unchangedRecords: 0,
    recordsSkipped: skippedRecords,
    conflicts: validation.errors,
    recordsThatWouldBeDeprecated: 0,
    estimatedTransactionSize: Object.values(insertsByTable).reduce(
      (total, count) => total + count,
      0,
    ),
    reviewedRecordOverwriteRisk: false,
    validation,
    action:
      "No database writes are performed by this ingestion pipeline. Reviewed canonical CSV import is a separate controlled step.",
  };
  await writeJson(join(options.outputRoot, "canonical-import-plan.json"), plan);
  return plan;
}

function inputFor(
  options: PipelineOptions,
  sourceId: SourceInput["sourceId"],
): SourceInput {
  return {
    sourceId,
    inputRoot: options.inputRoot,
    outputRoot: options.outputRoot,
    manifestPath: options.manifestPath,
    mappingDir: options.mappingDir,
    version: options.version,
    dryRun: options.dryRun,
  };
}

function countBy(values: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}
