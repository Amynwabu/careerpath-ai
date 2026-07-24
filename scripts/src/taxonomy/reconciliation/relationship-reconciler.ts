import { taxonomyRulesVersion } from "../config";
import type { NormalisedSourceRecord, ReconciliationDecision } from "../types";
import { stableHash } from "../utils/files";

export function reconcileRelationships(
  records: NormalisedSourceRecord[],
): ReconciliationDecision[] {
  return records
    .filter((record) =>
      ["occupation_skill", "skill_relationship", "career_transition"].includes(
        record.recordType,
      ),
    )
    .map((record) => ({
      decisionId: stableHash({
        entityType: record.recordType,
        sourceId: record.sourceId,
        sourceRecordId: record.sourceRecordId,
      }),
      entityType:
        record.recordType === "career_transition"
          ? "transition"
          : record.recordType === "occupation_skill"
            ? "requirement"
            : "relationship",
      sourceId: record.sourceId,
      sourceRecordId: record.sourceRecordId,
      candidateCanonicalId: "",
      decision: "requires_review",
      confidence: 0.75,
      matchingFactors: [
        {
          name: "source_relationship",
          score: 0.75,
          weight: 1,
          detail: "Source relationship transformed to candidate pending review",
        },
      ],
      conflicts: [],
      reviewReason:
        "Relationship candidates require validation before canonical import",
      adapterVersion: record.provenance.adapterVersion,
      rulesVersion: taxonomyRulesVersion,
      createdAt: new Date(0).toISOString(),
    }));
}
