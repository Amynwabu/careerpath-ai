export const taxonomySourceIds = [
  "uk-soc",
  "esco",
  "onet",
  "professional-bodies",
] as const;

export type TaxonomySourceId = (typeof taxonomySourceIds)[number];
export type TaxonomySourceSelection = TaxonomySourceId | "all";

export type TaxonomySourceType =
  | "uk_soc"
  | "esco"
  | "onet"
  | "professional_body"
  | "internal"
  | "industry_expert";

export type TaxonomyRecordType =
  | "occupation"
  | "occupation_alias"
  | "skill"
  | "skill_alias"
  | "occupation_skill"
  | "skill_relationship"
  | "career_transition"
  | "competency";

export type ReconciliationDecisionType =
  | "matched_existing"
  | "created_new"
  | "merged_sources"
  | "alias_added"
  | "relationship_added"
  | "rejected"
  | "requires_review"
  | "deferred";

export type MappingStatus =
  | "proposed"
  | "automatically_matched"
  | "reviewed"
  | "approved"
  | "rejected"
  | "deprecated";

export interface SourceInput {
  sourceId: TaxonomySourceId;
  inputRoot: string;
  outputRoot: string;
  manifestPath: string;
  mappingDir: string;
  version: string;
  dryRun: boolean;
}

export interface SourceMetadata {
  sourceId: TaxonomySourceId;
  sourceName: string;
  sourceType: TaxonomySourceType;
  sourceVersion: string;
  publisher: string;
  sourceUrl: string;
  downloadUrl: string;
  licenceName: string;
  licenceUrl: string;
  retrievedAt: string;
  checksum: string;
  fileName: string;
  fileFormat: string;
  language: string;
  country: string;
  permittedUseNotes: string;
  adapterVersion: string;
  rawFileCommitted: boolean;
  redistributionAllowed: boolean;
  fileSizeBytes?: number;
  recordCount?: number;
  encoding?: string;
  localPath?: string;
  sourceRole?: string;
}

export interface SourceInspection {
  sourceId: TaxonomySourceId;
  adapterVersion: string;
  expectedFiles: string[];
  discoveredFiles: string[];
  missingFiles: string[];
  metadata: SourceMetadata[];
  warnings: string[];
}

export interface SourceValidationResult {
  sourceId: TaxonomySourceId;
  ok: boolean;
  errors: string[];
  warnings: string[];
  recordCount: number;
  rejectedCount: number;
  metadata: SourceMetadata[];
  files: Array<{
    fileName: string;
    accepted: boolean;
    expectedColumns: string[];
    missingColumns: string[];
    recordCount: number;
    encoding: string;
    checksum: string;
  }>;
}

export interface RawSourceRecord {
  sourceId: TaxonomySourceId;
  sourceType: TaxonomySourceType;
  sourceRecordId: string;
  sourceVersion: string;
  recordType: TaxonomyRecordType;
  fileName: string;
  rowNumber: number;
  original: Record<string, string>;
  sourceChecksum: string;
  retrievedAt: string;
}

export interface SourceProvenance {
  sourceId: TaxonomySourceId;
  sourceType: TaxonomySourceType;
  sourceName: string;
  sourceRecordId: string;
  sourceVersion: string;
  sourceUrl: string;
  licenceName: string;
  licenceUrl: string;
  retrievedAt: string;
  sourceChecksum: string;
  adapterVersion: string;
}

export interface NormalisedAttributes {
  baseRole?: string;
  seniority?: string;
  discipline?: string;
  sector?: string;
  specialism?: string;
  managementScope?: string;
  deliveryContext?: string;
  geography?: string;
  skillCategory?: string;
  requirementType?: string;
  requiredLevel?: number;
  importanceWeight?: number;
  relationshipType?: string;
  targetSourceRecordId?: string;
  transitionType?: string;
  difficultyScore?: number;
  transferabilityScore?: number;
  minimumReadinessScore?: number;
  plannedCpxCode?: string;
  plannedMatchConfidence?: number;
  selectionReason?: string;
  careerLevel?: string;
  principalUkContext?: string;
  regulated?: boolean;
  humanReviewMandatory?: boolean;
}

export interface NormalisedSourceRecord {
  sourceId: TaxonomySourceId;
  sourceType: TaxonomySourceType;
  sourceRecordId: string;
  sourceVersion: string;
  recordType: TaxonomyRecordType;
  preferredLabel: string;
  normalisedLabel: string;
  alternativeLabels: string[];
  description: string;
  externalCodes: Record<string, string>;
  parentIdentifiers: string[];
  relatedIdentifiers: string[];
  country: string;
  language: string;
  rawAttributes: Record<string, string>;
  sourceChecksum: string;
  retrievedAt: string;
  provenance: SourceProvenance;
  attributes: NormalisedAttributes;
}

export interface CuratedMapping {
  sourceId: string;
  sourceRecordId: string;
  careerpathxCode: string;
  mappingType: string;
  confidence: number;
  mappingStatus: MappingStatus;
  reviewedBy: string;
  reviewedAt: string;
  notes: string;
}

export interface CandidateCanonicalRecord {
  code: string;
  entityType: "occupation" | "skill";
  label: string;
  normalisedLabel: string;
  sourceRecordIds: string[];
  sourceIds: string[];
  externalCodes: Record<string, string>;
  description: string;
  familyCode?: string;
  skillCategory?: string;
  careerLevel?: string;
  principalUkContext?: string;
  regulated?: boolean;
  humanReviewMandatory?: boolean;
  verificationStatus?: string;
}

export interface MatchingFactor {
  name: string;
  score: number;
  weight: number;
  detail: string;
}

export interface ReconciliationDecision {
  decisionId: string;
  entityType:
    | "occupation"
    | "skill"
    | "relationship"
    | "requirement"
    | "transition";
  sourceId: TaxonomySourceId;
  sourceRecordId: string;
  candidateCanonicalId: string;
  decision: ReconciliationDecisionType;
  confidence: number;
  matchingFactors: MatchingFactor[];
  conflicts: string[];
  reviewReason: string;
  adapterVersion: string;
  rulesVersion: string;
  createdAt: string;
}

export interface PipelineStats {
  sourceId: string;
  discovered: number;
  accepted: number;
  rejected: number;
  requiresReview: number;
  warnings: string[];
}
