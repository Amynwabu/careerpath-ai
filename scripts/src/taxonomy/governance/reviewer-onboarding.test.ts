import { describe, expect, it } from "vitest";
import {
  hasRolePermission,
  validateFixtureAdjudication,
  validateSeparationOfDuties,
} from "./reviewer-onboarding";
import {
  findDecisionConflicts,
  reviewAuditId,
} from "./review-operations";

describe("reviewer onboarding governance", () => {
  it("enforces role permissions and separation of duties", () => {
    expect(hasRolePermission("taxonomy_editor", "submit_editorial_decision")).toBe(
      true,
    );
    expect(hasRolePermission("technical_validator", "submit_domain_decision")).toBe(
      false,
    );
    const result = validateSeparationOfDuties([
      {
        reviewerId: "fixture-reviewer-a",
        role: "taxonomy_editor",
        entityCode: "CPX-FIXTURE-1",
        action: "submit_editorial_decision",
      },
      {
        reviewerId: "fixture-reviewer-a",
        role: "governance_approver",
        entityCode: "CPX-FIXTURE-1",
        action: "approve_release_gate",
      },
    ]);
    expect(result.ok).toBe(false);
  });

  it("detects synthetic fixture conflicts without touching review data", () => {
    const conflicts = findDecisionConflicts(
      [
        {
          entity_type: "occupation",
          entity_code: "CPX-FIXTURE-1",
          decision: "approved",
        },
        {
          entity_type: "occupation",
          entity_code: "CPX-FIXTURE-1",
          decision: "needs_revision",
        },
      ],
      "fixture-version",
    );
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.entity_code).toBe("CPX-FIXTURE-1");
  });

  it("rejects fixture self-adjudication", () => {
    const result = validateFixtureAdjudication({
      adjudicatorId: "fixture-reviewer-a",
      sourceReviewerIds: ["fixture-reviewer-a", "fixture-reviewer-b"],
      adjudicatorRole: "governance_approver",
      finalDecision: "needs_revision",
    });
    expect(result.ok).toBe(false);
  });

  it("generates idempotent audit identifiers for identical fixture inputs", () => {
    const input = {
      version: "fixture-version",
      file: "fixture-decisions.csv",
      entityCode: "CPX-FIXTURE-1",
      decision: "needs_revision",
      actor: "fixture-reviewer-a",
      reviewedAt: "2000-01-01T00:00:00.000Z",
    };
    expect(reviewAuditId(input)).toBe(reviewAuditId(input));
  });
});
