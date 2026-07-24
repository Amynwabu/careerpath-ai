import { taxonomyRulesVersion } from "../config";
import type {
  CandidateCanonicalRecord,
  CuratedMapping,
  NormalisedSourceRecord,
  ReconciliationDecision,
} from "../types";
import { stableHash } from "../utils/files";
import {
  confidence,
  decisionForConfidence,
  occupationFactors,
} from "./confidence-calculator";
import { candidateForRecord, mappingForRecord } from "./candidate-generator";

export function reconcileOccupations(
  records: NormalisedSourceRecord[],
  candidates: CandidateCanonicalRecord[],
  mappings: CuratedMapping[],
): ReconciliationDecision[] {
  return records
    .filter((record) => record.recordType === "occupation")
    .map((record) => {
      const mapping = mappingForRecord(mappings, record);
      const candidate = mapping
        ? {
            ...candidateForRecord(candidates, record),
            code: mapping.careerpathxCode,
          }
        : candidateForRecord(candidates, record);
      const factors = occupationFactors(record, candidate, mapping);
      const score = confidence(factors);
      const decision = decisionForConfidence(score, Boolean(mapping));
      return {
        decisionId: stableHash({
          entityType: "occupation",
          sourceId: record.sourceId,
          sourceRecordId: record.sourceRecordId,
          candidate: candidate.code,
        }),
        entityType: "occupation",
        sourceId: record.sourceId,
        sourceRecordId: record.sourceRecordId,
        candidateCanonicalId: candidate.code,
        decision,
        confidence: score,
        matchingFactors: factors,
        conflicts: [],
        reviewReason:
          decision === "requires_review"
            ? "Confidence requires human review"
            : "",
        adapterVersion: record.provenance.adapterVersion,
        rulesVersion: taxonomyRulesVersion,
        createdAt: new Date(0).toISOString(),
      } satisfies ReconciliationDecision;
    });
}
