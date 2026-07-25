import type { ResolvedSkill } from "@workspace/career-intelligence";

export type FileType = "pdf" | "docx" | "text" | "markdown";
export type RetentionMode = "process_only" | "temporary" | "persist_profile";
export type EvidenceState =
  | "known"
  | "inferred"
  | "ambiguous"
  | "missing"
  | "conflicting"
  | "user_confirmed";

export interface SourceReference {
  referenceId: string;
  fieldPath: string;
  documentId: string;
  page: number | null;
  startOffset: number;
  endOffset: number;
  sourceText: string;
  extractor: string;
  extractorVersion: "1.0";
  confidence: number;
}

export interface DocumentBlock {
  blockId: string;
  type: "heading" | "paragraph" | "list_item" | "page_break" | "table";
  text: string;
  startOffset: number;
  endOffset: number;
  page: number | null;
}

export interface ExtractedDocument {
  documentId: string;
  fileSizeBytes: number;
  fileType: FileType;
  pageCount: number | null;
  originalText: string;
  text: string;
  blocks: DocumentBlock[];
  warnings: string[];
  extractionStatus: "complete" | "ocr_required" | "rejected";
  extractionConfidence: number;
  retentionMode: RetentionMode;
}

export interface DetectedSection {
  sectionId: string;
  sectionType: string;
  heading: string;
  startOffset: number;
  endOffset: number;
  confidence: number;
  text: string;
}

export interface NormalizedDateRange {
  raw: string;
  start: string | null;
  end: string | null;
  precision: "month" | "year" | "season" | "unknown";
  confidence: number;
}

export interface EmploymentEpisode {
  employmentId: string;
  employer: string | null;
  jobTitle: string | null;
  location: string | null;
  dates: NormalizedDateRange | null;
  isCurrent: boolean;
  durationMonths: number | null;
  summary: string;
  responsibilities: string[];
  achievements: string[];
  projects: string[];
  tools: string[];
  skillEvidence: string[];
  sourceReferences: string[];
  evidenceState: EvidenceState;
}

export interface EducationEpisode {
  educationId: string;
  institution: string | null;
  qualification: string | null;
  subject: string | null;
  classification: string | null;
  dates: NormalizedDateRange | null;
  status: string | null;
  location: string | null;
  sourceReferences: string[];
}

export interface CredentialEvidence {
  credentialId: string;
  name: string;
  issuingOrganisation: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  credentialIdentifier: string | null;
  status: "current" | "expired" | "unknown";
  type:
    | "certification"
    | "training"
    | "licence"
    | "professional_registration"
    | "membership"
    | "unknown";
  sourceReferences: string[];
}

export interface ProjectEvidence {
  projectId: string;
  projectName: string | null;
  organisation: string | null;
  role: string | null;
  industry: string | null;
  location: string | null;
  dates: NormalizedDateRange | null;
  projectValue: null;
  technologies: string[];
  responsibilities: string[];
  outcomes: string[];
  skillEvidence: string[];
  sourceReferences: string[];
}

export interface AchievementEvidence {
  achievementId: string;
  statement: string;
  metricType: string;
  value: number | null;
  unit: string | null;
  confidence: number;
  sourceText: string;
  sourceReferences: string[];
}

export interface RawSkillEvidence {
  evidenceId: string;
  rawSkill: string;
  sourceText: string;
  section: string;
  employmentId: string | null;
  evidenceType:
    | "explicit"
    | "responsibility"
    | "achievement"
    | "project"
    | "tool_usage"
    | "qualification"
    | "certification"
    | "inferred_context";
  confidence: number;
  ruleId: string | null;
  sourceReferences: string[];
  state: EvidenceState;
}

export interface CareerProfile {
  profileVersion: "1.0";
  profileId: string;
  sourceDocumentIds: string[];
  personalData: {
    name: string | null;
    email: string | null;
    phone: string | null;
    location: string | null;
    personalUrls: string[];
  };
  summary: string;
  employment: EmploymentEpisode[];
  education: EducationEpisode[];
  certifications: CredentialEvidence[];
  professionalMemberships: CredentialEvidence[];
  projects: ProjectEvidence[];
  achievements: AchievementEvidence[];
  languages: string[];
  rawSkillEvidence: RawSkillEvidence[];
  resolvedSkills: ResolvedSkill[];
  occupationResolution: unknown | null;
  occupationEvidence: {
    titles: Array<{
      title: string;
      employmentId: string;
      isCurrent: boolean;
    }>;
    industries: string[];
    rawSkillTerms: string[];
    senioritySignals: string[];
  };
  careerPreferences: {
    desiredOccupation: string | null;
    desiredCareerHorizon: string | null;
  } | null;
  warnings: string[];
  provenance: SourceReference[];
  confidence: {
    textExtraction: number;
    sectionDetection: number;
    fieldExtraction: number;
    evidence: number;
    taxonomyResolution: number | null;
    profileCompleteness: {
      overall: number;
      employment: number;
      education: number;
      skills: number;
      certifications: number;
      careerGoal: number;
    };
  };
  corrections: ProfileCorrection[];
  retentionMode: RetentionMode;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileCorrection {
  correctionId: string;
  fieldPath: string;
  originalValue: unknown;
  correctedValue: unknown;
  correctedBy: string;
  correctedAt: string;
  correctionReason: string;
  markPrivate: boolean;
}

export interface ProfileValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  reviewItems: string[];
}
