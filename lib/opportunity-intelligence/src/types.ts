import type {
  CareerIntelligenceEngine,
  PublishedTaxonomySnapshot,
} from "@workspace/career-intelligence";
import type { CareerProfile } from "@workspace/career-profile";

export type VacancySource =
  | "manual"
  | "employer_portal"
  | "csv"
  | "json"
  | "xml"
  | "rest_api";
export type RemoteType = "On-site" | "Hybrid" | "Remote";
export type EmploymentType =
  | "Permanent"
  | "Fixed-term"
  | "Contract"
  | "Temporary"
  | "Internship"
  | "Apprenticeship";
export type Seniority =
  | "Graduate"
  | "Junior"
  | "Mid"
  | "Senior"
  | "Principal"
  | "Lead"
  | "Head"
  | "Director"
  | "Executive"
  | "Unspecified";

export interface RawVacancy {
  jobId?: string;
  source: VacancySource;
  sourceReference: string;
  title: string;
  description: string;
  location?: string;
  remoteType?: string;
  employmentType?: string;
  workingPattern?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryPeriod?: "hourly" | "daily" | "weekly" | "monthly" | "annual";
  currency?: string;
  postedDate: string;
  expiryDate?: string;
  applicationUrl?: string;
  requiredSkills?: string[];
  preferredSkills?: string[];
  qualifications?: string[];
  certifications?: string[];
  responsibilities?: string[];
  benefits?: string[];
  visaSponsorship?: boolean;
  securityClearance?: boolean;
  industry?: string;
  occupationCode?: string;
  taxonomyVersion?: string;
}

export interface CanonicalVacancy extends Required<
  Pick<
    RawVacancy,
    | "source"
    | "sourceReference"
    | "title"
    | "description"
    | "postedDate"
  >
> {
  jobId: string;
  original: RawVacancy;
  location: string | null;
  remoteType: RemoteType;
  employmentType: EmploymentType;
  workingPattern: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryPeriod: "annual" | "unknown";
  currency: string | null;
  expiryDate: string | null;
  applicationUrl: string | null;
  occupationCode: string;
  occupationTitle: string;
  careerFamily: string;
  seniority: Seniority;
  requiredSkills: string[];
  preferredSkills: string[];
  unresolvedRequiredSkills: string[];
  unresolvedPreferredSkills: string[];
  qualifications: string[];
  certifications: string[];
  responsibilities: string[];
  benefits: string[];
  visaSponsorship: boolean | null;
  securityClearance: boolean | null;
  industry: string | null;
  taxonomyVersion: string;
  normalizedAt: string;
}

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface MatchWeights {
  skills: number;
  experience: number;
  qualifications: number;
  certifications: number;
  location: number;
  salary: number;
  careerGoal: number;
}

export interface MatchPreferences {
  desiredOccupationCode?: string;
  location?: string;
  remoteTypes?: RemoteType[];
  salaryMin?: number;
  industries?: string[];
  employmentTypes?: EmploymentType[];
  visaSponsorshipRequired?: boolean;
  securityClearanceHeld?: boolean;
  maxDistanceKm?: number;
}

export interface RequirementGap {
  kind:
    | "critical_skill"
    | "preferred_skill"
    | "experience"
    | "qualification"
    | "certification"
    | "evidence";
  requirement: string;
  evidence: string[];
  action: string;
}

export interface EmployabilityResult {
  jobId: string;
  overallScore: number;
  matchBand:
    | "Perfect Match"
    | "Excellent Match"
    | "Strong Match"
    | "Moderate Match"
    | "Weak Match"
    | "Poor Match";
  confidence: number;
  skillMatch: number;
  experienceMatch: number;
  qualificationMatch: number;
  certificationMatch: number;
  locationMatch: number;
  salaryMatch: number;
  careerGoalMatch: number;
  strengths: Array<{ requirement: string; evidence: string[] }>;
  gaps: RequirementGap[];
  explanations: string[];
  taxonomyVersion: string;
  disclaimer: string;
}

export interface MatchInput {
  profile: CareerProfile;
  vacancy: CanonicalVacancy;
  preferences?: MatchPreferences;
  weights?: Partial<MatchWeights>;
  experienceYears?: number;
  qualifications?: string[];
  certifications?: string[];
}

export interface OpportunityContext {
  taxonomy: PublishedTaxonomySnapshot;
  resolver: CareerIntelligenceEngine;
  now?: Date;
}

export interface OpportunityFilters {
  minimumSalary?: number;
  remoteTypes?: RemoteType[];
  industries?: string[];
  employmentTypes?: EmploymentType[];
  visaSponsorship?: boolean;
  securityClearance?: boolean;
  location?: string;
  postedSince?: string;
}

export interface RankedOpportunity {
  vacancy: CanonicalVacancy;
  match: EmployabilityResult;
  rankScore: number;
  rankReasons: string[];
}

export interface Entitlements {
  canViewMatches: boolean;
  canViewTop10Jobs: boolean;
  canViewUnlimitedJobs: boolean;
  canCompareJobs: boolean;
  canExportMatches: boolean;
  canAdvisorReview: boolean;
}
