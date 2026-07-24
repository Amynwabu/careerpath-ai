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
  skillFactors,
} from "./confidence-calculator";
import { candidateForRecord, mappingForRecord } from "./candidate-generator";

export function reconcileSkills(
  records: NormalisedSourceRecord[],
  candidates: CandidateCanonicalRecord[],
  mappings: CuratedMapping[],
): ReconciliationDecision[] {
  return records
    .filter(
      (record) =>
        record.recordType === "skill" || record.recordType === "competency",
    )
    .map((record) => {
      const mapping = mappingForRecord(mappings, record);
      const candidate = mapping
        ? {
            ...candidateForRecord(candidates, record),
            code: mapping.careerpathxCode,
          }
        : candidateForRecord(candidates, record);
      const factors = skillFactors(record, candidate, mapping);
      const score = confidence(factors);
      const decision = decisionForConfidence(score, Boolean(mapping));
      return {
        decisionId: stableHash({
          entityType: "skill",
          sourceId: record.sourceId,
          sourceRecordId: record.sourceRecordId,
          candidate: candidate.code,
        }),
        entityType: "skill",
        sourceId: record.sourceId,
        sourceRecordId: record.sourceRecordId,
        candidateCanonicalId: candidate.code,
        decision,
        confidence: score,
        matchingFactors: factors,
        conflicts:
          record.recordType === "competency" && record.description.includes(";")
            ? ["Competency may map to multiple canonical skills"]
            : [],
        reviewReason:
          decision === "requires_review"
            ? "Confidence requires human review"
            : record.recordType === "competency" &&
                record.description.includes(";")
              ? "Competency statement appears to contain multiple capabilities"
              : "",
        adapterVersion: record.provenance.adapterVersion,
        rulesVersion: taxonomyRulesVersion,
        createdAt: new Date(0).toISOString(),
      } satisfies ReconciliationDecision;
    });
}
