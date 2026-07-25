import { performance } from "node:perf_hooks";
import {
  CareerIntelligenceEngine,
  type PublishedTaxonomySnapshot,
} from "@workspace/career-intelligence";
import {
  buildCareerProfile,
  parseCareerDocument,
  resolveCareerProfile,
} from "@workspace/career-profile";
import { describe, expect, it } from "vitest";
import {
  addEvidenceRecord,
  advisorPlanModel,
  buildActionPlan,
  calculateProgress,
  compareScenarios,
  confirmOccupation,
  createCareerGoal,
  exportCareerPlan,
  orchestrateReadiness,
  planningAiContext,
  prioritizeGaps,
  resolveGoalTarget,
  revisePlan,
  safePlanningLog,
  updateActionStatus,
  validateActionPlan,
  validateCareerGoal,
} from "./planning";

const taxonomy: PublishedTaxonomySnapshot = {
  version: "fixture-2026.1",
  status: "published_local",
  checksum: "synthetic-checksum",
  skills: [
    { code: "SKL-PLAN", name: "Project Planning", aliases: [], category: "transferable", description: "Plan work." },
    { code: "SKL-RISK", name: "Risk Management", aliases: [], category: "technical", description: "Manage risk." },
  ],
  occupations: [
    {
      code: "OCC-COORD",
      title: "Project Coordinator",
      family: "Project Delivery",
      level: "practitioner",
      description: "Coordinates delivery.",
      aliases: [],
      requirements: [{ skillCode: "SKL-PLAN", requirementType: "essential", requiredLevel: 1, weight: 1, evidence: ["fixture:plan"] }],
      minimumExperienceYears: 1,
    },
    {
      code: "OCC-DIRECTOR",
      title: "Programme Director",
      family: "Project Delivery",
      level: "director",
      description: "Directs programmes.",
      aliases: [{ value: "Program Director", exactMatchAllowed: true }],
      requirements: [
        { skillCode: "SKL-PLAN", requirementType: "essential", requiredLevel: 3, weight: 1, evidence: ["fixture:plan"] },
        { skillCode: "SKL-RISK", requirementType: "important", requiredLevel: 2, weight: 0.8, evidence: ["fixture:risk"] },
      ],
      minimumExperienceYears: 8,
      qualificationCodes: ["QUAL-PM"],
    },
  ],
  transitions: [{
    fromOccupationCode: "OCC-COORD",
    toOccupationCode: "OCC-DIRECTOR",
    type: "progression",
    difficulty: 4,
    transferability: 0.7,
    estimatedExperience: "5-8 years",
    evidence: ["fixture:transition"],
    reviewStatus: "approved",
  }],
  learningResources: [],
};

const engine = new CareerIntelligenceEngine({
  async getPublishedSnapshot() {
    return taxonomy;
  },
});

async function fixture() {
  const document = await parseCareerDocument({
    fileName: "synthetic.txt",
    mimeType: "text/plain",
    bytes: new TextEncoder().encode(`Synthetic Person

Professional Summary
Project coordinator with Project Planning experience.

Work Experience
Project Coordinator | Fixture Ltd - January 2021 - January 2024
- Project Planning

Skills
Project Planning`),
  });
  const raw = buildCareerProfile({
    document,
    now: "2026-01-01T00:00:00.000Z",
  });
  const profile = await resolveCareerProfile(raw, engine);
  const goal = createCareerGoal({
    profileId: profile.profileId,
    currentOccupationCode: "OCC-COORD",
    targetOccupationCode: "OCC-DIRECTOR",
    targetOccupationText: "Programme Director",
    timeHorizonMonths: 12,
    goalType: "promotion",
    targetDate: "2027-01-01",
    constraints: {
      weeklyDevelopmentHours: 4,
      budgetAmount: 0,
      caringConstraints: ["Synthetic constraint"],
    },
    now: "2026-01-01T00:00:00.000Z",
  });
  const input = {
    profile,
    goal,
    skillLevels: [{ skillCode: "SKL-PLAN", level: 2 }],
    currentOccupation: confirmOccupation({
      selectedOccupation: { occupationCode: "OCC-COORD" },
      selectedBy: "fixture-user",
      selectedAt: "2026-01-01T00:00:00.000Z",
      selectionReason: "Synthetic fixture confirmation",
    }),
  };
  return { profile, goal, input };
}

describe("career planning", () => {
  it("creates and validates structured goals without penalising constraints", async () => {
    const { goal } = await fixture();
    expect(validateCareerGoal(goal)).toEqual({ valid: true, errors: [], warnings: [] });
    expect(goal.constraints.caringConstraints).toEqual(["Synthetic constraint"]);
  });

  it("rejects invalid horizons and unresolved goal inputs", () => {
    expect(() => createCareerGoal({
      profileId: "fixture",
      timeHorizonMonths: 0,
      goalType: "career_transition",
      now: "2026-01-01T00:00:00.000Z",
    })).toThrow("timeHorizonMonths");
  });

  it("preserves original occupation resolution and confirmation attribution", () => {
    const unresolved = confirmOccupation({ candidates: [{ code: "A" }, { code: "B" }] });
    expect(unresolved.state).toBe("unresolved");
    expect(unresolved.candidateList).toHaveLength(2);
    const confirmed = confirmOccupation({
      originalResolution: { occupationCode: "A" },
      candidates: [{ code: "A" }, { code: "B" }],
      selectedOccupation: { occupationCode: "B" },
      selectedBy: "fixture-user",
      selectedAt: "2026-01-01T00:00:00.000Z",
      selectionReason: "Fixture correction",
    });
    expect(confirmed.originalResolution).toEqual({ occupationCode: "A" });
    expect(confirmed.selectedOccupation?.occupationCode).toBe("B");
  });

  it("resolves target text only through the existing deterministic engine", async () => {
    const { goal } = await fixture();
    const result = await resolveGoalTarget({ ...goal, targetOccupationCode: null }, engine);
    expect(result.occupationCode).toBe("OCC-DIRECTOR");
    expect(result.matchType).toBe("canonical_title");
  });

  it("orchestrates explainable readiness using existing weights", async () => {
    const { input } = await fixture();
    const assessment = await orchestrateReadiness(input, engine, {
      now: "2026-01-02T00:00:00.000Z",
    });
    expect(assessment.skillScore).toBeGreaterThan(0);
    expect(assessment.qualificationScore).toBe(0);
    expect(assessment.readinessExplanation).toContain("professional worth");
    expect(assessment.gaps.every((gap) => gap.reason.length > 0)).toBe(true);
  });

  it("distinguishes evidence gaps and respects limited time horizons", () => {
    const gaps = prioritizeGaps([{
      skillCode: "SKL-FIXTURE",
      requirementType: "essential",
      requiredLevel: 4,
      weight: 1,
      currentLevel: null,
      evidenceStrength: 0.5,
      sourceReferences: ["fixture"],
    }], createCareerGoal({
      profileId: "fixture",
      targetOccupationText: "Fixture",
      timeHorizonMonths: 3,
      goalType: "skill_development",
      now: "2026-01-01T00:00:00.000Z",
    }).constraints, 3);
    expect(gaps[0]).toMatchObject({
      gapState: "unconfirmed_capability",
      priority: "deferred",
    });
  });

  it("builds deterministic actions, milestones, dependencies, and risks", async () => {
    const { input, goal } = await fixture();
    const assessment = await orchestrateReadiness(input, engine, { now: "2026-01-02T00:00:00.000Z" });
    const first = buildActionPlan({ assessment, goal, now: "2026-01-02T00:00:00.000Z" });
    const second = buildActionPlan({ assessment, goal, now: "2026-01-02T00:00:00.000Z" });
    expect(first).toEqual(second);
    expect(first.actions.every((action) => action.targetGapIds.length > 0)).toBe(true);
    expect(first.actions.every((action) => action.estimatedCost === null)).toBe(true);
    expect(validateActionPlan(first).valid).toBe(true);
    expect(first.risks.some((risk) => risk.riskCode === "cost_unknown")).toBe(true);
  });

  it("tracks completion separately from verified evidence and versions edits", async () => {
    const { input, goal } = await fixture();
    const assessment = await orchestrateReadiness(input, engine, { now: "2026-01-02T00:00:00.000Z" });
    const plan = buildActionPlan({ assessment, goal, now: "2026-01-02T00:00:00.000Z" });
    const updated = updateActionStatus(plan, {
      actionId: plan.actions[0]!.actionId,
      status: "completed",
      verificationStatus: "unverified",
      changedBy: "fixture-user",
      changedAt: "2026-01-03T00:00:00.000Z",
      changeReason: "Synthetic completion",
    });
    expect(updated.planVersion).toBe("1.1");
    expect(calculateProgress(updated)).toMatchObject({
      completedActions: 1,
      verifiedActions: 0,
    });
    expect(plan.actions[0]?.status).toBe("not_started");
  });

  it("records metadata-only evidence without upgrading verification", () => {
    const evidence = addEvidenceRecord({
      evidenceType: "project_summary",
      title: "Synthetic programme summary",
      description: "Fixture evidence",
      linkedActionIds: ["fixture-action"],
      linkedSkillCodes: ["SKL-PLAN"],
      verificationStatus: "self_reported",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(evidence.evidenceId).toMatch(/^cpx_evidence_/);
    expect(evidence.verificationStatus).toBe("self_reported");
  });

  it("preserves prior assessment history during reassessment", async () => {
    const { input } = await fixture();
    const prior = await orchestrateReadiness(input, engine, { now: "2026-01-02T00:00:00.000Z" });
    const next = await orchestrateReadiness({
      ...input,
      skillLevels: [
        { skillCode: "SKL-PLAN", level: 3 },
        { skillCode: "SKL-RISK", level: 2 },
      ],
    }, engine, {
      now: "2026-02-01T00:00:00.000Z",
      previousAssessment: prior,
    });
    expect(next.previousAssessmentId).toBe(prior.assessmentId);
    expect(next.scoreChange).toBeGreaterThan(0);
    expect(prior.previousAssessmentId).toBeNull();
  });

  it("compares at most three deterministic target scenarios", async () => {
    const { input } = await fixture();
    const comparison = await compareScenarios([input, input, input], engine);
    expect(comparison).toHaveLength(3);
    expect(comparison[0]?.approvedTransitionAvailable).toBe(true);
    await expect(compareScenarios([input, input, input, input], engine)).rejects.toMatchObject({
      code: "plan_validation_failed",
    });
  });

  it("keeps professional-registration eligibility unavailable without a governed framework", async () => {
    const { input, goal } = await fixture();
    const registrationGoal = {
      ...goal,
      goalType: "professional_registration" as const,
      constraints: {
        ...goal.constraints,
        professionalRegistrationGoal: "Synthetic chartered pathway",
      },
    };
    const assessment = await orchestrateReadiness(
      { ...input, goal: registrationGoal },
      engine,
      { now: "2026-01-02T00:00:00.000Z" },
    );
    const plan = buildActionPlan({
      assessment,
      goal: registrationGoal,
      now: "2026-01-02T00:00:00.000Z",
    });
    expect(plan.frameworkStatus).toBe("unavailable");
    expect(JSON.stringify(plan)).not.toContain("eligible");
    expect(JSON.stringify(plan)).not.toContain("endorsed");
  });

  it("produces redacted advisor, JSON, Markdown, and printable HTML exports", async () => {
    const { input, goal } = await fixture();
    const assessment = await orchestrateReadiness(input, engine, { now: "2026-01-02T00:00:00.000Z" });
    const plan = buildActionPlan({ assessment, goal, now: "2026-01-02T00:00:00.000Z" });
    const advisor = advisorPlanModel({ plan, assessment, goal });
    expect(advisor.plan.constraints.caringConstraints).toEqual([]);
    expect(advisor.plan.constraints.salaryAspiration).toBeNull();
    expect(exportCareerPlan({ plan, assessment, goal, format: "json" }).mediaType).toBe("application/json");
    expect(exportCareerPlan({ plan, assessment, goal, format: "markdown" }).content).toContain("# Career action plan");
    expect(exportCareerPlan({ plan, assessment, goal, format: "html" }).content).toContain("<!doctype html>");
  });

  it("keeps deterministic outputs immutable in AI explanation context", async () => {
    const { input, goal } = await fixture();
    const assessment = await orchestrateReadiness(input, engine, { now: "2026-01-02T00:00:00.000Z" });
    const plan = buildActionPlan({ assessment, goal, now: "2026-01-02T00:00:00.000Z" });
    const context = planningAiContext({ goal, assessment, plan });
    expect(context.immutableDeterministicFields).toContain("readiness scores");
  });

  it("fails closed for unpublished taxonomy and unresolved occupations", async () => {
    const { input } = await fixture();
    const unpublished = new CareerIntelligenceEngine({
      async getPublishedSnapshot() {
        return { ...taxonomy, status: "draft" as never };
      },
    });
    await expect(orchestrateReadiness(input, unpublished)).rejects.toThrow("requires a published taxonomy");
    await expect(orchestrateReadiness({
      ...input,
      goal: { ...input.goal, targetOccupationCode: null },
    }, engine)).rejects.toMatchObject({ code: "target_occupation_unresolved" });
  });

  it("generates only non-sensitive safe logs", async () => {
    const { input, goal } = await fixture();
    const assessment = await orchestrateReadiness(input, engine, { now: "2026-01-02T00:00:00.000Z" });
    const plan = buildActionPlan({ assessment, goal, now: "2026-01-02T00:00:00.000Z" });
    const log = safePlanningLog({
      requestId: "fixture-request",
      plan,
      assessment,
      durationMs: 12.4,
      validationResult: "valid",
    });
    expect(JSON.stringify(log)).not.toContain("Synthetic Person");
    expect(log.actionCount).toBe(plan.actions.length);
  });

  it("meets measured synthetic performance targets", async () => {
    const { input, goal } = await fixture();
    let started = performance.now();
    validateCareerGoal(goal);
    expect(performance.now() - started).toBeLessThan(50);

    started = performance.now();
    const assessment = await orchestrateReadiness(input, engine, { now: "2026-01-02T00:00:00.000Z" });
    expect(performance.now() - started).toBeLessThan(250);

    started = performance.now();
    const plan = buildActionPlan({ assessment, goal, now: "2026-01-02T00:00:00.000Z" });
    expect(performance.now() - started).toBeLessThan(400);

    started = performance.now();
    await compareScenarios([input, input, input], engine);
    expect(performance.now() - started).toBeLessThan(750);

    started = performance.now();
    exportCareerPlan({ plan, assessment, goal, format: "json" });
    expect(performance.now() - started).toBeLessThan(150);
  });

  it("preserves immutable versions for arbitrary attributed revisions", async () => {
    const { input, goal } = await fixture();
    const assessment = await orchestrateReadiness(input, engine, { now: "2026-01-02T00:00:00.000Z" });
    const plan = buildActionPlan({ assessment, goal, now: "2026-01-02T00:00:00.000Z" });
    const revision = revisePlan(plan, {
      changedBy: "fixture-advisor",
      changedAt: "2026-01-03T00:00:00.000Z",
      changeReason: "Synthetic sequencing change",
      mutate(copy) {
        copy.status = "active";
      },
    });
    expect(plan.status).toBe("draft");
    expect(revision).toMatchObject({ status: "active", planVersion: "1.1" });
  });

  it("rejects impossible cyclic action dependencies", async () => {
    const { input, goal } = await fixture();
    const assessment = await orchestrateReadiness(input, engine, {
      now: "2026-01-02T00:00:00.000Z",
    });
    const plan = buildActionPlan({
      assessment,
      goal,
      now: "2026-01-02T00:00:00.000Z",
    });
    if (plan.actions.length < 2) throw new Error("Fixture needs two actions.");
    plan.actions[0]!.dependencies = [plan.actions[1]!.actionId];
    plan.actions[1]!.dependencies = [plan.actions[0]!.actionId];
    expect(validateActionPlan(plan)).toMatchObject({
      valid: false,
      errors: ["Action dependency graph contains a cycle."],
    });
  });

  it.each([
    ["senior project manager", "promotion"],
    ["software engineer", "career_change"],
    ["graduate", "career_transition"],
    ["academic moving to industry", "career_change"],
    ["career changer", "career_change"],
    ["return-to-work candidate", "return_to_work"],
    ["strong skills with weak CV evidence", "skill_development"],
    ["qualified candidate with limited experience", "career_transition"],
    ["limited weekly time", "specialisation"],
    ["no training budget", "skill_development"],
    ["professional registration candidate", "professional_registration"],
  ] as const)("accepts the synthetic %s goal scenario", (label, goalType) => {
    const goal = createCareerGoal({
      profileId: `fixture-${label}`,
      targetOccupationText: "Synthetic unresolved target",
      timeHorizonMonths: 12,
      goalType,
      constraints: {
        weeklyDevelopmentHours: label === "limited weekly time" ? 1 : null,
        budgetAmount: label === "no training budget" ? 0 : null,
      },
      now: "2026-01-01T00:00:00.000Z",
    });
    expect(validateCareerGoal(goal).valid).toBe(true);
    expect(goal.targetOccupationCode).toBeNull();
  });
});
