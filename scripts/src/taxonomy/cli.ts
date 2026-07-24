import { isAbsolute, resolve, sep } from "node:path";
import { defaultTaxonomyVersion } from "./config";
import {
  defaultPipelineOptions,
  applyReviewDecisions,
  generateCanonical,
  governanceSummary,
  ingestSources,
  inspectSources,
  publishTaxonomy,
  prepareReviewProgramme,
  prepareReviewerOnboarding,
  preparePilotReview,
  prepareSources,
  reconcile,
  reviewTaxonomy,
  reviewConflicts,
  reviewProgress,
  pilotStatus,
  validateCanonical,
  validateGovernance,
  validateReviewProgramme,
  validateReviewerRegistry,
  publicationReadiness,
  validateSources,
  writeImportPlan,
  type PipelineOptions,
} from "./pipeline";
import type { TaxonomySourceSelection } from "./types";

const command = process.argv[2] ?? "help";
const args = parseArgs(process.argv.slice(3));
const workspaceRoot = process.cwd().endsWith(`${sep}scripts`)
  ? resolve(process.cwd(), "..")
  : process.cwd();

try {
  const options = defaultPipelineOptions({
    source: sourceArg(args["source"]),
    inputRoot: workspacePath(
      stringArg(args["input-dir"]) ?? ".local-data/taxonomy-sources",
    ),
    outputRoot: workspacePath(
      stringArg(args["output-dir"]) ?? "datasets/career-taxonomy/generated",
    ),
    canonicalRoot:
      workspacePath(
        stringArg(args["canonical-dir"]) ??
          "datasets/career-taxonomy/canonical",
      ),
    reportRoot: workspacePath(stringArg(args["report-dir"]) ?? "reports/taxonomy"),
    mappingDir: workspacePath(
      stringArg(args["mapping-dir"]) ?? "datasets/career-taxonomy/mappings",
    ),
    manifestPath: workspacePath(
      stringArg(args["manifest"]) ??
        "datasets/career-taxonomy/sources/source-manifest.json",
    ),
    planPath: workspacePath(
      stringArg(args["plan"]) ??
        "datasets/career-taxonomy/plan/occupation-plan.csv",
    ),
    domainPolicyPath: workspacePath(
      stringArg(args["domain-policy"]) ??
        "datasets/career-taxonomy/config/domain-selection.json",
    ),
    version: stringArg(args["version"]) ?? defaultTaxonomyVersion,
    dryRun: Boolean(args["dry-run"]),
    fetchEsco: Boolean(args["fetch-esco"]),
    retrievedAt:
      stringArg(args["retrieved-at"]) ?? "2026-07-24T00:00:00.000Z",
  });

  await run(command, options);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

async function run(
  commandName: string,
  options: PipelineOptions,
): Promise<void> {
  switch (commandName) {
    case "source:prepare":
    case "prepare-source":
      console.log(JSON.stringify(await prepareSources(options), null, 2));
      return;
    case "source:inspect":
    case "inspect":
      console.log(JSON.stringify(await inspectSources(options), null, 2));
      return;
    case "source:validate":
    case "validate-source":
      console.log(JSON.stringify(await validateSources(options), null, 2));
      return;
    case "ingest":
      console.log(JSON.stringify(await ingestSources(options), null, 2));
      return;
    case "reconcile":
      console.log(JSON.stringify(await reconcile(options), null, 2));
      return;
    case "review-report":
      await reconcile(options);
      console.log(`Review reports written for taxonomy ${options.version}.`);
      return;
    case "generate-canonical":
      console.log(JSON.stringify(await generateCanonical(options), null, 2));
      return;
    case "validate":
      console.log(JSON.stringify(await validateCanonical(options), null, 2));
      return;
    case "import":
      console.log(JSON.stringify(await writeImportPlan(options), null, 2));
      return;
    case "review":
      console.log(JSON.stringify(await reviewTaxonomy(options), null, 2));
      return;
    case "review:summary":
      console.log(JSON.stringify(await governanceSummary(options), null, 2));
      return;
    case "review:occupations":
    case "review:skills":
    case "review:aliases":
    case "review:relationships":
    case "review:transitions":
      console.log(JSON.stringify(await reviewTaxonomy(options), null, 2));
      return;
    case "governance:validate":
      console.log(JSON.stringify(await validateGovernance(options), null, 2));
      return;
    case "review:prepare":
      console.log(JSON.stringify(await prepareReviewProgramme(options), null, 2));
      return;
    case "review:progress":
      console.log(JSON.stringify(await reviewProgress(options), null, 2));
      return;
    case "review:validate":
      console.log(JSON.stringify(await validateReviewProgramme(options), null, 2));
      return;
    case "review:apply":
      console.log(JSON.stringify(await applyReviewDecisions(options), null, 2));
      return;
    case "review:conflicts":
      console.log(JSON.stringify(await reviewConflicts(options), null, 2));
      return;
    case "review:readiness":
      console.log(JSON.stringify(await publicationReadiness(options), null, 2));
      return;
    case "review:onboarding:prepare":
      console.log(JSON.stringify(await prepareReviewerOnboarding(options), null, 2));
      return;
    case "review:onboarding:validate":
      console.log(JSON.stringify(await validateReviewerRegistry(options), null, 2));
      return;
    case "review:pilot:prepare":
      console.log(JSON.stringify(await preparePilotReview(options), null, 2));
      return;
    case "review:pilot:status":
      console.log(JSON.stringify(await pilotStatus(options), null, 2));
      return;
    case "publish":
      console.log(JSON.stringify(await publishTaxonomy(options), null, 2));
      return;
    default:
      console.log(`CareerPathX taxonomy pipeline

Commands:
  source:inspect --source=uk-soc|esco|onet|professional-bodies|all
  source:prepare --fetch-esco --retrieved-at=2026-07-24T00:00:00.000Z
  source:validate --source=all
  ingest --source=all --dry-run
  reconcile --version=2026.1
  review-report --version=2026.1
  generate-canonical --version=2026.1
  validate --version=2026.1
  import --version=2026.1 --dry-run
  review --version=2026.1
  review:summary --version=2026.1
  review:occupations|review:skills|review:aliases --version=2026.1
  review:relationships|review:transitions --version=2026.1
  governance:validate --version=2026.1
  review:prepare|review:progress|review:validate --version=2026.1
  review:apply|review:conflicts|review:readiness --version=2026.1
  review:onboarding:prepare|review:onboarding:validate --version=2026.1
  review:pilot:prepare|review:pilot:status --version=2026.1
  publish --version=2026.1

Options:
  --input-dir=.local-data/taxonomy-sources
  --output-dir=datasets/career-taxonomy/generated
  --canonical-dir=datasets/career-taxonomy/canonical
  --report-dir=reports/taxonomy
  --mapping-dir=datasets/career-taxonomy/mappings
  --plan=datasets/career-taxonomy/plan/occupation-plan.csv
  --domain-policy=datasets/career-taxonomy/config/domain-selection.json
`);
  }
}

function parseArgs(values: string[]): Record<string, string | boolean> {
  const parsed: Record<string, string | boolean> = {};
  for (const value of values) {
    if (!value.startsWith("--")) continue;
    const [key, raw] = value.slice(2).split("=", 2);
    parsed[key!] = raw ?? true;
  }
  return parsed;
}

function sourceArg(
  value: string | boolean | undefined,
): TaxonomySourceSelection {
  if (
    value === "uk-soc" ||
    value === "esco" ||
    value === "onet" ||
    value === "professional-bodies" ||
    value === "all"
  ) {
    return value;
  }
  return "all";
}

function stringArg(value: string | boolean | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function workspacePath(value: string): string {
  return isAbsolute(value) ? value : resolve(workspaceRoot, value);
}
