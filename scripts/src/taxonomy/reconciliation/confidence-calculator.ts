import {
  confidenceThresholds,
  occupationScoringWeights,
  skillScoringWeights,
} from "../config";
import type {
  CandidateCanonicalRecord,
  CuratedMapping,
  MatchingFactor,
  NormalisedSourceRecord,
  ReconciliationDecisionType,
} from "../types";
import { textSimilarity } from "../normalisation/text-normaliser";

export function occupationFactors(
  source: NormalisedSourceRecord,
  candidate: CandidateCanonicalRecord,
  mapping: CuratedMapping | undefined,
): MatchingFactor[] {
  return [
    factor(
      "curated_mapping",
      mapping ? 1 : 0,
      occupationScoringWeights.curatedMapping,
      mapping?.mappingStatus ?? "",
    ),
    factor(
      "title_similarity",
      textSimilarity(source.normalisedLabel, candidate.normalisedLabel),
      occupationScoringWeights.titleSimilarity,
      candidate.label,
    ),
    factor(
      "description_similarity",
      textSimilarity(source.description, candidate.description),
      occupationScoringWeights.descriptionSimilarity,
      "",
    ),
    factor(
      "skill_profile_similarity",
      0,
      occupationScoringWeights.skillProfileSimilarity,
      "deferred until skill profiles are generated",
    ),
    factor(
      "family_sector_alignment",
      source.attributes.sector &&
        source.attributes.sector === candidate.familyCode
        ? 1
        : 0,
      occupationScoringWeights.familySectorAlignment,
      source.attributes.sector ?? "",
    ),
    factor(
      "seniority_alignment",
      0.5,
      occupationScoringWeights.seniorityAlignment,
      source.attributes.seniority ?? "",
    ),
    factor(
      "country_language_context",
      source.country || source.language ? 1 : 0,
      occupationScoringWeights.countryLanguageContext,
      `${source.country}/${source.language}`,
    ),
  ];
}

export function skillFactors(
  source: NormalisedSourceRecord,
  candidate: CandidateCanonicalRecord,
  mapping: CuratedMapping | undefined,
): MatchingFactor[] {
  return [
    factor(
      "curated_mapping",
      mapping ? 1 : 0,
      skillScoringWeights.curatedMapping,
      mapping?.mappingStatus ?? "",
    ),
    factor(
      "preferred_label_similarity",
      textSimilarity(source.normalisedLabel, candidate.normalisedLabel),
      skillScoringWeights.preferredLabelSimilarity,
      candidate.label,
    ),
    factor(
      "alias_similarity",
      0,
      skillScoringWeights.aliasSimilarity,
      "candidate aliases are handled in canonical generation",
    ),
    factor(
      "description_similarity",
      textSimilarity(source.description, candidate.description),
      skillScoringWeights.descriptionSimilarity,
      "",
    ),
    factor(
      "parent_skill_alignment",
      0,
      skillScoringWeights.parentSkillAlignment,
      "deferred until hierarchy review",
    ),
    factor(
      "occupation_co_occurrence",
      0,
      skillScoringWeights.occupationCoOccurrence,
      "deferred until occupation-skill generation",
    ),
    factor(
      "category_compatibility",
      source.attributes.skillCategory &&
        source.attributes.skillCategory === candidate.skillCategory
        ? 1
        : 0.5,
      skillScoringWeights.categoryCompatibility,
      source.attributes.skillCategory ?? "",
    ),
  ];
}

export function confidence(factors: MatchingFactor[]): number {
  const weighted = factors.reduce(
    (total, factor) => total + factor.score * factor.weight,
    0,
  );
  const weights = factors.reduce((total, factor) => total + factor.weight, 0);
  if (weights === 0) return 0;
  return Number((weighted / weights).toFixed(4));
}

export function decisionForConfidence(
  value: number,
  hasCuratedMapping: boolean,
): ReconciliationDecisionType {
  if (hasCuratedMapping && value >= confidenceThresholds.review)
    return "matched_existing";
  if (value >= confidenceThresholds.automatic) return "merged_sources";
  if (value >= confidenceThresholds.review) return "requires_review";
  if (value >= confidenceThresholds.possible) return "requires_review";
  return "created_new";
}

function factor(
  name: string,
  score: number,
  weight: number,
  detail: string,
): MatchingFactor {
  return {
    name,
    score: Math.max(0, Math.min(1, Number(score.toFixed(4)))),
    weight,
    detail,
  };
}
