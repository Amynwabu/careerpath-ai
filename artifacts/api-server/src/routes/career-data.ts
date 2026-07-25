import { createHash, randomUUID } from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  requireCleanScan,
  validateUploadPolicy,
  type AdvisorScope,
  type DocumentRetentionMode,
} from "@workspace/career-data";
import { requireAuth } from "../middlewares/auth";
import {
  archiveProfileRecord,
  cancelAccountDeletion,
  createDocumentRecord,
  createExportRequest,
  createProfileRecord,
  getAccountDeletionRequest,
  getAssessmentRecord,
  getDocumentStorageRecord,
  getDocumentUsage,
  getGoalRecord,
  getPlanRecord,
  getProfileRecord,
  grantAdvisorAccess,
  listAdvisorAccess,
  listAssessmentRecords,
  listDocumentRecords,
  listGoalRecords,
  listPlanRecords,
  listProfiles,
  markDocumentDeleted,
  requestAccountDeletion,
  revokeAdvisorAccess,
  updateActionRecord,
  updateProfileRecord,
} from "../lib/career-data-repository";
import {
  careerDocumentStorage,
  enforceRateLimits,
  malwareScanner,
  quotaProvider,
} from "../lib/career-data-controls";

const router: IRouter = Router();
router.use(requireAuth);

router.post("/profiles", rate("profile_create", 10, 30), async (req, res) => {
  await persistentResponse(res, async () => {
    const result = await createProfileRecord({
      ownerUserId: req.user!.userId,
      profile: req.body?.profile,
      idempotencyKey: idempotencyKey(req),
      requestId: requestId(req),
    });
    return { ...result, persistenceStatus: "persistent" };
  });
});

router.get("/profiles", async (req, res) => {
  await persistentResponse(res, async () => ({
    ...await listProfiles({
      ownerUserId: req.user!.userId,
      limit: req.query.limit,
      cursor: typeof req.query.cursor === "string" ? req.query.cursor : undefined,
      status: typeof req.query.status === "string" ? req.query.status : undefined,
    }),
    persistenceStatus: "persistent",
  }));
});

router.get("/profiles/:profileId", async (req, res) => {
  await persistentResponse(res, async () => ({
    ...await getProfileRecord(req.user!.userId, req.params.profileId),
    persistenceStatus: "persistent",
  }));
});

router.patch("/profiles/:profileId", async (req, res) => {
  await persistentResponse(res, async () => ({
    profile: await updateProfileRecord({
      ownerUserId: req.user!.userId,
      profileId: req.params.profileId,
      expectedVersion: recordVersion(req),
      status: req.body?.status,
      summary: req.body?.summary,
      requestId: requestId(req),
    }),
    persistenceStatus: "persistent",
  }));
});

router.delete("/profiles/:profileId", async (req, res) => {
  await persistentResponse(res, async () => ({
    archived: await archiveProfileRecord({
      ownerUserId: req.user!.userId,
      profileId: req.params.profileId,
      expectedVersion: recordVersion(req),
      reason: req.body?.reason ?? "user_requested",
    }),
    persistenceStatus: "persistent",
    deletionState: "soft_deleted",
  }));
});

router.get("/career-goals", async (req, res) => {
  await persistentResponse(res, async () => ({
    items: await listGoalRecords(req.user!.userId, req.query.limit),
    persistenceStatus: "persistent",
  }));
});
router.get("/career-goals/:goalId", async (req, res) => {
  await persistentResponse(res, async () => ({
    goal: await getGoalRecord(req.user!.userId, req.params.goalId),
    persistenceStatus: "persistent",
  }));
});
router.get("/career-assessments", async (req, res) => {
  await persistentResponse(res, async () => ({
    items: await listAssessmentRecords(req.user!.userId, req.query.limit),
    persistenceStatus: "persistent",
  }));
});
router.get("/career-assessments/:assessmentId", async (req, res) => {
  await persistentResponse(res, async () => ({
    ...await getAssessmentRecord(req.user!.userId, req.params.assessmentId),
    persistenceStatus: "persistent",
  }));
});
router.get("/career-plans/:planId", async (req, res) => {
  await persistentResponse(res, async () => ({
    ...await getPlanRecord(req.user!.userId, req.params.planId),
    persistenceStatus: "persistent",
  }));
});
router.patch("/career-plans/:planId/actions/:actionId", rate("action_update", 60, 120), async (req, res) => {
  await persistentResponse(res, async () => ({
    action: await updateActionRecord({
      ownerUserId: req.user!.userId,
      planId: String(req.params.planId),
      actionId: String(req.params.actionId),
      expectedVersion: recordVersion(req),
      status: req.body?.status,
      verificationStatus: req.body?.verificationStatus ?? "unverified",
    }),
    persistenceStatus: "persistent",
  }));
});

router.post("/profile-documents/upload", rate("document_upload", 5, 15), async (req, res) => {
  await persistentResponse(res, async () => {
    const bytes = decodeBase64(req.body?.contentBase64);
    const quotas = await quotaProvider.get(req.user!.userId);
    const usage = await getDocumentUsage(req.user!.userId);
    const policy = validateUploadPolicy({
      context: {
        actorUserId: req.user!.userId,
        actorRole: "user",
        requestId: requestId(req),
      },
      fileName: req.body?.fileName,
      contentType: req.body?.contentType,
      sizeBytes: bytes.byteLength,
      retentionMode: req.body?.retentionMode,
      usage: { ...usage, uploadsInWindow: 0 },
      quotas,
      maxUploadsPerWindow: 5,
    });
    const documentId = `document_${randomUUID()}`;
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const scan = await malwareScanner.scan({
      bytes,
      documentId,
      contentType: req.body.contentType,
    });
    requireCleanScan(scan.status);
    const stored = await careerDocumentStorage.put({
      ownerUserId: req.user!.userId,
      documentId,
      bytes,
      safeFilename: policy.safeFilename,
      contentType: req.body.contentType,
      checksum,
      retentionMode: policy.retentionMode,
    });
    const document = await createDocumentRecord({
      ownerUserId: req.user!.userId,
      document: {
        id: documentId,
        originalFilename: req.body.fileName,
        safeFilename: policy.safeFilename,
        declaredMimeType: req.body.contentType,
        detectedMimeType: req.body.contentType,
        fileSizeBytes: bytes.byteLength,
        checksum,
        storageProvider: stored.provider,
        storageObjectKey: stored.objectKey,
        scanStatus: scan.status,
        retentionMode: policy.retentionMode,
        expiresAt: policy.retentionMode === "temporary"
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : null,
      },
    });
    return { document, persistenceStatus: "persistent", objectPrivate: true };
  });
});

router.get("/profile-documents", async (req, res) => {
  await persistentResponse(res, async () => ({
    items: await listDocumentRecords(req.user!.userId, req.query.limit),
    persistenceStatus: "persistent",
  }));
});
router.get("/profile-documents/:documentId", async (req, res) => {
  await persistentResponse(res, async () => {
    const document = await getDocumentStorageRecord(req.user!.userId, req.params.documentId);
    return {
      document: {
        id: document.id,
        originalFilename: document.originalFilename,
        detectedMimeType: document.detectedMimeType,
        fileSizeBytes: document.fileSizeBytes,
        scanStatus: document.scanStatus,
        parseStatus: document.parseStatus,
        retentionMode: document.retentionMode,
        recordVersion: document.recordVersion,
      },
      persistenceStatus: "persistent",
    };
  });
});
router.delete("/profile-documents/:documentId", async (req, res) => {
  await persistentResponse(res, async () => {
    const document = await getDocumentStorageRecord(req.user!.userId, req.params.documentId);
    if (document.storageObjectKey)
      await careerDocumentStorage.delete({
        ownerUserId: req.user!.userId,
        objectKey: document.storageObjectKey,
      });
    await markDocumentDeleted({
      ownerUserId: req.user!.userId,
      documentId: document.id,
      reason: req.body?.reason ?? "user_requested",
    });
    return { documentId: document.id, deletionState: "completed", persistenceStatus: "persistent" };
  });
});

router.post("/advisor-access", rate("advisor_invitation", 10, 20), async (req, res) => {
  await persistentResponse(res, async () => ({
    grant: await grantAdvisorAccess({
      ownerUserId: req.user!.userId,
      advisorUserId: Number(req.body?.advisorUserId),
      scopes: req.body?.scopes as AdvisorScope[],
      expiresAt: req.body?.expiresAt,
    }),
    persistenceStatus: "persistent",
  }));
});
router.get("/advisor-access", async (req, res) => {
  await persistentResponse(res, async () => ({
    items: await listAdvisorAccess(req.user!.userId),
    persistenceStatus: "persistent",
  }));
});
router.delete("/advisor-access/:grantId", async (req, res) => {
  await persistentResponse(res, async () => ({
    grant: await revokeAdvisorAccess(req.user!.userId, req.params.grantId),
    persistenceStatus: "persistent",
  }));
});

router.post("/account/export", rate("account_export", 5, 10), async (req, res) => {
  await persistentResponse(res, async () => ({
    exportRequest: await createExportRequest({
      ownerUserId: req.user!.userId,
      format: req.body?.format,
      idempotencyKey: idempotencyKey(req),
    }),
    persistenceStatus: "persistent",
    objectFilesIncluded: false,
  }));
});
router.post("/account/deletion-request", rate("account_deletion", 3, 6), async (req, res) => {
  await persistentResponse(res, async () => ({
    ...await requestAccountDeletion({
      ownerUserId: req.user!.userId,
      idempotencyKey: idempotencyKey(req),
    }),
    persistenceStatus: "persistent",
  }));
});
router.get("/account/deletion-request", async (req, res) => {
  await persistentResponse(res, async () => ({
    deletionRequest: await getAccountDeletionRequest(req.user!.userId),
    persistenceStatus: "persistent",
  }));
});
router.post("/account/deletion-request/cancel", async (req, res) => {
  await persistentResponse(res, async () => ({
    deletionRequest: await cancelAccountDeletion(req.user!.userId),
    persistenceStatus: "persistent",
  }));
});

export async function persistentResponse(
  res: Response,
  operation: () => Promise<unknown>,
) {
  try {
    res.json(await operation());
  } catch (error) {
    const code = (error as { code?: string }).code ?? "persistence_failed";
    const retryAfter = (error as { retryAfterSeconds?: number }).retryAfterSeconds;
    const status = code === "authentication_required" ? 401 :
      code === "record_version_conflict" || code === "idempotency_conflict" ? 409 :
      code === "rate_limit_exceeded" || code === "quota_exceeded" ? 429 :
      code === "storage_unavailable" || code === "database_unavailable" ? 503 :
      code === "resource_not_found" || code === "forbidden" ? 404 : 400;
    if (retryAfter) res.setHeader("Retry-After", String(retryAfter));
    res.status(status).json({
      error: safeMessage(code),
      code,
      ...(retryAfter ? { retryAfterSeconds: retryAfter } : {}),
    });
  }
}

function rate(endpointClass: string, userLimit: number, ipLimit: number) {
  return async (req: Request, res: Response, next: () => void) => {
    try {
      await enforceRateLimits({
        userId: req.user!.userId,
        ip: req.ip ?? "unknown",
        endpointClass,
        userLimit,
        ipLimit,
      });
      next();
    } catch (error) {
      await persistentResponse(res, async () => { throw error; });
    }
  };
}

function idempotencyKey(req: Request) {
  const value = req.headers["idempotency-key"];
  if (typeof value !== "string" || !value.trim())
    throw Object.assign(new Error("Idempotency-Key required."), { code: "persistence_failed" });
  return value;
}

function recordVersion(req: Request) {
  const value = Number(req.headers["if-match"] ?? req.body?.recordVersion);
  if (!Number.isInteger(value) || value < 1)
    throw Object.assign(new Error("Record version required."), { code: "record_version_conflict" });
  return value;
}

function requestId(req: Request) {
  const value = req.headers["x-request-id"];
  return typeof value === "string" ? value : `request_${randomUUID()}`;
}

function decodeBase64(value: unknown) {
  if (typeof value !== "string" || !value || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value))
    throw Object.assign(new Error("Invalid content."), { code: "persistence_failed" });
  return Buffer.from(value, "base64");
}

function safeMessage(code: string) {
  const messages: Record<string, string> = {
    authentication_required: "Authentication is required.",
    forbidden: "Resource was not found.",
    resource_not_found: "Resource was not found.",
    record_version_conflict: "The record changed; reload before trying again.",
    idempotency_conflict: "The idempotency key was already used for a different request.",
    quota_exceeded: "The configured quota has been reached.",
    rate_limit_exceeded: "Too many requests; retry later.",
    document_not_clean: "The document is not cleared for processing.",
    storage_unavailable: "Private document storage is unavailable.",
    database_unavailable: "Career-data persistence is temporarily unavailable.",
    persistence_failed: "The career-data request could not be completed.",
  };
  return messages[code] ?? messages.persistence_failed;
}

export default router;
