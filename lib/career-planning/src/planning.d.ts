import type { CareerIntelligenceEngine } from "@workspace/career-intelligence";
import type { CareerActionPlan, CareerGoal, EvidenceRecord, OccupationConfirmation, PlanAction, PlanMilestone, PlanRisk, PlanningConstraints, PlanningGap, PlanningInput, PlanningStrength, ReadinessAssessment } from "./types";
export declare function createCareerGoal(input: {
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
}): CareerGoal;
export declare function validateCareerGoal(goal: CareerGoal): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
export declare function confirmOccupation(input: {
    originalResolution?: unknown;
    candidates?: unknown[];
    selectedOccupation?: {
        occupationCode: string;
        title?: string;
    } | null;
    selectedBy?: string | null;
    selectedAt?: string | null;
    selectionReason?: string | null;
    confirmationType?: "user_confirmed" | "advisor_confirmed";
}): OccupationConfirmation;
export declare function resolveGoalTarget(goal: CareerGoal, engine: CareerIntelligenceEngine): Promise<{
    version: string;
    occupationCode: string;
    canonicalTitle: string;
    careerFamily: string;
    careerLevel: string;
    confidence: number;
    matchType: string;
    matchedAliases: string[];
    matchedSkills: string[];
    explanations: string[];
    evidence: string[];
} | {
    version: string;
    occupationCode: null;
    confidence: number;
    matchType: string;
    explanations: string[];
    evidence: never[];
} | {
    resolutionStatus: string;
    version: string;
    occupationCode: string;
    canonicalTitle: string;
    careerFamily: string;
    careerLevel: string;
    confidence: number;
    matchType: string;
    matchedAliases: string[];
    matchedSkills: string[];
    explanations: string[];
    evidence: string[];
} | {
    resolutionStatus: string;
    version: string;
    occupationCode: null;
    confidence: number;
    matchType: string;
    explanations: string[];
    evidence: never[];
}>;
export declare function orchestrateReadiness(input: PlanningInput, engine: CareerIntelligenceEngine, options?: {
    now?: string;
    previousAssessment?: ReadinessAssessment;
}): Promise<ReadinessAssessment>;
export declare function prioritizeGaps(requirements: Array<{
    skillCode: string;
    requirementType: string;
    requiredLevel: number;
    weight: number;
    currentLevel: number | null;
    evidenceStrength: number;
    sourceReferences: string[];
    skillCategory?: string;
}>, constraints: PlanningConstraints, horizonMonths: number): PlanningGap[];
export declare function buildActionPlan(input: {
    assessment: ReadinessAssessment;
    goal: CareerGoal;
    now?: string;
}): CareerActionPlan;
export declare function buildMilestones(actions: PlanAction[], goal: CareerGoal): PlanMilestone[];
export declare function validateActionPlan(plan: CareerActionPlan): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
export declare function updateActionStatus(plan: CareerActionPlan, input: {
    actionId: string;
    status: PlanAction["status"];
    verificationStatus?: PlanAction["completionVerification"];
    changedBy: string;
    changedAt: string;
    changeReason: string;
}): CareerActionPlan;
export declare function addEvidenceRecord(input: Omit<EvidenceRecord, "evidenceId">): EvidenceRecord;
export declare function calculateProgress(plan: CareerActionPlan): {
    actionCompletionPercent: number;
    verifiedProgressPercent: number;
    completedActions: number;
    verifiedActions: number;
    totalActions: number;
    explanation: string;
};
export declare function revisePlan(plan: CareerActionPlan, change: {
    changedBy: string;
    changedAt: string;
    changeReason: string;
    mutate: (copy: CareerActionPlan) => void;
}): CareerActionPlan;
export declare function compareScenarios(inputs: PlanningInput[], engine: CareerIntelligenceEngine, now?: string): Promise<{
    targetOccupationCode: string | null;
    readinessScore: number;
    skillOverlap: number;
    criticalGaps: number;
    estimatedDifficulty: string;
    approvedTransitionAvailable: boolean;
    highPriorityActions: number;
    evidenceConfidence: number;
    dataAvailability: string;
}[]>;
export declare function exportCareerPlan(input: {
    plan: CareerActionPlan;
    assessment: ReadinessAssessment;
    goal: CareerGoal;
    format: "json" | "markdown" | "html";
    advisorShare?: boolean;
}): {
    mediaType: string;
    content: string;
};
export declare function advisorPlanModel(input: {
    plan: CareerActionPlan;
    assessment: ReadinessAssessment;
    goal: CareerGoal;
    advisorShare?: boolean;
}): {
    exportVersion: string;
    redacted: boolean;
    persistenceStatus: string;
    goal: {
        goalType: import("./types").GoalType;
        currentOccupationCode: string | null;
        targetOccupationCode: string | null;
        targetOccupationText: string | null;
        targetCareerFamily: string | null;
        targetLevel: string | null;
        timeHorizonMonths: number;
    };
    assessment: ReadinessAssessment;
    plan: {
        constraints: {
            caringConstraints: never[];
            travelConstraints: never[];
            salaryAspiration: null;
            locationPreference: null;
            preferredIndustries: string[];
            workModePreference: "remote" | "hybrid" | "on_site" | "no_preference" | null;
            trainingAvailability: string | null;
            weeklyDevelopmentHours: number | null;
            budgetAmount: number | null;
            qualificationConstraints: string[];
            professionalRegistrationGoal: string | null;
            trainingFormatPreference: string | null;
            desiredPace: "accelerated" | "steady" | "flexible" | null;
        };
        planId: string;
        profileId: string;
        goalId: string;
        assessmentId: string;
        planVersion: string;
        status: "draft" | "active" | "archived";
        summary: string;
        milestones: PlanMilestone[];
        actions: PlanAction[];
        risks: PlanRisk[];
        assumptions: string[];
        evidenceRequired: string[];
        taxonomyVersion: string;
        frameworkStatus: "unavailable" | "not_applicable";
        changeReason: string | null;
        changedBy: string | null;
        changedAt: string | null;
        createdAt: string;
        updatedAt: string;
    };
    questionsForDiscussion: string[];
};
export declare function planningAiContext(input: {
    goal: CareerGoal;
    assessment: ReadinessAssessment;
    plan: CareerActionPlan;
}): {
    immutableDeterministicFields: string[];
    goal: CareerGoal;
    readiness: {
        overallScore: number;
        componentScores: {
            skills: number;
            experience: number;
            qualifications: number;
        };
        band: "ready_now" | "near_ready" | "developing" | "early_stage" | "substantial_gap";
        confidence: number;
    };
    strengths: PlanningStrength[];
    gaps: PlanningGap[];
    actions: PlanAction[];
    milestones: PlanMilestone[];
    constraints: PlanningConstraints;
    risks: PlanRisk[];
};
export declare function safePlanningLog(input: {
    requestId: string;
    plan?: CareerActionPlan;
    assessment?: ReadinessAssessment;
    durationMs: number;
    validationResult: string;
    errorCategory?: string;
}): {
    requestId: string;
    planVersion: string | null;
    taxonomyVersion: string | null;
    actionCount: number;
    gapCount: number;
    validationResult: string;
    executionDurationMs: number;
    errorCategory: string | null;
};
