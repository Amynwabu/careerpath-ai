import type { CareerProfile } from "@workspace/career-profile";
import type {
  CanonicalVacancy,
  EmployabilityResult,
} from "@workspace/opportunity-intelligence";

export type RequirementType =
  | "mandatory_skill"
  | "preferred_skill"
  | "experience_requirement"
  | "qualification_requirement"
  | "certification_requirement"
  | "tool_or_technology"
  | "industry_experience"
  | "leadership_requirement"
  | "location_requirement"
  | "work_authorisation_requirement"
  | "security_clearance_requirement"
  | "language_requirement"
  | "responsibility"
  | "behavioural_requirement";
export type AlignmentStatus =
  | "strong_evidence"
  | "moderate_evidence"
  | "weak_evidence"
  | "unconfirmed_evidence"
  | "missing_evidence"
  | "not_applicable";
export type ClaimStatus =
  | "directly_supported"
  | "supported_rewrite"
  | "supported_summary"
  | "user_confirmation_required"
  | "advisor_review_required"
  | "unsupported"
  | "conflicting";
export type SessionStatus =
  | "draft"
  | "analysed"
  | "requires_evidence"
  | "ready_for_generation"
  | "generated"
  | "user_review"
  | "advisor_review"
  | "approved"
  | "exported"
  | "archived";
export type CvTemplate =
  | "professional"
  | "technical"
  | "executive"
  | "graduate"
  | "academic"
  | "career_change";
export type TargetFormat =
  | "one_page_cv"
  | "two_page_cv"
  | "extended_academic_cv"
  | "executive_cv"
  | "technical_cv"
  | "graduate_cv";

export interface VacancyRequirement {
  requirementId: string;
  type: RequirementType;
  rawText: string;
  canonicalSkillCode: string | null;
  importance: "mandatory" | "preferred" | "context";
  sourceOffset: { start: number; end: number };
  confidence: number;
}

export interface EvidenceAlignment {
  requirementId: string;
  alignmentStatus: AlignmentStatus;
  profileEvidenceIds: string[];
  confidence: number;
  reason: string;
  evidenceTier: number | null;
}

export interface AtsDocumentInput {
  fileType: "pdf" | "docx" | "text" | "markdown" | "other";
  text: string;
  sectionHeadings: string[];
  dateFormats?: string[];
  tableCount?: number;
  columnCount?: number;
  textBoxCount?: number;
  headerHasCriticalContent?: boolean;
  footerHasCriticalContent?: boolean;
  imageOnlyContent?: boolean;
  embeddedScripts?: boolean;
  hiddenTextDetected?: boolean;
  minimumFontSizePt?: number;
  unsupportedFonts?: string[];
}

export interface AtsFinding {
  findingId: string;
  risk: "critical" | "high" | "medium" | "low" | "informational";
  category: "file" | "layout" | "structure" | "content" | "security";
  title: string;
  description: string;
  affectedSection: string | null;
  recommendation: string;
  evidence: string[];
}

export interface KeywordFinding {
  term: string;
  canonicalSkillCode: string | null;
  state:
    | "present_with_evidence"
    | "present_without_evidence"
    | "missing_but_supported"
    | "missing_and_unsupported"
    | "overused";
  evidenceIds: string[];
}

export interface ClaimValidation {
  claimId: string;
  text: string;
  status: ClaimStatus;
  sourceEvidenceIds: string[];
  reasons: string[];
  automaticallyIncludable: boolean;
}

export interface CvRecommendation {
  recommendationId: string;
  priority: "critical" | "high" | "medium" | "low" | "optional";
  action: string;
  reason: string;
  sourceType: "vacancy_requirement" | "ats_finding" | "claim_quality" | "missing_evidence" | "structural_issue";
  sourceId: string;
  status: "pending" | "accepted" | "rejected" | "deferred";
}

export interface CvAlignmentScore {
  overallScore: number;
  band:
    | "highly_aligned"
    | "well_aligned"
    | "partially_aligned"
    | "weakly_aligned"
    | "substantially_misaligned";
  mandatoryCoverage: number;
  preferredCoverage: number;
  experienceEvidence: number;
  achievementEvidence: number;
  skillsPresentation: number;
  atsStructure: number;
  disclaimer: string;
}

export interface ApplicationAnalysis {
  analysisId: string;
  requirements: VacancyRequirement[];
  alignments: EvidenceAlignment[];
  atsFindings: AtsFinding[];
  keywords: KeywordFinding[];
  recommendations: CvRecommendation[];
  cvAlignment: CvAlignmentScore;
  analysedAt: string;
  engineVersion: "1.0";
}

export interface ProvenancedContent {
  contentId: string;
  text: string;
  claimStatus: ClaimStatus;
  sourceEvidenceIds: string[];
  transformationType: "unchanged" | "concise_rewrite" | "supported_summary" | "reordered";
  generatedBy: "deterministic_template" | "user";
  reviewStatus: "pending" | "user_confirmed" | "advisor_approved" | "rejected";
}

export interface TailoredCvDraft {
  draftId: string;
  sessionId: string;
  draftVersion: number;
  template: CvTemplate;
  targetVacancyId: string;
  sections: {
    contact: { name: string | null; email: string | null; phone: string | null; location: string | null };
    summary: ProvenancedContent | null;
    skills: ProvenancedContent[];
    employment: Array<{
      employmentId: string;
      employer: string | null;
      jobTitle: string | null;
      dates: string | null;
      bullets: ProvenancedContent[];
    }>;
    education: ProvenancedContent[];
    certifications: ProvenancedContent[];
    projects: ProvenancedContent[];
    memberships: ProvenancedContent[];
  };
  claimValidation: ClaimValidation[];
  coverage: { supportedRequirementIds: string[]; missingRequirementIds: string[] };
  reviewStatus: "pending" | "approved" | "revision_required";
  createdAt: string;
  recordVersion: number;
}

export interface RedlineChange {
  changeId: string;
  type:
    | "added_supported_content"
    | "removed_irrelevant_content"
    | "rewritten_content"
    | "reordered_content"
    | "formatting_change"
    | "user_confirmed_change"
    | "advisor_approved_change"
    | "blocked_unsupported_change";
  before: string | null;
  after: string | null;
  reason: string;
  sourceEvidenceIds: string[];
}

export interface ApplicationReadiness {
  score: number;
  blockers: Array<{
    code: string;
    category: "eligibility" | "evidence" | "document_quality" | "user_confirmation";
    message: string;
  }>;
  disclaimer: string;
}

export interface ApplicationEntitlements {
  canAnalyseCvAgainstJob: boolean;
  canViewFullAtsReport: boolean;
  canGenerateTailoredCv: boolean;
  canGenerateMultipleDrafts: boolean;
  canExportDocx: boolean;
  canExportPdf: boolean;
  canGenerateCoverLetter: boolean;
  canGenerateApplicationAnswers: boolean;
  canRequestAdvisorReview: boolean;
  canViewVersionHistory: boolean;
}

export interface OptimisationSession {
  sessionId: string;
  ownerUserId: string;
  profileId: string;
  sourceDocumentId: string;
  vacancyId: string;
  matchResultId: string;
  sessionVersion: "1.0";
  status: SessionStatus;
  targetFormat: TargetFormat;
  targetLocale: string;
  selectedTemplate: CvTemplate;
  profile: CareerProfile;
  vacancy: CanonicalVacancy;
  matchResult: EmployabilityResult;
  sourceCv: AtsDocumentInput;
  analysis: ApplicationAnalysis | null;
  recommendations: CvRecommendation[];
  drafts: TailoredCvDraft[];
  createdAt: string;
  updatedAt: string;
  recordVersion: number;
}
