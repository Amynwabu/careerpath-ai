import { join } from "node:path";
import type { PipelineOptions } from "../pipeline";
import { fileExists, readCsv, writeCsv, writeJson } from "../utils/files";

export const reviewerRoles = [
  "taxonomy_editor",
  "domain_reviewer",
  "technical_validator",
  "governance_approver",
] as const;

export type ReviewerRole = (typeof reviewerRoles)[number];

export const rolePermissions: Record<ReviewerRole, string[]> = {
  taxonomy_editor: [
    "review_occupation_wording",
    "review_skill_wording",
    "review_alias",
    "propose_merge",
    "save_draft",
    "submit_editorial_decision",
  ],
  domain_reviewer: [
    "review_occupation_scope",
    "review_skill_profile",
    "review_transition",
    "review_regulated_status",
    "save_draft",
    "submit_domain_decision",
  ],
  technical_validator: [
    "validate_codes",
    "validate_references",
    "validate_checksums",
    "validate_decision_pack",
    "submit_technical_validation",
  ],
  governance_approver: [
    "validate_reviewer_evidence",
    "adjudicate_conflict",
    "approve_release_gate",
    "authorise_reviewer",
  ],
};

export interface DutyAssignment {
  reviewerId: string;
  role: ReviewerRole;
  entityCode: string;
  action: string;
  sourceReviewerId?: string;
}

export function hasRolePermission(role: ReviewerRole, action: string) {
  return rolePermissions[role].includes(action);
}

export function validateSeparationOfDuties(assignments: DutyAssignment[]) {
  const errors: string[] = [];
  for (const assignment of assignments) {
    if (!hasRolePermission(assignment.role, assignment.action)) {
      errors.push(
        `${assignment.reviewerId} lacks ${assignment.action} permission as ${assignment.role}`,
      );
    }
    if (
      assignment.action === "adjudicate_conflict" &&
      assignment.sourceReviewerId === assignment.reviewerId
    ) {
      errors.push(
        `${assignment.reviewerId} cannot adjudicate their own decision`,
      );
    }
  }
  const byEntity = new Map<string, DutyAssignment[]>();
  for (const assignment of assignments) {
    const values = byEntity.get(assignment.entityCode) ?? [];
    values.push(assignment);
    byEntity.set(assignment.entityCode, values);
  }
  for (const [entityCode, entityAssignments] of byEntity) {
    const contentReviewers = new Set(
      entityAssignments
        .filter((item) =>
          [
            "submit_editorial_decision",
            "submit_domain_decision",
          ].includes(item.action),
        )
        .map((item) => item.reviewerId),
    );
    const approvers = entityAssignments
      .filter((item) =>
        ["approve_release_gate", "adjudicate_conflict"].includes(item.action),
      )
      .map((item) => item.reviewerId);
    for (const approver of approvers) {
      if (contentReviewers.has(approver)) {
        errors.push(
          `${approver} cannot review and governance-approve ${entityCode}`,
        );
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

export function validateFixtureAdjudication(input: {
  adjudicatorId: string;
  sourceReviewerIds: string[];
  adjudicatorRole: ReviewerRole;
  finalDecision: string;
}) {
  const errors: string[] = [];
  if (input.adjudicatorRole !== "governance_approver") {
    errors.push("Only a governance approver may adjudicate a conflict");
  }
  if (input.sourceReviewerIds.includes(input.adjudicatorId)) {
    errors.push("An adjudicator cannot participate in the source conflict");
  }
  if (!finalDecisionsForAdjudication.has(input.finalDecision)) {
    errors.push("Invalid final adjudication decision");
  }
  return { ok: errors.length === 0, errors };
}

const finalDecisionsForAdjudication = new Set([
  "approved",
  "rejected",
  "needs_revision",
  "deferred_under_release_policy",
]);

export async function prepareReviewerOnboarding(options: PipelineOptions) {
  const root = join(options.canonicalRoot, "..", "reviews");
  const requestsPath = join(root, "reviewer-onboarding-requests.csv");
  if (!(await fileExists(requestsPath))) {
    await writeCsv(requestsPath, [], [
      "request_id",
      "reviewer_id",
      "reviewer_name",
      "requested_role",
      "domain_expertise",
      "organisation",
      "authorised_versions",
      "requested_by",
      "requested_at",
      "approved_by",
      "approved_at",
      "status",
      "notes",
    ]);
  }
  await writeJson(join(root, "role-permissions.json"), {
    roles: rolePermissions,
    separationOfDuties: [
      "A reviewer cannot governance-approve their own content decision.",
      "A reviewer cannot adjudicate a conflict containing their own decision.",
      "Technical validation cannot substitute for taxonomy or domain review.",
      "Reviewer authorisation requires a governance approver distinct from the applicant.",
    ],
    onboardingStatus: "awaiting_real_authorised_reviewers",
  });
  return {
    requestsPath,
    configuredReviewerIdentities: 0,
    status: "prepared_unexecuted",
  };
}

export async function validateReviewerRegistry(options: PipelineOptions) {
  const root = join(options.canonicalRoot, "..", "reviews");
  const registry = await readCsv(join(root, "reviewers.csv"));
  const requests = await readCsv(join(root, "reviewer-onboarding-requests.csv"));
  const errors: string[] = [];
  const ids = new Set<string>();
  for (const [index, row] of registry.entries()) {
    const id = row["reviewer_id"] ?? "";
    if (!id) errors.push(`reviewers.csv:${index + 2} is missing reviewer_id`);
    if (ids.has(id)) errors.push(`Duplicate reviewer_id: ${id}`);
    ids.add(id);
    if (!reviewerRoles.includes(row["reviewer_role"] as ReviewerRole)) {
      errors.push(`reviewers.csv:${index + 2} has an invalid reviewer_role`);
    }
    if (
      row["active"] === "true" &&
      (!row["approved_by"] ||
        !row["approved_at"] ||
        !row["authorised_versions"])
    ) {
      errors.push(
        `reviewers.csv:${index + 2} active reviewer lacks authorisation evidence`,
      );
    }
  }
  for (const [index, row] of requests.entries()) {
    if (!reviewerRoles.includes(row["requested_role"] as ReviewerRole)) {
      errors.push(
        `reviewer-onboarding-requests.csv:${index + 2} has an invalid requested_role`,
      );
    }
    if (
      row["status"] === "approved" &&
      (!row["approved_by"] || !row["approved_at"])
    ) {
      errors.push(
        `reviewer-onboarding-requests.csv:${index + 2} approval lacks governance evidence`,
      );
    }
    if (row["reviewer_id"] && row["reviewer_id"] === row["approved_by"]) {
      errors.push(
        `reviewer-onboarding-requests.csv:${index + 2} applicant cannot approve themselves`,
      );
    }
  }
  return {
    ok: errors.length === 0,
    errors,
    registeredReviewers: registry.length,
    activeReviewers: registry.filter((row) => row["active"] === "true").length,
    pendingRequests: requests.filter((row) => row["status"] === "pending").length,
    status:
      registry.some((row) => row["active"] === "true")
        ? "configured"
        : "prepared_unexecuted",
  };
}
