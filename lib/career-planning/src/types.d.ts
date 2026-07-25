import type { CareerProfile } from "@workspace/career-profile";
export type GoalType = "career_transition" | "promotion" | "specialisation" | "career_change" | "return_to_work" | "professional_registration" | "skill_development" | "leadership_progression" | "consulting" | "entrepreneurship";
export interface PlanningConstraints {
    preferredIndustries: string[];
    locationPreference: string | null;
    workModePreference: "remote" | "hybrid" | "on_site" | "no_preference" | null;
    salaryAspiration: number | null;
    trainingAvailability: string | null;
    weeklyDevelopmentHours: number | null;
    budgetAmount: number | null;
    caringConstraints: string[];
    travelConstraints: string[];
    qualificationConstraints: string[];
    professionalRegistrationGoal: string | null;
    trainingFormatPreference: string | null;
    desiredPace: "accelerated" | "steady" | "flexible" | null;
}
export interface CareerGoal {
    goalVersion: "1.0";
    goalId: string;
    profileId: string;
    currentOccupationCode: string | null;
    targetOccupationCode: string | null;
    targetOccupationText: string | null;
    targetCareerFamily: string | null;
    targetLevel: string | null;
    targetDate: string | null;
    timeHorizonMonths: number;
    goalType: GoalType;
    motivation: string | null;
    constraints: PlanningConstraints;
    preferences: string[];
    status: "draft" | "confirmed" | "archived";
    createdAt: string;
    updatedAt: string;
}
export interface OccupationConfirmation {
    state: "system_resolved" | "user_confirmed" | "advisor_confirmed" | "unresolved";
    originalResolution: unknown | null;
    candidateList: unknown[];
    selectedOccupation: {
        occupationCode: string;
        title?: string;
    } | null;
    selectedBy: string | null;
    selectedAt: string | null;
    selectionReason: string | null;
}
export type GapCategory = "technical_skill" | "transferable_skill" | "behavioural_skill" | "experience" | "qualification" | "certification" | "professional_registration" | "tool_or_technology" | "leadership" | "industry_exposure" | "evidence_gap" | "profile_information_gap";
export interface PlanningGap {
    gapId: string;
    category: GapCategory;
    gapState: "missing_capability" | "missing_evidence" | "unconfirmed_capability" | "outdated_evidence" | "insufficient_depth" | "insufficient_recency";
    skillCode: string | null;
    requiredLevel: number | null;
    currentLevel: number | null;
    requirementType: string;
    priority: "critical" | "high" | "medium" | "low" | "deferred";
    evidenceStrength: number;
    estimatedEffort: "low" | "moderate" | "high" | "not_available";
    reason: string;
    sourceReferences: string[];
}
export interface PlanningStrength {
    strengthType: GapCategory;
    skillCode: string | null;
    label: string;
    evidenceSummary: string;
    confidence: number;
    sourceReferences: string[];
}
export interface ReadinessAssessment {
    assessmentId: string;
    assessmentVersion: "1.0";
    profileId: string;
    goalId: string;
    previousAssessmentId: string | null;
    changeSummary: string[];
    scoreChange: number | null;
    gapChange: number | null;
    overallScore: number;
    skillScore: number;
    experienceScore: number;
    qualificationScore: number;
    readinessBand: "ready_now" | "near_ready" | "developing" | "early_stage" | "substantial_gap";
    readinessExplanation: string;
    confidence: number;
    strengths: PlanningStrength[];
    gaps: PlanningGap[];
    blockers: string[];
    quickWins: string[];
    evidence: string[];
    taxonomyVersion: string;
    assessedAt: string;
}
export type ActionType = "profile_correction" | "skills_development" | "workplace_experience" | "stretch_assignment" | "course" | "certification" | "qualification" | "professional_membership" | "professional_registration" | "portfolio_project" | "mentoring" | "networking" | "job_search" | "cv_improvement" | "interview_preparation" | "advisor_session" | "evidence_collection";
export interface PlanAction {
    actionId: string;
    title: string;
    description: string;
    actionType: ActionType;
    horizon: "immediate" | "three_month" | "six_month" | "twelve_month" | "long_term";
    priority: PlanningGap["priority"];
    targetSkillCodes: string[];
    targetGapIds: string[];
    expectedOutcome: string;
    evidenceRequired: string[];
    estimatedEffortHours: number | null;
    estimateStatus: "available" | "not_available";
    estimatedCost: number | null;
    dueDate: string | null;
    status: "not_started" | "in_progress" | "blocked" | "completed" | "deferred" | "cancelled";
    completionVerification: "not_submitted" | "unverified" | "verified";
    dependencies: string[];
    sourceReferences: string[];
    reason: string;
}
export interface PlanMilestone {
    milestoneId: string;
    title: string;
    successCriteria: string[];
    evidenceRequired: string[];
    targetDate: string | null;
    status: "pending" | "on_track" | "at_risk" | "completed" | "missed" | "deferred";
    actionIds: string[];
    dependencies: string[];
}
export interface PlanRisk {
    riskCode: "insufficient_time" | "insufficient_evidence" | "unresolved_occupation" | "unresolved_skill" | "qualification_dependency" | "experience_dependency" | "taxonomy_data_unavailable" | "transition_not_approved" | "cost_unknown" | "provider_unverified" | "timeline_unrealistic";
    severity: "low" | "medium" | "high";
    likelihood: "low" | "medium" | "high";
    impact: string;
    mitigation: string;
}
export interface CareerActionPlan {
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
    constraints: PlanningConstraints;
    taxonomyVersion: string;
    frameworkStatus: "unavailable" | "not_applicable";
    changeReason: string | null;
    changedBy: string | null;
    changedAt: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface EvidenceRecord {
    evidenceId: string;
    evidenceType: "work_example" | "project_summary" | "certificate" | "training_completion" | "manager_feedback" | "portfolio_link" | "publication" | "presentation" | "cpd_record" | "advisor_note";
    title: string;
    description: string;
    linkedActionIds: string[];
    linkedSkillCodes: string[];
    verificationStatus: "self_reported" | "document_supported" | "advisor_reviewed" | "employer_confirmed" | "credential_verified" | "unverified" | "rejected";
    createdAt: string;
}
export interface PlanningInput {
    profile: CareerProfile;
    goal: CareerGoal;
    skillLevels?: Array<{
        skillCode: string;
        level?: number;
    }>;
    qualificationCodes?: string[];
    currentOccupation?: OccupationConfirmation;
}
