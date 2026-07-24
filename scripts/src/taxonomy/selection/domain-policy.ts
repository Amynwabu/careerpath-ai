import { readFile } from "node:fs/promises";
import { normaliseTitle } from "../normalisation/title-normaliser";
import { textSimilarity } from "../normalisation/text-normaliser";
import type { CsvRow } from "../utils/csv";
import { parseCsv } from "../utils/csv";

export interface DomainSelectionPolicy {
  schema_version: string;
  taxonomy_version: string;
  target_domains: Array<{
    name: string;
    career_family_code: string;
    keywords: string[];
  }>;
  global_keywords: string[];
  exclude_keywords: string[];
  source_limits: {
    uk_soc_max_aliases_per_group: number;
    esco_search_limit_per_query: number;
    esco_max_occupations: number;
    esco_max_skills: number;
    onet_max_occupations: number;
    onet_max_job_titles_per_occupation: number;
    onet_max_software_skills_per_occupation: number;
    onet_min_rating_importance: number;
  };
  matching: {
    minimum_source_match_confidence: number;
    preferred_exact_label_confidence: number;
    preferred_alias_confidence: number;
  };
}

export interface OccupationPlanRow {
  cpxCode: string;
  canonicalTitle: string;
  careerFamily: string;
  careerLevel: string;
  principalUkContext: string;
  expectedExternalSourceMappings: string;
  regulated: boolean;
  humanReviewMandatory: boolean;
  normalisedTitle: string;
}

export interface PlanMatch {
  plan: OccupationPlanRow;
  confidence: number;
  reason: string;
}

export async function readDomainSelectionPolicy(
  path: string,
): Promise<DomainSelectionPolicy> {
  return JSON.parse(await readFile(path, "utf8")) as DomainSelectionPolicy;
}

export async function readOccupationPlan(
  path: string,
): Promise<OccupationPlanRow[]> {
  const rows = parseCsv(await readFile(path, "utf8"));
  return rows.map((row) => occupationPlanRow(row));
}

export function occupationPlanRow(row: CsvRow): OccupationPlanRow {
  const canonicalTitle = row["canonical_title"] ?? "";
  return {
    cpxCode: row["cpx_code"] ?? "",
    canonicalTitle,
    careerFamily: row["career_family"] ?? "",
    careerLevel: row["career_level"] ?? "",
    principalUkContext: row["principal_uk_context"] ?? "",
    expectedExternalSourceMappings:
      row["expected_external_source_mappings"] ?? "",
    regulated: (row["regulated"] ?? "").toLowerCase() === "true",
    humanReviewMandatory:
      (row["human_review_mandatory"] ?? "").toLowerCase() === "true",
    normalisedTitle: normaliseTitle(canonicalTitle).normalised,
  };
}

export function findBestPlanMatch(
  plan: OccupationPlanRow[],
  label: string,
  aliases: string[] = [],
): PlanMatch | undefined {
  const normalisedLabel = normaliseTitle(label).normalised;
  const normalisedAliases = aliases.map((alias) => normaliseTitle(alias).normalised);
  let best: PlanMatch | undefined;

  for (const row of plan) {
    const titleScore = textSimilarity(normalisedLabel, row.normalisedTitle);
    const aliasScore = Math.max(
      0,
      ...normalisedAliases.map((alias) => textSimilarity(alias, row.normalisedTitle)),
    );
    const expectedScore = expectedMappingScore(row, normalisedLabel);
    const score = Math.max(titleScore, aliasScore * 0.96, expectedScore);
    const reason =
      score === expectedScore
        ? "expected_external_source_mapping"
        : score === aliasScore * 0.96
          ? "source_alias"
          : "preferred_label";
    if (!best || score > best.confidence) {
      best = { plan: row, confidence: Number(score.toFixed(4)), reason };
    }
  }

  return best;
}

export function matchesDomainPolicy(
  policy: DomainSelectionPolicy,
  values: string[],
): boolean {
  const haystack = values.join(" ").toLowerCase();
  if (!haystack.trim()) return false;
  if (
    policy.exclude_keywords.some((keyword) =>
      haystack.includes(keyword.toLowerCase()),
    )
  ) {
    return false;
  }
  return (
    policy.global_keywords.some((keyword) =>
      haystack.includes(keyword.toLowerCase()),
    ) ||
    policy.target_domains.some((domain) =>
      domain.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())),
    )
  );
}

function expectedMappingScore(
  row: OccupationPlanRow,
  normalisedLabel: string,
): number {
  const expected = row.expectedExternalSourceMappings.toLowerCase();
  if (!expected) return 0;
  const tokens = expected
    .split("|")
    .map((value) => normaliseTitle(value.replace(/^(uk soc|esco|onet)\s+/i, "")).normalised)
    .filter(Boolean);
  return Math.max(
    0,
    ...tokens.map((token) => textSimilarity(token, normalisedLabel)),
  );
}
