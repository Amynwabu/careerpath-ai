import { describe, expect, it, vi } from "vitest";
import {
  CareerDataAuthorizer,
  DeterministicStagingMalwareScanner,
  assertRecordVersion,
  decodeCursor,
  defaultQuotas,
  encodeCursor,
  idempotencyFingerprint,
  normalizeFilename,
  normalizePageLimit,
  requireCleanScan,
  runRetentionCleanup,
  safeAuditEvent,
  SupabasePrivateDocumentStorage,
  HttpMalwareScanner,
  validateUploadPolicy,
  validateFileSignature,
  type AdvisorGrant,
  type AuthorizationContext,
  type RetentionWorkItem,
} from "./platform";

const owner: AuthorizationContext = {
  actorUserId: 1,
  actorRole: "user",
  requestId: "request-owner",
};
const advisor: AuthorizationContext = {
  actorUserId: 2,
  actorRole: "coach",
  requestId: "request-advisor",
};
const resource = {
  id: "profile-fixture",
  ownerUserId: 1,
  recordVersion: 2,
  deletedAt: null,
};
const grant: AdvisorGrant = {
  id: "grant-fixture",
  ownerUserId: 1,
  advisorUserId: 2,
  scopes: ["redacted_profile_read", "plan_read"],
  status: "active",
  expiresAt: "2027-01-01T00:00:00.000Z",
  revokedAt: null,
};

describe("career-data platform controls", () => {
  const authorizer = new CareerDataAuthorizer();

  it("allows owners and denies cross-user IDOR attempts without leaking existence", () => {
    expect(authorizer.canRead(owner, resource, [], "profile_read")).toBe(true);
    expect(() => authorizer.requireOwner(advisor, resource)).toThrow("Resource was not found.");
  });

  it("allows only active, scoped advisor access", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    expect(authorizer.canRead(advisor, resource, [grant], "plan_read", now)).toBe(true);
    expect(authorizer.canRead(advisor, resource, [grant], "assessment_read", now)).toBe(false);
    expect(authorizer.canRead(advisor, resource, [{ ...grant, status: "revoked" }], "plan_read", now)).toBe(false);
    expect(authorizer.canRead(advisor, resource, [{ ...grant, expiresAt: "2025-01-01T00:00:00.000Z" }], "plan_read", now)).toBe(false);
  });

  it("prevents redacted scope escalation to full profile access", () => {
    expect(authorizer.canRead(advisor, resource, [grant], "redacted_profile_read", new Date("2026-01-01"))).toBe(true);
    expect(authorizer.canRead(advisor, resource, [grant], "profile_read", new Date("2026-01-01"))).toBe(false);
  });

  it("rejects unauthenticated, unsafe, oversized, spoofed, quota and rate-limited uploads", () => {
    const valid = {
      context: owner,
      fileName: "fixture.pdf",
      contentType: "application/pdf",
      sizeBytes: 1024,
      usage: { storedDocuments: 0, storageBytes: 0, uploadsInWindow: 0 },
      quotas: defaultQuotas,
      maxUploadsPerWindow: 5,
    };
    expect(validateUploadPolicy(valid)).toMatchObject({
      safeFilename: "fixture.pdf",
      retentionMode: "persist_profile_only",
    });
    expect(() => validateUploadPolicy({ ...valid, context: null })).toThrow("Authentication");
    expect(() => validateUploadPolicy({ ...valid, fileName: "../fixture.pdf" })).toThrow("unsafe");
    expect(() => validateUploadPolicy({ ...valid, contentType: "application/x-msdownload" })).toThrow("unsupported");
    expect(() => validateUploadPolicy({ ...valid, sizeBytes: 9 * 1024 * 1024 })).toThrow("file-size");
    expect(() => validateUploadPolicy({ ...valid, usage: { ...valid.usage, storedDocuments: 10 } })).toThrow("quota");
    expect(() => validateUploadPolicy({ ...valid, usage: { ...valid.usage, uploadsInWindow: 5 } })).toThrow("rate limit");
  });

  it("fails closed until malware scan state is clean", () => {
    expect(() => requireCleanScan("clean")).not.toThrow();
    for (const status of ["pending", "infected", "scan_failed", "unsupported"] as const)
      expect(() => requireCleanScan(status)).toThrow("not cleared");
    expect(() => requireCleanScan("unsupported", "test_allow_unsupported")).not.toThrow();
  });

  it("keeps the deterministic staging scanner fixture-only", async () => {
    const scanner = new DeterministicStagingMalwareScanner();
    const scan = (bytes: string) => scanner.scan({
      bytes: new TextEncoder().encode(bytes),
      documentId: "synthetic-document",
      contentType: "application/pdf",
    });
    await expect(scan("CPX_SYNTHETIC_CLEAN_FIXTURE")).resolves.toMatchObject({
      status: "clean", scanner: "deterministic_staging_fixture",
    });
    await expect(scan("EICAR-STAGING-FIXTURE")).resolves.toMatchObject({
      status: "infected",
    });
    await expect(scan("ordinary bytes")).resolves.toMatchObject({
      status: "scan_failed",
    });
  });

  it("validates document magic bytes against the declared MIME type", () => {
    expect(() => validateFileSignature(
      new TextEncoder().encode("%PDF-1.7 CPX_SYNTHETIC_CLEAN_FIXTURE"),
      "application/pdf",
    )).not.toThrow();
    expect(() => validateFileSignature(
      new TextEncoder().encode("not a pdf"),
      "application/pdf",
    )).toThrow("signature");
    expect(() => validateFileSignature(
      Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x01]),
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )).not.toThrow();
  });

  it("detects concurrent update conflicts", () => {
    expect(() => assertRecordVersion(resource, 2)).not.toThrow();
    expect(() => assertRecordVersion(resource, 1)).toThrow("version has changed");
  });

  it("fingerprints idempotency without retaining request bodies or keys", () => {
    const first = idempotencyFingerprint({
      ownerUserId: 1,
      operation: "create_profile",
      idempotencyKey: "fixture-key",
      stableRequestFields: { profileId: "fixture" },
    });
    const replay = idempotencyFingerprint({
      ownerUserId: 1,
      operation: "create_profile",
      idempotencyKey: "fixture-key",
      stableRequestFields: { profileId: "fixture" },
    });
    const changed = idempotencyFingerprint({
      ownerUserId: 1,
      operation: "create_profile",
      idempotencyKey: "fixture-key",
      stableRequestFields: { profileId: "different" },
    });
    expect(first).toEqual(replay);
    expect(first.idempotencyKeyHash).not.toContain("fixture-key");
    expect(first.requestFingerprint).not.toBe(changed.requestFingerprint);
  });

  it("runs retention cleanup idempotently and reports safe failures", async () => {
    const items: RetentionWorkItem[] = [
      { id: "expired-document", type: "document", expiresAt: "2026-01-01", state: "active" },
      { id: "already-deleted", type: "export", expiresAt: "2026-01-01", state: "deleted" },
      { id: "failed-grant", type: "advisor_grant", expiresAt: "2026-01-01", state: "active" },
    ];
    const audit = vi.fn();
    const result = await runRetentionCleanup({
      async listExpired() { return items; },
      async process(item) {
        if (item.id === "failed-grant") throw Object.assign(new Error("fixture"), { code: "database_unavailable" });
        return item.id === "already-deleted" ? "already_processed" : "processed";
      },
      audit,
    }, { now: "2026-01-02T00:00:00.000Z" });
    expect(result).toEqual({
      scanned: 3,
      processed: 1,
      alreadyProcessed: 1,
      failures: [{ id: "failed-grant", category: "database_unavailable" }],
    });
    expect(audit).toHaveBeenCalledTimes(2);
  });

  it("removes personal values from audit metadata", () => {
    const event = safeAuditEvent({
      eventType: "profile_export",
      actorUserId: 1,
      subjectUserId: 1,
      resourceType: "profile",
      resourceId: "fixture",
      requestId: "request",
      outcome: "success",
      metadata: {
        recordCount: 2,
        email: "synthetic@example.invalid",
        cvText: "private fixture text",
        objectKey: "private/key",
        accessToken: "secret",
      },
    });
    expect(event.metadata).toEqual({ recordCount: 2 });
    expect(JSON.stringify(event)).not.toContain("example.invalid");
    expect(JSON.stringify(event)).not.toContain("private/key");
  });

  it("normalizes pagination and safe filenames deterministically", () => {
    const cursor = encodeCursor({ createdAt: "2026-01-01", id: "fixture" });
    expect(decodeCursor(cursor)).toEqual({ createdAt: "2026-01-01", id: "fixture" });
    expect(() => decodeCursor("not-a-cursor")).toThrow("cursor is invalid");
    expect(normalizePageLimit(500)).toBe(100);
    expect(normalizeFilename("fixture résumé.pdf")).toBe("fixture r_sum_.pdf");
  });

  it("keeps Supabase objects private and owner-bound with short-lived signed URLs", async () => {
    const fetchImplementation = vi.fn()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ signedURL: "/signed/fixture" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 404 }));
    const storage = new SupabasePrivateDocumentStorage({
      baseUrl: "https://storage.example.invalid",
      serviceRoleKey: "fixture-secret",
      bucket: "private-career-documents",
      fetchImplementation,
    });
    const stored = await storage.put({
      ownerUserId: 1,
      documentId: "document-fixture",
      bytes: new Uint8Array([1, 2, 3]),
      safeFilename: "fixture.pdf",
      contentType: "application/pdf",
      checksum: "fixture-checksum",
      retentionMode: "temporary",
    });
    expect(stored.private).toBe(true);
    expect(stored.objectKey).toMatch(/^1\//);
    const signed = await storage.getSignedReadUrl({
      ownerUserId: 1,
      objectKey: stored.objectKey,
      expiresInSeconds: 60,
    });
    expect(signed.url).toContain("/signed/fixture");
    await expect(storage.getSignedReadUrl({
      ownerUserId: 2,
      objectKey: stored.objectKey,
      expiresInSeconds: 60,
    })).rejects.toMatchObject({ code: "resource_not_found" });
    await storage.delete({ ownerUserId: 1, objectKey: stored.objectKey });
    await expect(storage.exists({ ownerUserId: 1, objectKey: stored.objectKey })).resolves.toBe(false);
    expect(JSON.stringify(fetchImplementation.mock.calls)).not.toContain("fixture.pdf?token=");
  });

  it("accepts only explicit scanner states and treats scanner failures as unclean", async () => {
    const scanner = new HttpMalwareScanner({
      endpoint: "https://scanner.example.invalid/scan",
      apiKey: "fixture-key",
      fetchImplementation: vi.fn().mockResolvedValue(
        new Response(JSON.stringify({
          status: "clean",
          signatureVersion: "fixture-signatures",
        }), { status: 200 }),
      ),
    });
    await expect(scanner.scan({
      bytes: new Uint8Array([1]),
      documentId: "fixture",
      contentType: "application/pdf",
    })).resolves.toMatchObject({
      status: "clean",
      signatureVersion: "fixture-signatures",
    });

    const failing = new HttpMalwareScanner({
      endpoint: "https://scanner.example.invalid/scan",
      apiKey: "fixture-key",
      fetchImplementation: vi.fn().mockResolvedValue(new Response(null, { status: 503 })),
    });
    const result = await failing.scan({
      bytes: new Uint8Array([1]),
      documentId: "fixture",
      contentType: "application/pdf",
    });
    expect(result.status).toBe("scan_failed");
    expect(() => requireCleanScan(result.status)).toThrow("not cleared");
  });
});
