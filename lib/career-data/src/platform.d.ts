export type AdvisorScope = "profile_read" | "redacted_profile_read" | "assessment_read" | "plan_read" | "plan_comment" | "plan_action_review" | "opportunity_read" | "job_match_read" | "cv_analysis_read" | "cv_draft_read" | "cv_review" | "interview_plan_read" | "interview_response_read" | "interview_review" | "evidence_read" | "evidence_review" | "session_summary_read" | "case_manage" | "outcome_record";
export interface AuthorizationContext {
    actorUserId: number;
    actorRole: "user" | "premium" | "coach" | "admin";
    requestId: string;
}
export interface OwnedResource {
    id: string;
    ownerUserId: number;
    deletedAt?: string | Date | null;
    recordVersion: number;
}
export interface AdvisorGrant {
    id: string;
    ownerUserId: number;
    advisorUserId: number;
    scopes: AdvisorScope[];
    status: "active" | "revoked" | "expired";
    expiresAt: string | null;
    revokedAt: string | null;
}
export declare class CareerDataAuthorizer {
    canRead(context: AuthorizationContext, resource: OwnedResource, grants: AdvisorGrant[], scope: AdvisorScope, now?: Date): boolean;
    requireOwner(context: AuthorizationContext, resource: OwnedResource): void;
    requireScope(context: AuthorizationContext, resource: OwnedResource, grants: AdvisorGrant[], scope: AdvisorScope, now?: Date): void;
}
export type DocumentRetentionMode = "process_only" | "temporary" | "persist_document" | "persist_profile_only";
export type MalwareScanStatus = "pending" | "clean" | "infected" | "scan_failed" | "unsupported";
export interface PutDocumentInput {
    ownerUserId: number;
    documentId: string;
    bytes: Uint8Array;
    safeFilename: string;
    contentType: string;
    checksum: string;
    retentionMode: DocumentRetentionMode;
}
export interface StoredDocument {
    provider: string;
    objectKey: string;
    checksum: string;
    sizeBytes: number;
    private: true;
}
export interface CareerDocumentStorage {
    put(input: PutDocumentInput): Promise<StoredDocument>;
    getSignedReadUrl(input: {
        ownerUserId: number;
        objectKey: string;
        expiresInSeconds: number;
    }): Promise<{
        url: string;
        expiresAt: string;
    }>;
    delete(input: {
        ownerUserId: number;
        objectKey: string;
    }): Promise<void>;
    exists(input: {
        ownerUserId: number;
        objectKey: string;
    }): Promise<boolean>;
    getMetadata(input: {
        ownerUserId: number;
        objectKey: string;
    }): Promise<StoredDocument>;
}
export interface MalwareScanner {
    scan(input: {
        bytes: Uint8Array;
        documentId: string;
        contentType: string;
    }): Promise<{
        status: MalwareScanStatus;
        scanner: string;
        scannedAt: string;
        signatureVersion: string | null;
    }>;
}
export declare class UnconfiguredDocumentStorage implements CareerDocumentStorage {
    put(): Promise<never>;
    getSignedReadUrl(): Promise<never>;
    delete(): Promise<never>;
    exists(): Promise<boolean>;
    getMetadata(): Promise<never>;
}
export declare class SupabasePrivateDocumentStorage implements CareerDocumentStorage {
    private readonly config;
    constructor(config: {
        baseUrl: string;
        serviceRoleKey: string;
        bucket: string;
        fetchImplementation?: typeof fetch;
    });
    put(input: PutDocumentInput): Promise<StoredDocument>;
    getSignedReadUrl(input: {
        ownerUserId: number;
        objectKey: string;
        expiresInSeconds: number;
    }): Promise<{
        url: string;
        expiresAt: string;
    }>;
    delete(input: {
        ownerUserId: number;
        objectKey: string;
    }): Promise<void>;
    exists(input: {
        ownerUserId: number;
        objectKey: string;
    }): Promise<boolean>;
    getMetadata(input: {
        ownerUserId: number;
        objectKey: string;
    }): Promise<{
        provider: string;
        objectKey: string;
        checksum: string;
        sizeBytes: number;
        private: true;
    }>;
    private request;
}
export declare class UnconfiguredMalwareScanner implements MalwareScanner {
    scan(): Promise<{
        status: "unsupported";
        scanner: string;
        scannedAt: string;
        signatureVersion: null;
    }>;
}
export declare class HttpMalwareScanner implements MalwareScanner {
    private readonly config;
    constructor(config: {
        endpoint: string;
        apiKey: string;
        fetchImplementation?: typeof fetch;
    });
    scan(input: {
        bytes: Uint8Array;
        documentId: string;
        contentType: string;
    }): Promise<{
        status: MalwareScanStatus;
        scanner: string;
        scannedAt: string;
        signatureVersion: string | null;
    }>;
}
export interface Entitlements {
    canPersistProfile: boolean;
    canUploadCV: boolean;
    canGenerateAssessment: boolean;
    canGenerateActionPlan: boolean;
    canCompareTargets: boolean;
    canShareWithAdvisor: boolean;
    canStoreEvidence: boolean;
    canExportAdvancedReport: boolean;
}
export interface EntitlementProvider {
    get(userId: number): Promise<Entitlements>;
}
export interface CareerDataQuotas {
    storedDocuments: number;
    storageBytes: number;
    profiles: number;
    activeGoals: number;
    assessmentsPerDay: number;
    plansPerDay: number;
    advisorGrants: number;
    exportsPerDay: number;
}
export interface QuotaProvider {
    get(userId: number): Promise<CareerDataQuotas>;
}
export declare const defaultQuotas: CareerDataQuotas;
export interface UploadUsage {
    storedDocuments: number;
    storageBytes: number;
    uploadsInWindow: number;
}
export declare function validateUploadPolicy(input: {
    context: AuthorizationContext | null;
    fileName: string;
    contentType: string;
    sizeBytes: number;
    retentionMode?: DocumentRetentionMode;
    usage: UploadUsage;
    quotas: CareerDataQuotas;
    maxUploadsPerWindow: number;
}): {
    safeFilename: string;
    retentionMode: DocumentRetentionMode;
};
export declare function requireCleanScan(status: MalwareScanStatus, policy?: "production" | "test_allow_unsupported"): void;
export interface RetentionPolicy {
    retentionClass: "temporary_upload" | "active_profile" | "archived_profile" | "source_document" | "generated_export" | "career_workflow" | "short_lived_export" | "audit_event" | "deletion_tombstone";
    durationDays: number | null;
    expiryAction: "hard_delete" | "soft_delete" | "anonymize" | "retain";
    legalHoldAllowed: boolean;
    auditRequired: boolean;
}
export declare const retentionPolicies: readonly RetentionPolicy[];
export interface RetentionWorkItem {
    id: string;
    type: "document" | "export" | "advisor_grant" | "idempotency" | "deletion_request";
    expiresAt: string;
    state: string;
}
export interface RetentionAdapter {
    listExpired(now: string, limit: number): Promise<RetentionWorkItem[]>;
    process(item: RetentionWorkItem, now: string): Promise<"processed" | "already_processed">;
    audit(input: {
        eventId: string;
        eventType: string;
        resourceType: string;
        resourceId: string;
        timestamp: string;
        outcome: string;
    }): Promise<void>;
}
export declare function runRetentionCleanup(adapter: RetentionAdapter, input: {
    now: string;
    limit?: number;
}): Promise<{
    scanned: number;
    processed: number;
    alreadyProcessed: number;
    failures: {
        id: string;
        category: string;
    }[];
}>;
export declare function assertRecordVersion(resource: OwnedResource, expectedVersion: number): void;
export declare function idempotencyFingerprint(input: {
    ownerUserId: number;
    operation: string;
    idempotencyKey: string;
    stableRequestFields: unknown;
}): {
    idempotencyKeyHash: string;
    requestFingerprint: string;
};
export declare function safeAuditEvent(input: {
    eventType: string;
    actorUserId: number;
    subjectUserId: number;
    resourceType: string;
    resourceId: string;
    requestId: string;
    outcome: string;
    metadata?: Record<string, unknown>;
}): {
    metadata: {
        [k: string]: unknown;
    };
    eventType: string;
    actorUserId: number;
    subjectUserId: number;
    resourceType: string;
    resourceId: string;
    requestId: string;
    outcome: string;
    eventId: string;
};
export declare function encodeCursor(input: {
    createdAt: string;
    id: string;
}): string;
export declare function decodeCursor(value?: string): {
    createdAt: string;
    id: string;
} | null;
export declare function normalizePageLimit(value: unknown, maximum?: number): number;
export declare function normalizeFilename(value: string): string;
