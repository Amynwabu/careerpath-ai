export type PublishedTaxonomyStatus = "published" | "published_local";

export interface IntelligenceSkill {
  code: string;
  name: string;
  aliases: string[];
  category: string;
  description: string;
}

export interface SkillRequirement {
  skillCode: string;
  requirementType: "essential" | "important" | "supporting" | "optional";
  requiredLevel: number;
  weight: number;
  evidence: string[];
}

export interface IntelligenceOccupation {
  code: string;
  title: string;
  family: string;
  level: string;
  description: string;
  aliases: Array<{
    value: string;
    exactMatchAllowed: boolean;
    context?: string;
  }>;
  requirements: SkillRequirement[];
  minimumExperienceYears?: number;
  qualificationCodes?: string[];
}

export interface IntelligenceTransition {
  fromOccupationCode: string;
  toOccupationCode: string;
  type: string;
  difficulty: number;
  transferability: number;
  estimatedExperience: string;
  evidence: string[];
  reviewStatus: "approved";
}

export interface LearningResource {
  code: string;
  title: string;
  type:
    | "course"
    | "project"
    | "certification"
    | "professional_membership"
    | "mentoring"
    | "experience";
  skillCodes: string[];
  evidence: string[];
}

export interface PublishedTaxonomySnapshot {
  version: string;
  status: PublishedTaxonomyStatus;
  occupations: IntelligenceOccupation[];
  skills: IntelligenceSkill[];
  transitions: IntelligenceTransition[];
  learningResources: LearningResource[];
  checksum: string;
}

export interface TaxonomyProvider {
  getPublishedSnapshot(version?: string): Promise<PublishedTaxonomySnapshot>;
}

export interface ResolvedSkill {
  skillCode: string;
  canonicalName: string;
  category: string;
  confidence: number;
  sourceText: string;
  extractionType: "explicit" | "alias" | "implicit";
  evidence: string[];
}
