import { join } from "node:path";
import type { NormalisedSourceRecord, ReconciliationDecision } from "../types";
import { writeCsv, writeJson, writeText } from "../utils/files";

const reviewHeaders = [
  "decision_id",
  "entity_type",
  "source_id",
  "source_record_id",
  "preferred_label",
  "candidate_canonical_id",
  "confidence",
  "review_reason",
  "priority",
  "review_status",
  "reviewed_by",
  "reviewed_at",
  "review_notes",
];

export async function writeReviewReports(
  reportRoot: string,
  version: string,
  decisions: ReconciliationDecision[],
  stagedRecords: NormalisedSourceRecord[],
): Promise<void> {
  const dir = join(reportRoot, version);
  const rows = reviewRows(decisions, stagedRecords);

  await writeCsv(
    join(dir, "occupation-reconciliation.csv"),
    rows.filter((row) => row.entity_type === "occupation"),
    reviewHeaders,
  );
  await writeCsv(
    join(dir, "skill-reconciliation.csv"),
    rows.filter((row) => row.entity_type === "skill"),
    reviewHeaders,
  );
  await writeCsv(
    join(dir, "ambiguous-occupation-matches.csv"),
    rows.filter(
      (row) =>
        row.entity_type === "occupation" &&
        row.review_reason.toLowerCase().includes("confidence"),
    ),
    reviewHeaders,
  );
  await writeCsv(
    join(dir, "ambiguous-skill-matches.csv"),
    rows.filter(
      (row) =>
        row.entity_type === "skill" &&
        row.review_reason.toLowerCase().includes("confidence"),
    ),
    reviewHeaders,
  );
  await writeCsv(join(dir, "source-conflicts.csv"), conflictRows(decisions), [
    "decision_id",
    "source_id",
    "source_record_id",
    "conflict",
    "priority",
    "review_status",
    "reviewed_by",
    "reviewed_at",
    "review_notes",
  ]);
  await writeCsv(
    join(dir, "unmapped-source-records.csv"),
    unmappedRows(decisions, stagedRecords),
    [
      "decision_id",
      "entity_type",
      "source_id",
      "source_record_id",
      "preferred_label",
      "decision",
      "review_status",
      "reviewed_by",
      "reviewed_at",
      "review_notes",
    ],
  );
  await writeCsv(
    join(dir, "low-confidence-transitions.csv"),
    rows.filter(
      (row) =>
        row.entity_type === "transition" || Number(row.confidence) < 0.75,
    ),
    reviewHeaders,
  );
  await writeCsv(
    join(dir, "occupation-quality-report.csv"),
    occupationQualityRows(stagedRecords, decisions),
    [
      "source_id",
      "source_record_id",
      "preferred_label",
      "planned_cpx_code",
      "planned_match_confidence",
      "selection_reason",
      "has_provenance",
      "review_status",
      "reviewed_by",
      "reviewed_at",
      "review_notes",
    ],
  );
  await writeCsv(
    join(dir, "professional-body-review.csv"),
    rows.filter((row) => row.source_id === "professional-bodies"),
    reviewHeaders,
  );

  const summary = summaryFor(decisions, stagedRecords);
  await writeJson(join(dir, "source-ingestion-summary.json"), summary);
  await writeText(
    join(dir, "source-ingestion-summary.md"),
    markdownSummary(summary),
  );
  await writeJson(join(dir, "canonical-quality-report.json"), summary.quality);
  await writeText(
    join(dir, "canonical-quality-report.md"),
    markdownQuality(summary),
  );
}

function reviewRows(
  decisions: ReconciliationDecision[],
  stagedRecords: NormalisedSourceRecord[],
) {
  return decisions
    .filter(
      (decision) =>
        decision.decision === "requires_review" ||
        decision.conflicts.length > 0 ||
        decision.entityType === "transition" ||
        decision.entityType === "requirement" ||
        decision.entityType === "relationship",
    )
    .map((decision) => {
      const record = stagedRecords.find(
        (item) =>
          item.sourceId === decision.sourceId &&
          item.sourceRecordId === decision.sourceRecordId,
      );
      return {
        decision_id: decision.decisionId,
        entity_type: decision.entityType,
        source_id: decision.sourceId,
        source_record_id: decision.sourceRecordId,
        preferred_label: record?.preferredLabel ?? "",
        candidate_canonical_id: decision.candidateCanonicalId,
        confidence: String(decision.confidence),
        review_reason: decision.reviewReason || decision.conflicts.join("; "),
        priority: priorityFor(decision),
        review_status: "not_reviewed",
        reviewed_by: "",
        reviewed_at: "",
        review_notes: "",
      };
    });
}

function summaryFor(
  decisions: ReconciliationDecision[],
  stagedRecords: NormalisedSourceRecord[],
) {
  const byDecision = decisions.reduce<Record<string, number>>(
    (counts, decision) => {
      counts[decision.decision] = (counts[decision.decision] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const sourceIds = new Set(stagedRecords.map((record) => record.sourceId));
  const byRecordType = stagedRecords.reduce<Record<string, number>>(
    (counts, record) => {
      counts[record.recordType] = (counts[record.recordType] ?? 0) + 1;
      return counts;
    },
    {},
  );
  return {
    sources: [...sourceIds].sort(),
    recordsDiscovered: stagedRecords.length,
    recordsByType: byRecordType,
    recordsAccepted: decisions.length,
    recordsRejected: byDecision["rejected"] ?? 0,
    recordsRequiringReview: byDecision["requires_review"] ?? 0,
    exactCuratedMatches: byDecision["matched_existing"] ?? 0,
    automaticHighConfidenceMatches: byDecision["merged_sources"] ?? 0,
    newCanonicalCandidates: byDecision["created_new"] ?? 0,
    sourceConflicts: decisions.flatMap((decision) => decision.conflicts).length,
    quality: {
      missingProvenance: stagedRecords.filter((record) => !record.provenance)
        .length,
      lowConfidenceMappings: decisions.filter(
        (decision) => decision.confidence < 0.75,
      ).length,
      relationshipCandidates: decisions.filter((decision) =>
        ["relationship", "requirement", "transition"].includes(
          decision.entityType,
        ),
      ).length,
      deterministicRulesVersion: decisions[0]?.rulesVersion ?? "",
      falseReviewClaims: stagedRecords.filter((record) =>
        ["expert_reviewed", "employer_validated", "published"].includes(
          record.rawAttributes["verification_status"] ?? "",
        ),
      ).length,
    },
  };
}

function markdownSummary(summary: ReturnType<typeof summaryFor>): string {
  return `# Taxonomy Source Ingestion Summary

- Sources: ${summary.sources.join(", ") || "none"}
- Records discovered: ${summary.recordsDiscovered}
- Records by type: ${JSON.stringify(summary.recordsByType)}
- Records accepted for reconciliation: ${summary.recordsAccepted}
- Records rejected: ${summary.recordsRejected}
- Records requiring review: ${summary.recordsRequiringReview}
- Exact curated matches: ${summary.exactCuratedMatches}
- Automatic high-confidence matches: ${summary.automaticHighConfidenceMatches}
- New canonical candidates: ${summary.newCanonicalCandidates}
- Source conflicts: ${summary.sourceConflicts}
`;
}

function markdownQuality(summary: ReturnType<typeof summaryFor>): string {
  return `# Canonical Quality Report

- Missing provenance: ${summary.quality.missingProvenance}
- Low-confidence mappings: ${summary.quality.lowConfidenceMappings}
- Relationship candidates requiring review: ${summary.quality.relationshipCandidates}
- False review claims: ${summary.quality.falseReviewClaims}
- Rules version: ${summary.quality.deterministicRulesVersion}
`;
}

function conflictRows(decisions: ReconciliationDecision[]) {
  return decisions.flatMap((decision) =>
    decision.conflicts.map((conflict) => ({
      decision_id: decision.decisionId,
      source_id: decision.sourceId,
      source_record_id: decision.sourceRecordId,
      conflict,
      priority: priorityFor(decision),
      review_status: "not_reviewed",
      reviewed_by: "",
      reviewed_at: "",
      review_notes: "",
    })),
  );
}

function unmappedRows(
  decisions: ReconciliationDecision[],
  stagedRecords: NormalisedSourceRecord[],
) {
  return decisions
    .filter(
      (decision) =>
        decision.decision === "deferred" || decision.decision === "rejected",
    )
    .map((decision) => {
      const record = stagedRecords.find(
        (item) =>
          item.sourceId === decision.sourceId &&
          item.sourceRecordId === decision.sourceRecordId,
      );
      return {
        decision_id: decision.decisionId,
        entity_type: decision.entityType,
        source_id: decision.sourceId,
        source_record_id: decision.sourceRecordId,
        preferred_label: record?.preferredLabel ?? "",
        decision: decision.decision,
        review_status: "not_reviewed",
        reviewed_by: "",
        reviewed_at: "",
        review_notes: "",
      };
    });
}

function occupationQualityRows(
  records: NormalisedSourceRecord[],
  decisions: ReconciliationDecision[],
) {
  return records
    .filter((record) => record.recordType === "occupation")
    .map((record) => ({
      source_id: record.sourceId,
      source_record_id: record.sourceRecordId,
      preferred_label: record.preferredLabel,
      planned_cpx_code: record.attributes.plannedCpxCode ?? "",
      planned_match_confidence: String(
        record.attributes.plannedMatchConfidence ?? "",
      ),
      selection_reason: record.attributes.selectionReason ?? "",
      has_provenance: record.provenance ? "true" : "false",
      review_status:
        decisions.find(
          (decision) =>
            decision.sourceId === record.sourceId &&
            decision.sourceRecordId === record.sourceRecordId,
        )?.decision === "requires_review"
          ? "needs_review"
          : "not_reviewed",
      reviewed_by: "",
      reviewed_at: "",
      review_notes: "",
    }));
}

function priorityFor(decision: ReconciliationDecision): string {
  if (decision.conflicts.length > 0) return "1_conflicting_external_mapping";
  if (decision.entityType === "occupation" && decision.confidence < 0.75)
    return "2_ambiguous_occupation";
  if (decision.entityType === "skill" && decision.confidence < 0.75)
    return "4_skill_tool_ambiguity";
  if (decision.entityType === "requirement") return "5_low_confidence_requirement";
  if (decision.entityType === "transition") return "6_unsupported_transition";
  return "7_records_without_final_review";
}
