import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { TaxonomySourceId, TaxonomySourceSelection } from "./types";

export const taxonomyRulesVersion = "2026.1.0";
export const defaultTaxonomyVersion = "2026.1";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const repositoryPath = (...segments: string[]) =>
  resolve(repositoryRoot, ...segments);

export const defaultInputRoot = repositoryPath(".local-data/taxonomy-sources");
export const defaultOutputRoot = repositoryPath(
  "datasets/career-taxonomy/generated",
);
export const defaultCanonicalRoot = repositoryPath(
  "datasets/career-taxonomy/canonical",
);
export const defaultReportRoot = repositoryPath("reports/taxonomy");
export const defaultMappingDir = repositoryPath(
  "datasets/career-taxonomy/mappings",
);
export const defaultPlanPath = repositoryPath(
  "datasets/career-taxonomy/plan/occupation-plan.csv",
);
export const defaultDomainPolicyPath = repositoryPath(
  "datasets/career-taxonomy/config/domain-selection.json",
);
export const defaultManifestPath = repositoryPath(
  "datasets/career-taxonomy/sources/source-manifest.json",
);

export const sourceConfigs: Record<
  TaxonomySourceId,
  {
    sourceName: string;
    sourceType: "uk_soc" | "esco" | "onet" | "professional_body";
    publisher: string;
    sourceUrl: string;
    country: string;
    language: string;
    expectedFiles: string[];
  }
> = {
  "uk-soc": {
    sourceName: "UK Standard Occupational Classification 2020",
    sourceType: "uk_soc",
    publisher: "UK Office for National Statistics",
    sourceUrl:
      "https://www.ons.gov.uk/methodology/classificationsandstandards/standardoccupationalclassificationsoc/soc2020",
    country: "GB",
    language: "en",
    expectedFiles: ["uk-soc/occupations.csv"],
  },
  esco: {
    sourceName: "ESCO occupations and skills",
    sourceType: "esco",
    publisher: "European Commission",
    sourceUrl: "https://esco.ec.europa.eu/en/use-esco/download",
    country: "EU",
    language: "en",
    expectedFiles: [
      "esco/occupations.csv",
      "esco/skills.csv",
      "esco/occupation-skills.csv",
    ],
  },
  onet: {
    sourceName: "O*NET database",
    sourceType: "onet",
    publisher:
      "U.S. Department of Labor, Employment and Training Administration",
    sourceUrl: "https://www.onetcenter.org/database.html",
    country: "US",
    language: "en",
    expectedFiles: [
      "onet/occupations.csv",
      "onet/alternate-titles.csv",
      "onet/skills.csv",
      "onet/occupation-skills.csv",
      "onet/related-occupations.csv",
      "onet/skill-relationships.csv",
    ],
  },
  "professional-bodies": {
    sourceName: "Controlled professional-body competency imports",
    sourceType: "professional_body",
    publisher: "CareerPathX curated professional-body source folders",
    sourceUrl: "local-only",
    country: "GB",
    language: "en",
    expectedFiles: ["professional-bodies/sources.json"],
  },
};

export const occupationScoringWeights = {
  curatedMapping: 0.35,
  titleSimilarity: 0.2,
  descriptionSimilarity: 0.15,
  skillProfileSimilarity: 0.15,
  familySectorAlignment: 0.07,
  seniorityAlignment: 0.05,
  countryLanguageContext: 0.03,
};

export const skillScoringWeights = {
  curatedMapping: 0.35,
  preferredLabelSimilarity: 0.2,
  aliasSimilarity: 0.15,
  descriptionSimilarity: 0.1,
  parentSkillAlignment: 0.1,
  occupationCoOccurrence: 0.05,
  categoryCompatibility: 0.05,
};

export const confidenceThresholds = {
  automatic: 0.9,
  review: 0.75,
  possible: 0.5,
};

export function selectedSources(
  selection: TaxonomySourceSelection,
): TaxonomySourceId[] {
  if (selection === "all")
    return Object.keys(sourceConfigs) as TaxonomySourceId[];
  return [selection];
}
