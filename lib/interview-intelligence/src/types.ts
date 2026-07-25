import type {
  ApplicationAnalysis,
  ClaimStatus,
  TailoredCvDraft,
  VacancyRequirement,
} from "@workspace/application-intelligence";
import type { CareerProfile } from "@workspace/career-profile";
import type {
  CanonicalVacancy,
  EmployabilityResult,
} from "@workspace/opportunity-intelligence";

export type InterviewType =
  | "screening" | "competency" | "behavioural" | "technical" | "leadership"
  | "management" | "case_study" | "presentation" | "panel"
  | "assessment_centre" | "values_based" | "situational" | "mixed";
export type CompetencyCategory =
  | "technical_capability" | "role_experience" | "leadership"
  | "stakeholder_management" | "communication" | "decision_making"
  | "problem_solving" | "risk_management" | "commercial_awareness"
  | "delivery" | "teamwork" | "conflict_management" | "change_management"
  | "customer_focus" | "quality" | "safety" | "ethics" | "innovation"
  | "adaptability" | "industry_knowledge" | "qualification_validation"
  | "certification_validation" | "motivation" | "career_alignment";
export type QuestionType =
  | "opening" | "career_summary" | "motivation" | "competency"
  | "behavioural" | "technical" | "leadership" | "management"
  | "situational" | "role_specific" | "achievement" | "failure_or_learning"
  | "conflict" | "stakeholder" | "commercial" | "risk" | "safety"
  | "ethics" | "values" | "career_gap" | "qualification_validation"
  | "certification_validation" | "salary" | "availability"
  | "work_authorisation" | "candidate_questions";
export type EvidenceStrength =
  | "strong" | "moderate" | "weak" | "unconfirmed" | "conflicting" | "missing";

export interface InterviewCompetency {
  competencyId: string;
  category: CompetencyCategory;
  label: string;
  importance: "mandatory" | "high" | "medium" | "low" | "contextual";
  vacancyRequirementIds: string[];
  canonicalSkillCodes: string[];
  sourceEvidence: string[];
  confidence: number;
}

export interface InterviewQuestion {
  questionId: string;
  questionType: QuestionType;
  text: string;
  competencyIds: string[];
  requirementIds: string[];
  importance: "mandatory" | "high" | "medium" | "low" | "contextual";
  expectedEvidenceTypes: string[];
  answerFramework: "STAR" | "STAR-L" | "CAR" | "conceptual" | "scenario_response";
  sourceReason: string;
  confidence: number;
  preparationLabel: "likely_preparation_area" | "role_relevant_practice_question" | "evidence_validation_question";
}

export interface SelectedInterviewEvidence {
  evidenceId: string;
  questionId: string;
  evidenceStrength: EvidenceStrength;
  verificationStatus:
    | "verified" | "document_supported" | "user_confirmed"
    | "advisor_reviewed" | "self_reported" | "unconfirmed";
  relevance: number;
  sourceReferences: string[];
  selectionReason: string;
  sourceText: string;
}

export interface StarSection {
  text: string;
  claimStatus: ClaimStatus;
  sourceEvidenceIds: string[];
}

export interface StarResponse {
  responseId: string;
  questionId: string;
  responseVersion: number;
  framework: "STAR" | "STAR-L" | "CAR";
  situation: StarSection | null;
  task: StarSection | null;
  action: StarSection | null;
  result: StarSection | null;
  learning: StarSection | null;
  overallClaimStatus: ClaimStatus;
  reviewStatus: "draft" | "user_confirmed" | "advisor_approved" | "revision_required";
  createdAt: string;
  recordVersion: number;
}

export interface AnswerCompleteness {
  score: number;
  band: "practice_ready" | "strong" | "developing" | "weak" | "insufficient_evidence";
  requirementRelevance: number;
  evidenceStrength: number;
  situationClarity: number;
  taskClarity: number;
  actionSpecificity: number;
  resultEvidence: number;
  reflection: number;
  disclaimer: string;
}

export interface CoachingFeedback {
  feedbackId: string;
  responseId: string;
  category:
    | "relevance" | "clarity" | "specificity" | "evidence" | "ownership"
    | "structure" | "result" | "reflection" | "risk_of_overclaim" | "missing_detail";
  severity: "critical" | "high" | "medium" | "low" | "informational";
  message: string;
  recommendation: string;
  sourceReferences: string[];
}

export interface PracticeSession {
  practiceSessionId: string;
  interviewSessionId: string;
  mode: "guided" | "timed" | "competency_focus" | "technical_focus" | "leadership_focus" | "full_mock" | "advisor_led";
  questionIds: string[];
  startedAt: string;
  completedAt: string | null;
  responseIds: string[];
  scores: Record<string, number>;
  feedbackIds: string[];
  status: "in_progress" | "completed";
  recordVersion: number;
}

export interface InterviewReadiness {
  score: number;
  priorityCompetencyCoverage: number;
  evidenceReadiness: number;
  starCompleteness: number;
  technicalPreparation: number;
  motivationAlignment: number;
  candidateQuestionsPrepared: number;
  blockers: Array<{
    code: string;
    category: "evidence" | "claim" | "preparation" | "user_decision" | "governance";
    message: string;
  }>;
  disclaimer: string;
}

export interface InterviewEntitlements {
  canViewInterviewCompetencies: boolean;
  canGenerateQuestionPlan: boolean;
  canBuildStarResponses: boolean;
  canRunPracticeSession: boolean;
  canRunFullMockInterview: boolean;
  canViewDetailedFeedback: boolean;
  canPrepareTechnicalInterview: boolean;
  canRequestAdvisorInterviewReview: boolean;
  canExportInterviewPack: boolean;
  canViewInterviewHistory: boolean;
}

export interface InterviewSession {
  sessionId: string;
  ownerUserId: string;
  profileId: string;
  vacancyId: string;
  matchResultId: string;
  cvOptimisationSessionId: string | null;
  sessionVersion: "1.0";
  interviewType: InterviewType;
  interviewFormatStatus: "confirmed" | "unconfirmed";
  interviewDate: string | null;
  status:
    | "draft" | "analysed" | "question_plan_ready" | "requires_evidence"
    | "ready_for_practice" | "practice_in_progress" | "advisor_review"
    | "interview_ready" | "completed" | "archived";
  profile: CareerProfile;
  vacancy: CanonicalVacancy;
  requirements: VacancyRequirement[];
  matchResult: EmployabilityResult;
  cvAnalysis: ApplicationAnalysis | null;
  tailoredDraft: TailoredCvDraft | null;
  competencies: InterviewCompetency[];
  questionPlan: InterviewQuestion[];
  evidenceSelections: SelectedInterviewEvidence[];
  responses: StarResponse[];
  practiceSessions: PracticeSession[];
  readiness: InterviewReadiness | null;
  createdAt: string;
  updatedAt: string;
  recordVersion: number;
}
