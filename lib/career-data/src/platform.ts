import { createHash, randomUUID } from "node:crypto";

export type AdvisorScope =
  | "profile_read"
  | "redacted_profile_read"
  | "assessment_read"
  | "plan_read"
  | "plan_comment"
  | "plan_action_review"
  | "opportunity_read"
  | "job_match_read"
  | "cv_analysis_read"
  | "cv_draft_read"
  | "cv_review"
  | "interview_plan_read"
  | "interview_response_read"
  | "interview_review"
  | "evidence_read"
  | "evidence_review"
  | "session_summary_read"
  | "case_manage"
  | "outcome_record";

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

export class CareerDataAuthorizer {
  canRead(
    context: AuthorizationContext,
    resource: OwnedResource,
    grants: AdvisorGrant[],
    scope: AdvisorScope,
    now = new Date(),
  ) {
    if (resource.deletedAt) return false;
    if (resource.ownerUserId === context.actorUserId) return true;
    return grants.some((grant) =>
      grant.ownerUserId === resource.ownerUserId &&
      grant.advisorUserId === context.actorUserId &&
      grant.status === "active" &&
      grant.revokedAt === null &&
      (!grant.expiresAt || new Date(grant.expiresAt) > now) &&
      grant.scopes.includes(scope),
    );
  }

  requireOwner(context: AuthorizationContext, resource: OwnedResource) {
    if (resource.deletedAt || resource.ownerUserId !== context.actorUserId)
      throw platformError("resource_not_found", "Resource was not found.");
  }

  requireScope(
    context: AuthorizationContext,
    resource: OwnedResource,
    grants: AdvisorGrant[],
    scope: AdvisorScope,
    now?: Date,
  ) {
    if (!this.canRead(context, resource, grants, scope, now))
      throw platformError("resource_not_found", "Resource was not found.");
  }
}

export type DocumentRetentionMode =
  | "process_only"
  | "temporary"
  | "persist_document"
  | "persist_profile_only";
export type MalwareScanStatus =
  | "pending"
  | "clean"
  | "infected"
  | "scan_failed"
  | "unsupported";

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
  }): Promise<{ url: string; expiresAt: string }>;
  delete(input: { ownerUserId: number; objectKey: string }): Promise<void>;
  exists(input: { ownerUserId: number; objectKey: string }): Promise<boolean>;
  getMetadata(input: { ownerUserId: number; objectKey: string }): Promise<StoredDocument>;
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

export class UnconfiguredDocumentStorage implements CareerDocumentStorage {
  async put(): Promise<never> { throw platformError("storage_unavailable", "Private object storage is not configured."); }
  async getSignedReadUrl(): Promise<never> { throw platformError("storage_unavailable", "Private object storage is not configured."); }
  async delete(): Promise<never> { throw platformError("storage_unavailable", "Private object storage is not configured."); }
  async exists(): Promise<boolean> { return false; }
  async getMetadata(): Promise<never> { throw platformError("storage_unavailable", "Private object storage is not configured."); }
}

export class SupabasePrivateDocumentStorage implements CareerDocumentStorage {
  constructor(private readonly config: {
    baseUrl: string;
    serviceRoleKey: string;
    bucket: string;
    fetchImplementation?: typeof fetch;
  }) {
    if (!config.baseUrl.startsWith("https://") || !config.serviceRoleKey || !config.bucket)
      throw platformError("storage_unavailable", "Private storage configuration is incomplete.");
  }

  async put(input: PutDocumentInput): Promise<StoredDocument> {
    const objectKey = `${input.ownerUserId}/${input.documentId}/${encodeURIComponent(input.safeFilename)}`;
    const response = await this.request(
      `/storage/v1/object/${encodeURIComponent(this.config.bucket)}/${objectKey}`,
      {
        method: "POST",
        headers: {
          "content-type": input.contentType,
          "x-upsert": "false",
        },
        body: input.bytes,
      },
    );
    if (!response.ok) throw platformError("storage_unavailable", "Private object upload failed.");
    return {
      provider: "supabase_storage",
      objectKey,
      checksum: input.checksum,
      sizeBytes: input.bytes.byteLength,
      private: true as const,
    };
  }

  async getSignedReadUrl(input: {
    ownerUserId: number;
    objectKey: string;
    expiresInSeconds: number;
  }) {
    requireOwnedObjectKey(input.ownerUserId, input.objectKey);
    if (input.expiresInSeconds < 1 || input.expiresInSeconds > 900)
      throw platformError("retention_policy_violation", "Signed URL lifetime is outside policy.");
    const response = await this.request(
      `/storage/v1/object/sign/${encodeURIComponent(this.config.bucket)}/${input.objectKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expiresIn: input.expiresInSeconds }),
      },
    );
    if (!response.ok) throw platformError("storage_unavailable", "Signed read URL could not be created.");
    const result = await response.json() as { signedURL?: string; signedUrl?: string };
    const signedPath = result.signedURL ?? result.signedUrl;
    if (!signedPath) throw platformError("storage_unavailable", "Storage returned no signed URL.");
    return {
      url: new URL(signedPath, this.config.baseUrl).toString(),
      expiresAt: new Date(Date.now() + input.expiresInSeconds * 1000).toISOString(),
    };
  }

  async delete(input: { ownerUserId: number; objectKey: string }) {
    requireOwnedObjectKey(input.ownerUserId, input.objectKey);
    const response = await this.request(
      `/storage/v1/object/${encodeURIComponent(this.config.bucket)}/${input.objectKey}`,
      { method: "DELETE" },
    );
    if (!response.ok && response.status !== 404)
      throw platformError("storage_unavailable", "Private object deletion failed.");
  }

  async exists(input: { ownerUserId: number; objectKey: string }) {
    requireOwnedObjectKey(input.ownerUserId, input.objectKey);
    const response = await this.request(
      `/storage/v1/object/info/${encodeURIComponent(this.config.bucket)}/${input.objectKey}`,
      { method: "GET" },
    );
    if (response.status === 404) return false;
    if (!response.ok) throw platformError("storage_unavailable", "Object metadata lookup failed.");
    return true;
  }

  async getMetadata(input: { ownerUserId: number; objectKey: string }) {
    requireOwnedObjectKey(input.ownerUserId, input.objectKey);
    const response = await this.request(
      `/storage/v1/object/info/${encodeURIComponent(this.config.bucket)}/${input.objectKey}`,
      { method: "GET" },
    );
    if (!response.ok) throw platformError("resource_not_found", "Object was not found.");
    const metadata = await response.json() as {
      size?: number;
      metadata?: { checksum?: string };
    };
    return {
      provider: "supabase_storage",
      objectKey: input.objectKey,
      checksum: metadata.metadata?.checksum ?? "not_available",
      sizeBytes: metadata.size ?? 0,
      private: true as const,
    };
  }

  private request(path: string, init: RequestInit) {
    const fetchImplementation = this.config.fetchImplementation ?? fetch;
    return fetchImplementation(`${this.config.baseUrl.replace(/\/$/, "")}${path}`, {
      ...init,
      headers: {
        authorization: `Bearer ${this.config.serviceRoleKey}`,
        apikey: this.config.serviceRoleKey,
        ...init.headers,
      },
    });
  }
}

export class UnconfiguredMalwareScanner implements MalwareScanner {
  async scan() {
    return {
      status: "unsupported" as const,
      scanner: "not_configured",
      scannedAt: new Date().toISOString(),
      signatureVersion: null,
    };
  }
}

export class HttpMalwareScanner implements MalwareScanner {
  constructor(private readonly config: {
    endpoint: string;
    apiKey: string;
    fetchImplementation?: typeof fetch;
  }) {
    if (!config.endpoint.startsWith("https://") || !config.apiKey)
      throw platformError("storage_unavailable", "Malware scanner configuration is incomplete.");
  }

  async scan(input: {
    bytes: Uint8Array;
    documentId: string;
    contentType: string;
  }) {
    const fetchImplementation = this.config.fetchImplementation ?? fetch;
    const response = await fetchImplementation(this.config.endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        "content-type": input.contentType,
        "x-document-id": input.documentId,
      },
      body: input.bytes,
    });
    if (!response.ok) {
      return {
        status: "scan_failed" as const,
        scanner: "http_scanner",
        scannedAt: new Date().toISOString(),
        signatureVersion: null,
      };
    }
    const result = await response.json() as {
      status?: MalwareScanStatus;
      signatureVersion?: string;
    };
    const allowed = new Set<MalwareScanStatus>([
      "pending", "clean", "infected", "scan_failed", "unsupported",
    ]);
    return {
      status: result.status && allowed.has(result.status)
        ? result.status
        : "scan_failed" as const,
      scanner: "http_scanner",
      scannedAt: new Date().toISOString(),
      signatureVersion: result.signatureVersion ?? null,
    };
  }
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

export const defaultQuotas: CareerDataQuotas = {
  storedDocuments: 10,
  storageBytes: 80 * 1024 * 1024,
  profiles: 5,
  activeGoals: 3,
  assessmentsPerDay: 10,
  plansPerDay: 10,
  advisorGrants: 5,
  exportsPerDay: 5,
};

export interface UploadUsage {
  storedDocuments: number;
  storageBytes: number;
  uploadsInWindow: number;
}

export function validateUploadPolicy(input: {
  context: AuthorizationContext | null;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  retentionMode?: DocumentRetentionMode;
  usage: UploadUsage;
  quotas: CareerDataQuotas;
  maxUploadsPerWindow: number;
}) {
  if (!input.context)
    throw platformError("authentication_required", "Authentication is required.");
  const safeFilename = normalizeFilename(input.fileName);
  const supported = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
  ]);
  if (!supported.has(input.contentType))
    throw platformError("persistence_failed", "Document content type is unsupported.");
  if (input.sizeBytes < 1 || input.sizeBytes > 8 * 1024 * 1024)
    throw platformError("quota_exceeded", "Document exceeds the file-size policy.");
  if (input.usage.storedDocuments >= input.quotas.storedDocuments)
    throw platformError("quota_exceeded", "Stored-document quota is exhausted.");
  if (input.usage.storageBytes + input.sizeBytes > input.quotas.storageBytes)
    throw platformError("quota_exceeded", "Storage quota is exhausted.");
  if (input.usage.uploadsInWindow >= input.maxUploadsPerWindow)
    throw platformError("rate_limit_exceeded", "Upload rate limit exceeded.");
  return {
    safeFilename,
    retentionMode: input.retentionMode ?? "persist_profile_only",
  };
}

export function requireCleanScan(
  status: MalwareScanStatus,
  policy: "production" | "test_allow_unsupported" = "production",
) {
  if (status === "clean") return;
  if (policy === "test_allow_unsupported" && status === "unsupported") return;
  throw platformError("document_not_clean", "Document is not cleared for parsing or retrieval.");
}

export interface RetentionPolicy {
  retentionClass:
    | "temporary_upload"
    | "active_profile"
    | "archived_profile"
    | "source_document"
    | "generated_export"
    | "audit_event"
    | "deletion_tombstone";
  durationDays: number | null;
  expiryAction: "hard_delete" | "soft_delete" | "anonymize" | "retain";
  legalHoldAllowed: boolean;
  auditRequired: boolean;
}

export const retentionPolicies: readonly RetentionPolicy[] = [
  { retentionClass: "temporary_upload", durationDays: 1, expiryAction: "hard_delete", legalHoldAllowed: false, auditRequired: true },
  { retentionClass: "active_profile", durationDays: null, expiryAction: "retain", legalHoldAllowed: true, auditRequired: true },
  { retentionClass: "archived_profile", durationDays: 365, expiryAction: "soft_delete", legalHoldAllowed: true, auditRequired: true },
  { retentionClass: "source_document", durationDays: 365, expiryAction: "hard_delete", legalHoldAllowed: true, auditRequired: true },
  { retentionClass: "generated_export", durationDays: 1, expiryAction: "hard_delete", legalHoldAllowed: false, auditRequired: true },
  { retentionClass: "audit_event", durationDays: 2555, expiryAction: "anonymize", legalHoldAllowed: true, auditRequired: false },
  { retentionClass: "deletion_tombstone", durationDays: 365, expiryAction: "anonymize", legalHoldAllowed: true, auditRequired: false },
];

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

export async function runRetentionCleanup(
  adapter: RetentionAdapter,
  input: { now: string; limit?: number },
) {
  const items = await adapter.listExpired(input.now, Math.min(input.limit ?? 100, 500));
  let processed = 0;
  let alreadyProcessed = 0;
  const failures: Array<{ id: string; category: string }> = [];
  for (const item of items) {
    try {
      const result = await adapter.process(item, input.now);
      if (result === "processed") processed += 1;
      else alreadyProcessed += 1;
      await adapter.audit({
        eventId: `audit_${hash(`${item.type}:${item.id}:${input.now}`)}`,
        eventType: `retention_${item.type}`,
        resourceType: item.type,
        resourceId: item.id,
        timestamp: input.now,
        outcome: result,
      });
    } catch (error) {
      failures.push({
        id: item.id,
        category: (error as { code?: string }).code ?? "retention_failed",
      });
    }
  }
  return { scanned: items.length, processed, alreadyProcessed, failures };
}

export function assertRecordVersion(
  resource: OwnedResource,
  expectedVersion: number,
) {
  if (resource.recordVersion !== expectedVersion)
    throw platformError("record_version_conflict", "Resource version has changed.");
}

export function idempotencyFingerprint(input: {
  ownerUserId: number;
  operation: string;
  idempotencyKey: string;
  stableRequestFields: unknown;
}) {
  if (!input.idempotencyKey || input.idempotencyKey.length > 200)
    throw platformError("persistence_failed", "A valid idempotency key is required.");
  return {
    idempotencyKeyHash: hash(input.idempotencyKey),
    requestFingerprint: hash(JSON.stringify({
      ownerUserId: input.ownerUserId,
      operation: input.operation,
      stableRequestFields: input.stableRequestFields,
    })),
  };
}

export function safeAuditEvent(input: {
  eventType: string;
  actorUserId: number;
  subjectUserId: number;
  resourceType: string;
  resourceId: string;
  requestId: string;
  outcome: string;
  metadata?: Record<string, unknown>;
}) {
  const allowedMetadata = new Set([
    "recordCount", "recordVersion", "taxonomyVersion", "status",
    "durationMs", "errorCategory", "scopeCount", "format",
  ]);
  const metadata = Object.fromEntries(
    Object.entries(input.metadata ?? {}).filter(([key]) => allowedMetadata.has(key)),
  );
  return {
    eventId: `audit_${randomUUID()}`,
    ...input,
    metadata,
  };
}

export function encodeCursor(input: { createdAt: string; id: string }) {
  return Buffer.from(JSON.stringify(input), "utf8").toString("base64url");
}

export function decodeCursor(value?: string) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof parsed.createdAt !== "string" || typeof parsed.id !== "string")
      throw new Error("invalid");
    return parsed as { createdAt: string; id: string };
  } catch {
    throw platformError("persistence_failed", "Pagination cursor is invalid.");
  }
}

export function normalizePageLimit(value: unknown, maximum = 100) {
  const parsed = Number(value ?? 25);
  if (!Number.isInteger(parsed) || parsed < 1)
    throw platformError("persistence_failed", "Pagination limit is invalid.");
  return Math.min(parsed, maximum);
}

export function normalizeFilename(value: string) {
  if (!value || value.includes("/") || value.includes("\\") || value.includes(".."))
    throw platformError("persistence_failed", "Filename is unsafe.");
  return value.normalize("NFKC").replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 180);
}

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function requireOwnedObjectKey(ownerUserId: number, objectKey: string) {
  if (!objectKey.startsWith(`${ownerUserId}/`) || objectKey.includes(".."))
    throw platformError("resource_not_found", "Object was not found.");
}

function platformError(code: string, message: string) {
  return Object.assign(new Error(message), { code });
}
