import { createHash } from "node:crypto";
import type { CareerIntelligenceEngine } from "@workspace/career-intelligence";
import type {
  CareerActionPlan,
  CareerGoal,
  EvidenceRecord,
  OccupationConfirmation,
  PlanAction,
  PlanMilestone,
  PlanRisk,
  PlanningConstraints,
  PlanningGap,
  PlanningInput,
  PlanningStrength,
  ReadinessAssessment,
} from "./types";

const goalTypes = new Set<CareerGoal["goalType"]>([
  "career_transition", "promotion", "specialisation", "career_change",
  "return_to_work", "professional_registration", "skill_development",
  "leadership_progression", "consulting", "entrepreneurship",
]);

export function createCareerGoal(input: {
  profileId: string;
  currentOccupationCode?: string | null;
  targetOccupationCode?: string | null;
  targetOccupationText?: string | null;
  targetCareerFamily?: string | null;
  targetLevel?: string | null;
  targetDate?: string | null;
  timeHorizonMonths: number;
  goalType: CareerGoal["goalType"];
  motivation?: string | null;
  constraints?: Partial<PlanningConstraints>;
  preferences?: string[];
  now?: string;
}): CareerGoal {
  const now = input.now ?? new Date().toISOString();
  const goal: CareerGoal = {
    goalVersion: "1.0",
    goalId: `cpx_goal_${hash(`${input.profileId}:${input.targetOccupationCode ?? input.targetOccupationText}:${input.goalType}`, 16)}`,
    profileId: input.profileId,
    currentOccupationCode: input.currentOccupationCode ?? null,
    targetOccupationCode: input.targetOccupationCode ?? null,
    targetOccupationText: input.targetOccupationText ?? null,
    targetCareerFamily: input.targetCareerFamily ?? null,
    targetLevel: input.targetLevel ?? null,
    targetDate: input.targetDate ?? null,
    timeHorizonMonths: input.timeHorizonMonths,
    goalType: input.goalType,
    motivation: input.motivation ?? null,
    constraints: normalizeConstraints(input.constraints),
    preferences: input.preferences ?? [],
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
  const validation = validateCareerGoal(goal);
  if (!validation.valid) throw planningError("goal_invalid", validation.errors.join(" "));
  return goal;
}

export function validateCareerGoal(goal: CareerGoal) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!goal.profileId) errors.push("profileId is required.");
  if (!goalTypes.has(goal.goalType)) errors.push("goalType is unsupported.");
  if (!Number.isInteger(goal.timeHorizonMonths) || goal.timeHorizonMonths < 1 || goal.timeHorizonMonths > 60)
    errors.push("timeHorizonMonths must be an integer from 1 to 60.");
  if (!goal.targetOccupationCode && !goal.targetOccupationText && !goal.targetCareerFamily)
    errors.push("A target occupation or career family is required.");
  if (goal.constraints.weeklyDevelopmentHours !== null && (goal.constraints.weeklyDevelopmentHours < 0 || goal.constraints.weeklyDevelopmentHours > 168))
    errors.push("weeklyDevelopmentHours must be between 0 and 168.");
  if (goal.constraints.budgetAmount !== null && goal.constraints.budgetAmount < 0)
    errors.push("budgetAmount cannot be negative.");
  if (goal.constraints.salaryAspiration !== null && goal.constraints.salaryAspiration < 0)
    errors.push("salaryAspiration cannot be negative.");
  if (!goal.targetOccupationCode)
    warnings.push("Target occupation remains unresolved; readiness cannot run.");
  return { valid: errors.length === 0, errors, warnings };
}

export function confirmOccupation(input: {
  originalResolution?: unknown;
  candidates?: unknown[];
  selectedOccupation?: { occupationCode: string; title?: string } | null;
  selectedBy?: string | null;
  selectedAt?: string | null;
  selectionReason?: string | null;
  confirmationType?: "user_confirmed" | "advisor_confirmed";
}): OccupationConfirmation {
  if (!input.selectedOccupation) {
    return {
      state: "unresolved",
      originalResolution: input.originalResolution ?? null,
      candidateList: input.candidates ?? [],
      selectedOccupation: null,
      selectedBy: null,
      selectedAt: null,
      selectionReason: null,
    };
  }
  if (!input.selectedBy || !input.selectedAt || !input.selectionReason)
    throw planningError("occupation_confirmation_invalid", "Selection attribution, time, and reason are required.");
  return {
    state: input.confirmationType ?? "user_confirmed",
    originalResolution: input.originalResolution ?? null,
    candidateList: input.candidates ?? [],
    selectedOccupation: input.selectedOccupation,
    selectedBy: input.selectedBy,
    selectedAt: input.selectedAt,
    selectionReason: input.selectionReason,
  };
}

export async function resolveGoalTarget(
  goal: CareerGoal,
  engine: CareerIntelligenceEngine,
) {
  if (goal.targetOccupationCode) {
    return engine.resolveOccupation({
      existingOccupationCode: goal.targetOccupationCode,
    });
  }
  const resolution = await engine.resolveOccupation({
    jobTitle: goal.targetOccupationText ?? undefined,
    text: [goal.targetCareerFamily, goal.targetLevel].filter(Boolean).join(" "),
  });
  return {
    ...resolution,
    resolutionStatus:
      resolution.occupationCode === null ? "target_unresolved" : "resolved",
  };
}

export async function orchestrateReadiness(
  input: PlanningInput,
  engine: CareerIntelligenceEngine,
  options: {
    now?: string;
    previousAssessment?: ReadinessAssessment;
  } = {},
): Promise<ReadinessAssessment> {
  const profileValidation = input.profile.profileId && input.profile.profileVersion === "1.0";
  if (!profileValidation) throw planningError("profile_invalid", "A valid CareerProfile is required.");
  const currentCode =
    input.currentOccupation?.selectedOccupation?.occupationCode ??
    input.goal.currentOccupationCode;
  if (!currentCode)
    throw planningError("current_occupation_unresolved", "Current occupation must be confirmed.");
  if (!input.goal.targetOccupationCode)
    throw planningError("target_occupation_unresolved", "Target occupation must be resolved.");
  const skills = input.skillLevels ??
    input.profile.resolvedSkills.map((skill) => ({ skillCode: skill.skillCode, level: 1 }));
  if (!skills.length) throw planningError("skills_unavailable", "Resolved canonical skills are required.");

  const [readiness, gap] = await Promise.all([
    engine.readiness({
      currentOccupationCode: currentCode,
      targetOccupationCode: input.goal.targetOccupationCode,
      skills,
      experienceYears: experienceYears(input.profile.employment),
      qualificationCodes: input.qualificationCodes,
    }),
    engine.gapAnalysis({
      targetOccupationCode: input.goal.targetOccupationCode,
      skills,
    }),
  ]);
  const now = options.now ?? new Date().toISOString();
  const gaps = prioritizeGaps(
    gap.missingSkills.map((item) => ({
      ...item,
      currentLevel: skills.find((held) => held.skillCode === item.skillCode)?.level ?? null,
      evidenceStrength: input.profile.rawSkillEvidence.some((evidence) =>
        evidence.rawSkill.toLowerCase().includes(item.skillCode.toLowerCase()),
      ) ? 0.6 : 0,
      sourceReferences: item.evidence,
    })),
    input.goal.constraints,
    input.goal.timeHorizonMonths,
  );
  const strengths: PlanningStrength[] = gap.strengths.map((item) => ({
    strengthType: gapCategory(item.skillCategory),
    skillCode: item.skillCode,
    label: item.canonicalName,
    evidenceSummary: `Profile evidence meets published level ${item.requiredLevel}.`,
    confidence: readiness.confidence,
    sourceReferences: item.evidence,
  }));
  const band = readinessBand(readiness.overallScore);
  const previous = options.previousAssessment;
  return {
    assessmentId: `cpx_assessment_${hash(`${input.profile.profileId}:${input.goal.goalId}:${input.goal.targetOccupationCode}:${now}`, 16)}`,
    assessmentVersion: "1.0",
    profileId: input.profile.profileId,
    goalId: input.goal.goalId,
    previousAssessmentId: previous?.assessmentId ?? null,
    changeSummary: previous ? assessmentChanges(previous, readiness.overallScore, gaps.length) : [],
    scoreChange: previous ? readiness.overallScore - previous.overallScore : null,
    gapChange: previous ? gaps.length - previous.gaps.length : null,
    overallScore: readiness.overallScore,
    skillScore: readiness.skillScore,
    experienceScore: readiness.experienceScore,
    qualificationScore: readiness.qualificationScore,
    readinessBand: band.band,
    readinessExplanation: band.explanation,
    confidence: readiness.confidence,
    strengths,
    gaps,
    blockers: gaps.filter((item) => item.priority === "critical").map((item) => item.gapId),
    quickWins: gaps.filter((item) => item.estimatedEffort !== "high" && item.priority !== "low").slice(0, 5).map((item) => item.gapId),
    evidence: readiness.evidence,
    taxonomyVersion: readiness.version,
    assessedAt: now,
  };
}

export function prioritizeGaps(
  requirements: Array<{
    skillCode: string;
    requirementType: string;
    requiredLevel: number;
    weight: number;
    currentLevel: number | null;
    evidenceStrength: number;
    sourceReferences: string[];
    skillCategory?: string;
  }>,
  constraints: PlanningConstraints,
  horizonMonths: number,
): PlanningGap[] {
  return requirements.map((item): PlanningGap => {
    const depth = Math.max(0, item.requiredLevel - (item.currentLevel ?? 0));
    const score =
      ({ essential: 5, important: 4, supporting: 2, optional: 1 }[item.requirementType] ?? 1) +
      item.weight * 2 +
      depth -
      item.evidenceStrength;
    const constrained = constraints.weeklyDevelopmentHours === 0;
    const priority: PlanningGap["priority"] = constrained ? "deferred" :
      score >= 8 ? "critical" : score >= 6 ? "high" : score >= 4 ? "medium" : "low";
    const effort: PlanningGap["estimatedEffort"] =
      depth >= 3 ? "high" : depth === 2 ? "moderate" : depth === 1 ? "low" : "not_available";
    return {
      gapId: `cpx_gap_${hash(`${item.skillCode}:${item.requiredLevel}:${item.currentLevel}`, 14)}`,
      category: gapCategory(item.skillCategory),
      gapState: item.currentLevel === null
        ? (item.evidenceStrength > 0 ? "unconfirmed_capability" : "missing_evidence")
        : "insufficient_depth",
      skillCode: item.skillCode,
      requiredLevel: item.requiredLevel,
      currentLevel: item.currentLevel,
      requirementType: item.requirementType,
      priority: horizonMonths <= 3 && effort === "high" ? "deferred" : priority,
      evidenceStrength: item.evidenceStrength,
      estimatedEffort: effort,
      reason: `${item.requirementType} published requirement at level ${item.requiredLevel}; current evidence ${item.currentLevel === null ? "is unconfirmed" : `supports level ${item.currentLevel}`}.`,
      sourceReferences: item.sourceReferences,
    };
  }).sort((left, right) =>
    priorityRank(left.priority) - priorityRank(right.priority) ||
    (left.skillCode ?? "").localeCompare(right.skillCode ?? ""),
  );
}

export function buildActionPlan(input: {
  assessment: ReadinessAssessment;
  goal: CareerGoal;
  now?: string;
}): CareerActionPlan {
  if (input.assessment.goalId !== input.goal.goalId)
    throw planningError("plan_validation_failed", "Assessment and goal do not match.");
  const now = input.now ?? new Date().toISOString();
  const actions = input.assessment.gaps.map((gap, index) =>
    actionForGap(gap, index, input.goal),
  );
  const evidenceAction: PlanAction | null = input.assessment.gaps.some((gap) =>
    ["missing_evidence", "unconfirmed_capability"].includes(gap.gapState),
  ) ? {
    actionId: `cpx_action_${hash(`${input.assessment.assessmentId}:evidence`, 14)}`,
    title: "Add evidence for unconfirmed capabilities",
    description: "Record a work example, project summary, or supported learning record for the identified evidence gaps.",
    actionType: "evidence_collection",
    horizon: "immediate",
    priority: "high",
    targetSkillCodes: input.assessment.gaps.flatMap((gap) => gap.skillCode ? [gap.skillCode] : []),
    targetGapIds: input.assessment.gaps.filter((gap) => gap.gapState !== "insufficient_depth").map((gap) => gap.gapId),
    expectedOutcome: "Capability evidence can be reviewed without treating missing CV evidence as absence.",
    evidenceRequired: ["Evidence metadata and source reference"],
    estimatedEffortHours: null,
    estimateStatus: "not_available",
    estimatedCost: null,
    dueDate: null,
    status: "not_started",
    completionVerification: "not_submitted",
    dependencies: [],
    sourceReferences: [],
    reason: "The assessment contains unconfirmed or missing evidence.",
  } : null;
  if (evidenceAction) actions.unshift(evidenceAction);
  if (
    input.goal.goalType === "professional_registration" ||
    input.goal.constraints.professionalRegistrationGoal
  ) {
    actions.push({
      actionId: `cpx_action_${hash(`${input.assessment.assessmentId}:registration-framework`, 14)}`,
      title: "Collect professional-registration framework evidence",
      description: "Document existing qualifications, experience and CPD for later comparison with a governed professional-body framework.",
      actionType: "professional_registration",
      horizon: "three_month",
      priority: "medium",
      targetSkillCodes: [],
      targetGapIds: input.assessment.gaps.map((gap) => gap.gapId),
      expectedOutcome: "An evidence inventory is ready for review; eligibility remains unassessed.",
      evidenceRequired: ["Qualification, experience and CPD metadata"],
      estimatedEffortHours: null,
      estimateStatus: "not_available",
      estimatedCost: null,
      dueDate: targetDate(input.goal, "three_month"),
      status: "not_started",
      completionVerification: "not_submitted",
      dependencies: [],
      sourceReferences: input.assessment.evidence,
      reason: "Professional-body framework mappings are unavailable, so only general evidence collection is supported.",
    });
  }
  const milestones = buildMilestones(actions, input.goal);
  const risks = buildRisks(input.assessment, input.goal);
  const plan: CareerActionPlan = {
    planId: `cpx_plan_${hash(`${input.assessment.assessmentId}:${input.goal.goalId}`, 16)}`,
    profileId: input.assessment.profileId,
    goalId: input.goal.goalId,
    assessmentId: input.assessment.assessmentId,
    planVersion: "1.0",
    status: "draft",
    summary: `Evidence-backed plan for ${input.goal.targetOccupationCode ?? input.goal.targetOccupationText ?? "the selected career goal"}. Completion does not guarantee employability.`,
    milestones,
    actions,
    risks,
    assumptions: [
      "Canonical requirements come from the published taxonomy version recorded on the assessment.",
      "Costs and durations remain unavailable unless governed evidence supplies them.",
    ],
    evidenceRequired: [...new Set(actions.flatMap((action) => action.evidenceRequired))],
    constraints: input.goal.constraints,
    taxonomyVersion: input.assessment.taxonomyVersion,
    frameworkStatus:
      input.goal.goalType === "professional_registration" ||
      input.goal.constraints.professionalRegistrationGoal
        ? "unavailable"
        : "not_applicable",
    changeReason: null,
    changedBy: null,
    changedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const validation = validateActionPlan(plan);
  if (!validation.valid) throw planningError("plan_validation_failed", validation.errors.join(" "));
  return plan;
}

export function buildMilestones(actions: PlanAction[], goal: CareerGoal): PlanMilestone[] {
  const grouped = [
    ["immediate", "Immediate evidence and profile actions"],
    ["three_month", "Three-month development actions"],
    ["six_month", "Six-month capability milestone"],
    ["twelve_month", "Twelve-month target review"],
    ["long_term", "Long-term progression"],
  ] as const;
  return grouped.flatMap(([horizon, title], index) => {
    const matched = actions.filter((action) => action.horizon === horizon);
    if (!matched.length) return [];
    const previous = index > 0
      ? grouped.slice(0, index).flatMap(([prior]) => actions.filter((action) => action.horizon === prior).map((action) => action.actionId))
      : [];
    return [{
      milestoneId: `cpx_milestone_${hash(`${goal.goalId}:${horizon}`, 14)}`,
      title,
      successCriteria: matched.map((action) => `${action.title}: completion submitted and verification status recorded`),
      evidenceRequired: [...new Set(matched.flatMap((action) => action.evidenceRequired))],
      targetDate: targetDate(goal, horizon),
      status: "pending" as const,
      actionIds: matched.map((action) => action.actionId),
      dependencies: previous,
    }];
  });
}

export function validateActionPlan(plan: CareerActionPlan) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const ids = new Set(plan.actions.map((action) => action.actionId));
  if (ids.size !== plan.actions.length) errors.push("Action identifiers must be unique.");
  for (const action of plan.actions) {
    for (const dependency of action.dependencies)
      if (!ids.has(dependency)) errors.push(`Unknown action dependency: ${dependency}`);
    if (!action.targetGapIds.length) warnings.push(`Action ${action.actionId} has no linked gap.`);
    if (!action.reason || !action.expectedOutcome) errors.push(`Action ${action.actionId} lacks an explanation.`);
  }
  if (hasDependencyCycle(plan.actions)) errors.push("Action dependency graph contains a cycle.");
  return { valid: errors.length === 0, errors, warnings };
}

export function updateActionStatus(
  plan: CareerActionPlan,
  input: {
    actionId: string;
    status: PlanAction["status"];
    verificationStatus?: PlanAction["completionVerification"];
    changedBy: string;
    changedAt: string;
    changeReason: string;
  },
) {
  const action = plan.actions.find((item) => item.actionId === input.actionId);
  if (!action) throw planningError("plan_validation_failed", "Action was not found.");
  if (input.status === "completed" && input.verificationStatus === "not_submitted")
    throw planningError("plan_validation_failed", "Completed actions must distinguish unverified or verified evidence.");
  return revisePlan(plan, {
    ...input,
    mutate(copy) {
      const target = copy.actions.find((item) => item.actionId === input.actionId)!;
      target.status = input.status;
      target.completionVerification = input.verificationStatus ?? target.completionVerification;
    },
  });
}

export function addEvidenceRecord(input: Omit<EvidenceRecord, "evidenceId">): EvidenceRecord {
  if (!input.title || !input.createdAt)
    throw planningError("insufficient_evidence", "Evidence title and creation time are required.");
  return {
    ...input,
    evidenceId: `cpx_evidence_${hash(`${input.title}:${input.createdAt}:${input.linkedActionIds.join("|")}`, 16)}`,
  };
}

export function calculateProgress(plan: CareerActionPlan) {
  const completed = plan.actions.filter((action) => action.status === "completed");
  const verified = completed.filter((action) => action.completionVerification === "verified");
  return {
    actionCompletionPercent: plan.actions.length ? Math.round(completed.length / plan.actions.length * 100) : 0,
    verifiedProgressPercent: plan.actions.length ? Math.round(verified.length / plan.actions.length * 100) : 0,
    completedActions: completed.length,
    verifiedActions: verified.length,
    totalActions: plan.actions.length,
    explanation: "Completion records activity status; verified progress counts only actions with verified evidence.",
  };
}

export function revisePlan(
  plan: CareerActionPlan,
  change: {
    changedBy: string;
    changedAt: string;
    changeReason: string;
    mutate: (copy: CareerActionPlan) => void;
  },
) {
  if (!change.changedBy || !change.changedAt || !change.changeReason)
    throw planningError("plan_validation_failed", "Plan revision attribution is required.");
  const copy = structuredClone(plan);
  change.mutate(copy);
  const [major, minor] = plan.planVersion.split(".").map(Number);
  copy.planVersion = `${major}.${(minor ?? 0) + 1}`;
  copy.changeReason = change.changeReason;
  copy.changedBy = change.changedBy;
  copy.changedAt = change.changedAt;
  copy.updatedAt = change.changedAt;
  return copy;
}

export async function compareScenarios(
  inputs: PlanningInput[],
  engine: CareerIntelligenceEngine,
  now = "scenario-comparison",
) {
  if (inputs.length < 1 || inputs.length > 3)
    throw planningError("plan_validation_failed", "Compare between one and three targets.");
  return Promise.all(inputs.map(async (input, index) => {
    const assessment = await orchestrateReadiness(input, engine, {
      now: `${now}:${index}`,
    });
    const plan = buildActionPlan({
      assessment,
      goal: input.goal,
      now: `${now}:${index}`,
    });
    const currentCode =
      input.currentOccupation?.selectedOccupation?.occupationCode ??
      input.goal.currentOccupationCode;
    const transitions = currentCode
      ? await engine.transitions({
          currentOccupationCode: currentCode,
          skills: input.skillLevels ?? [],
        })
      : null;
    return {
      targetOccupationCode: input.goal.targetOccupationCode,
      readinessScore: assessment.overallScore,
      skillOverlap: assessment.strengths.length,
      criticalGaps: assessment.gaps.filter((gap) => gap.priority === "critical").length,
      estimatedDifficulty: "not_available",
      approvedTransitionAvailable:
        transitions?.transitions.some(
          (transition) =>
            transition.toOccupationCode === input.goal.targetOccupationCode,
        ) ?? false,
      highPriorityActions: plan.actions.filter((action) => ["critical", "high"].includes(action.priority)).length,
      evidenceConfidence: assessment.confidence,
      dataAvailability: assessment.evidence.length ? "available" : "limited",
    };
  }));
}

export function exportCareerPlan(input: {
  plan: CareerActionPlan;
  assessment: ReadinessAssessment;
  goal: CareerGoal;
  format: "json" | "markdown" | "html";
  advisorShare?: boolean;
}) {
  const model = advisorPlanModel(input);
  if (input.format === "json") return { mediaType: "application/json", content: JSON.stringify(model, null, 2) };
  const markdown = `# Career action plan

Status: ${model.plan.status}
Taxonomy: ${model.assessment.taxonomyVersion}
Readiness: ${model.assessment.overallScore} (${model.assessment.readinessBand})

## Actions
${model.plan.actions.map((action) => `- ${action.title} — ${action.reason}`).join("\n")}

## Milestones
${model.plan.milestones.map((milestone) => `- ${milestone.title}: ${milestone.successCriteria.join("; ")}`).join("\n")}

## Risks
${model.plan.risks.map((risk) => `- ${risk.riskCode}: ${risk.mitigation}`).join("\n")}

This plan is evidence-based guidance, not a guarantee of employment, eligibility, accreditation, or career outcome.`;
  if (input.format === "markdown") return { mediaType: "text/markdown", content: markdown };
  return {
    mediaType: "text/html",
    content: `<!doctype html><html><head><meta charset="utf-8"><title>Career action plan</title></head><body><pre>${escapeHtml(markdown)}</pre></body></html>`,
  };
}

export function advisorPlanModel(input: {
  plan: CareerActionPlan;
  assessment: ReadinessAssessment;
  goal: CareerGoal;
  advisorShare?: boolean;
}) {
  return {
    exportVersion: "1.0",
    redacted: input.advisorShare ?? true,
    persistenceStatus: "stateless",
    goal: {
      goalType: input.goal.goalType,
      currentOccupationCode: input.goal.currentOccupationCode,
      targetOccupationCode: input.goal.targetOccupationCode,
      targetOccupationText: input.goal.targetOccupationText,
      targetCareerFamily: input.goal.targetCareerFamily,
      targetLevel: input.goal.targetLevel,
      timeHorizonMonths: input.goal.timeHorizonMonths,
    },
    assessment: input.assessment,
    plan: {
      ...input.plan,
      constraints: {
        ...input.plan.constraints,
        caringConstraints: [],
        travelConstraints: [],
        salaryAspiration: null,
        locationPreference: null,
      },
    },
    questionsForDiscussion: input.assessment.gaps
      .filter((gap) => gap.gapState !== "missing_capability")
      .map((gap) => `What evidence could confirm ${gap.skillCode ?? gap.category}?`),
  };
}

export function planningAiContext(input: {
  goal: CareerGoal;
  assessment: ReadinessAssessment;
  plan: CareerActionPlan;
}) {
  return {
    immutableDeterministicFields: [
      "readiness scores", "canonical occupation codes", "canonical skill codes",
      "transition evidence", "action status", "evidence verification",
    ],
    goal: input.goal,
    readiness: {
      overallScore: input.assessment.overallScore,
      componentScores: {
        skills: input.assessment.skillScore,
        experience: input.assessment.experienceScore,
        qualifications: input.assessment.qualificationScore,
      },
      band: input.assessment.readinessBand,
      confidence: input.assessment.confidence,
    },
    strengths: input.assessment.strengths,
    gaps: input.assessment.gaps,
    actions: input.plan.actions,
    milestones: input.plan.milestones,
    constraints: input.goal.constraints,
    risks: input.plan.risks,
  };
}

export function safePlanningLog(input: {
  requestId: string;
  plan?: CareerActionPlan;
  assessment?: ReadinessAssessment;
  durationMs: number;
  validationResult: string;
  errorCategory?: string;
}) {
  return {
    requestId: input.requestId,
    planVersion: input.plan?.planVersion ?? null,
    taxonomyVersion: input.assessment?.taxonomyVersion ?? null,
    actionCount: input.plan?.actions.length ?? 0,
    gapCount: input.assessment?.gaps.length ?? 0,
    validationResult: input.validationResult,
    executionDurationMs: Math.round(input.durationMs),
    errorCategory: input.errorCategory ?? null,
  };
}

function actionForGap(gap: PlanningGap, index: number, goal: CareerGoal): PlanAction {
  const horizon = gap.priority === "critical" ? "immediate" :
    gap.priority === "high" ? "three_month" :
    gap.priority === "medium" ? "six_month" :
    gap.priority === "low" ? "twelve_month" : "long_term";
  const evidenceGap = ["missing_evidence", "unconfirmed_capability"].includes(gap.gapState);
  return {
    actionId: `cpx_action_${hash(`${goal.goalId}:${gap.gapId}:${index}`, 14)}`,
    title: evidenceGap
      ? `Collect evidence for ${gap.skillCode ?? gap.category}`
      : `Develop ${gap.skillCode ?? gap.category}`,
    description: evidenceGap
      ? "Record a relevant work example, project outcome, or supported learning record."
      : `Build the published requirement from level ${gap.currentLevel ?? "unconfirmed"} toward level ${gap.requiredLevel ?? "required"}.`,
    actionType: evidenceGap ? "evidence_collection" : "skills_development",
    horizon,
    priority: gap.priority,
    targetSkillCodes: gap.skillCode ? [gap.skillCode] : [],
    targetGapIds: [gap.gapId],
    expectedOutcome: evidenceGap
      ? "Evidence can be reviewed and its verification state recorded."
      : "Updated evidence can support a future readiness reassessment.",
    evidenceRequired: evidenceGap
      ? ["Work example, project summary, training record, or advisor note"]
      : ["Practice output and evidence of application"],
    estimatedEffortHours: null,
    estimateStatus: "not_available",
    estimatedCost: null,
    dueDate: targetDate(goal, horizon),
    status: "not_started",
    completionVerification: "not_submitted",
    dependencies: [],
    sourceReferences: gap.sourceReferences,
    reason: gap.reason,
  };
}

function buildRisks(assessment: ReadinessAssessment, goal: CareerGoal): PlanRisk[] {
  const risks: PlanRisk[] = [];
  if (goal.constraints.weeklyDevelopmentHours !== null && goal.constraints.weeklyDevelopmentHours < 2)
    risks.push(risk("insufficient_time", "high", "high", "Limited weekly capacity may delay planned actions.", "Defer lower-priority actions and agree a sustainable pace."));
  if (assessment.gaps.some((gap) => gap.gapState === "missing_evidence"))
    risks.push(risk("insufficient_evidence", "medium", "high", "Readiness may understate capabilities that are not evidenced.", "Collect and verify relevant work or learning evidence."));
  if (assessment.gaps.some((gap) => gap.category === "qualification"))
    risks.push(risk("qualification_dependency", "high", "medium", "A published qualification requirement remains unmet.", "Confirm the governed requirement before selecting a qualification route."));
  if (goal.timeHorizonMonths <= 3 && assessment.gaps.some((gap) => gap.estimatedEffort === "high"))
    risks.push(risk("timeline_unrealistic", "high", "high", "High-effort gaps do not fit safely into the selected horizon.", "Prioritise evidence and quick wins; retain longer development beyond the horizon."));
  if (goal.constraints.budgetAmount === 0)
    risks.push(risk("cost_unknown", "medium", "medium", "Some development options may have unknown costs while the available budget is zero.", "Prefer workplace, portfolio, mentoring, and free evidence-building options."));
  return risks;
}

function risk(
  riskCode: PlanRisk["riskCode"],
  severity: PlanRisk["severity"],
  likelihood: PlanRisk["likelihood"],
  impact: string,
  mitigation: string,
): PlanRisk {
  return { riskCode, severity, likelihood, impact, mitigation };
}

function normalizeConstraints(input: Partial<PlanningConstraints> = {}): PlanningConstraints {
  return {
    preferredIndustries: input.preferredIndustries ?? [],
    locationPreference: input.locationPreference ?? null,
    workModePreference: input.workModePreference ?? null,
    salaryAspiration: input.salaryAspiration ?? null,
    trainingAvailability: input.trainingAvailability ?? null,
    weeklyDevelopmentHours: input.weeklyDevelopmentHours ?? null,
    budgetAmount: input.budgetAmount ?? null,
    caringConstraints: input.caringConstraints ?? [],
    travelConstraints: input.travelConstraints ?? [],
    qualificationConstraints: input.qualificationConstraints ?? [],
    professionalRegistrationGoal: input.professionalRegistrationGoal ?? null,
    trainingFormatPreference: input.trainingFormatPreference ?? null,
    desiredPace: input.desiredPace ?? null,
  };
}

function gapCategory(category?: string): PlanningGap["category"] {
  const normalized = category?.toLowerCase() ?? "";
  if (normalized === "transferable") return "transferable_skill";
  if (normalized === "behavioural") return "behavioural_skill";
  if (normalized === "leadership") return "leadership";
  if (normalized.includes("tool") || normalized.includes("technology"))
    return "tool_or_technology";
  return normalized === "unknown" || !normalized
    ? "evidence_gap"
    : "technical_skill";
}

function readinessBand(score: number): {
  band: ReadinessAssessment["readinessBand"];
  explanation: string;
} {
  const qualification = " This band does not measure professional worth or guarantee employability.";
  if (score >= 85) return { band: "ready_now", explanation: `Published requirements are strongly evidenced.${qualification}` };
  if (score >= 70) return { band: "near_ready", explanation: `Most published requirements are evidenced, with focused development still required.${qualification}` };
  if (score >= 50) return { band: "developing", explanation: `Several published requirements need deeper or better-supported evidence.${qualification}` };
  if (score >= 30) return { band: "early_stage", explanation: `The transition requires substantial evidence and capability development.${qualification}` };
  return { band: "substantial_gap", explanation: `Current evidence has limited overlap with published requirements.${qualification}` };
}

function targetDate(goal: CareerGoal, horizon: PlanAction["horizon"]) {
  if (!goal.targetDate) return null;
  const months = { immediate: 1, three_month: 3, six_month: 6, twelve_month: 12, long_term: goal.timeHorizonMonths }[horizon];
  if (months > goal.timeHorizonMonths && horizon !== "long_term") return null;
  const date = new Date(goal.createdAt);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function experienceYears(employment: PlanningInput["profile"]["employment"]) {
  const months = employment.reduce((sum, item) => sum + (item.durationMonths ?? 0), 0);
  return Math.round(months / 12 * 10) / 10;
}

function assessmentChanges(previous: ReadinessAssessment, score: number, gaps: number) {
  const changes: string[] = [];
  if (score !== previous.overallScore) changes.push(`Overall score changed by ${score - previous.overallScore}.`);
  if (gaps !== previous.gaps.length) changes.push(`Gap count changed by ${gaps - previous.gaps.length}.`);
  return changes.length ? changes : ["No deterministic score or gap-count change."];
}

function priorityRank(value: PlanningGap["priority"]) {
  return { critical: 0, high: 1, medium: 2, low: 3, deferred: 4 }[value];
}

function hasDependencyCycle(actions: PlanAction[]) {
  const graph = new Map(actions.map((action) => [action.actionId, action.dependencies]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dependency of graph.get(id) ?? [])
      if (visit(dependency)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return actions.some((action) => visit(action.actionId));
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

function hash(value: string, length: number) {
  return createHash("sha256").update(value).digest("hex").slice(0, length);
}

function planningError(code: string, message: string) {
  return Object.assign(new Error(message), { code });
}
