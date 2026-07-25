import { Router, type IRouter, type Response } from "express";
import {
  applyProfileCorrection,
  buildCareerProfile,
  parseCareerDocument,
  redactCareerProfile,
  resolveCareerProfile,
  safeLogMetadata,
  validateCareerProfile,
  type CareerProfile,
} from "@workspace/career-profile";
import { careerIntelligenceEngine } from "../lib/career-intelligence-provider";
import { requireAuth } from "../middlewares/auth";
import { createProfileRecord } from "../lib/career-data-repository";

const router: IRouter = Router();
router.use(requireAuth);

router.post("/profile/documents/parse", async (req, res) => {
  await respondProfile(res, async () => {
    const { fileName, mimeType, contentBase64, retentionMode } = req.body ?? {};
    if (
      typeof fileName !== "string" ||
      typeof mimeType !== "string" ||
      typeof contentBase64 !== "string"
    ) {
      throw requestError("fileName, mimeType and contentBase64 are required.");
    }
    const started = performance.now();
    const document = await parseCareerDocument({
      fileName,
      mimeType,
      bytes: decodeBase64(contentBase64),
      retentionMode,
    });
    return {
      document,
      processing: safeLogMetadata({
        document,
        durationMs: performance.now() - started,
      }),
      persistence: "none",
    };
  });
});

router.post("/profile/build", async (req, res) => {
  await respondProfile(res, async () => {
    const profile = buildCareerProfile(req.body);
    const persisted = await createProfileRecord({
      ownerUserId: req.user!.userId,
      profile,
      idempotencyKey: requireIdempotencyKey(req.headers["idempotency-key"]),
      requestId: requestIdentifier(req),
    });
    return {
      profile,
      persistentId: persisted.profileId,
      replayed: persisted.replayed,
      resolutionStatus: "not_requested",
      persistenceStatus: "persistent",
    };
  });
});

router.post("/profile/validate", async (req, res) => {
  await respondProfile(res, async () => validateCareerProfile(req.body));
});

router.post("/profile/redact", async (req, res) => {
  await respondProfile(res, async () => ({
    profile: redactCareerProfile(req.body?.profile, req.body?.options),
    persistence: "none",
  }));
});

router.post("/profile/resolve", async (req, res) => {
  await respondProfile(res, async () => ({
    profile: await resolveCareerProfile(
      req.body?.profile as CareerProfile,
      careerIntelligenceEngine,
    ),
    persistence: "none",
  }));
});

router.post("/profile/corrections", async (req, res) => {
  await respondProfile(res, async () => ({
    profile: applyProfileCorrection(req.body?.profile, req.body?.correction),
    persistence: "none",
  }));
});

router.get("/profile/career-profile", (_req, res) => {
  res.status(501).json({
    error: "Career profile persistence is not implemented.",
    persistence: "stateless",
  });
});

export async function respondProfile(
  res: Response,
  operation: () => Promise<unknown>,
) {
  try {
    res.json(await operation());
  } catch (error) {
    const code = (error as { code?: string })?.code;
    const message = error instanceof Error ? error.message : "Invalid request.";
    if (
      message.includes("published taxonomy") ||
      (error as NodeJS.ErrnoException)?.code === "ENOENT"
    ) {
      res.status(503).json({
        error: "Career intelligence is unavailable until a taxonomy is published.",
        taxonomyStatus: "unpublished_candidate",
      });
      return;
    }
    const safePersistenceErrors: Record<string, { status: number; message: string }> = {
      resource_not_found: { status: 404, message: "Resource was not found." },
      record_version_conflict: { status: 409, message: "The record changed; reload before trying again." },
      idempotency_conflict: { status: 409, message: "The idempotency key conflicts with an earlier request." },
      quota_exceeded: { status: 429, message: "The configured quota has been reached." },
      rate_limit_exceeded: { status: 429, message: "Too many requests; retry later." },
      storage_unavailable: { status: 503, message: "Private document storage is unavailable." },
      database_unavailable: { status: 503, message: "Career-data persistence is temporarily unavailable." },
      persistence_failed: { status: 500, message: "Career-data persistence failed." },
    };
    const safe = code ? safePersistenceErrors[code] : undefined;
    const status = safe?.status ?? (code === "file_too_large" ? 413 : 400);
    res.status(status).json({
      error: safe?.message ?? (code ? message : "Invalid profile request."),
      code: code ?? "invalid_request",
    });
  }
}

function decodeBase64(value: string) {
  if (
    value.length === 0 ||
    value.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
  ) {
    throw requestError("contentBase64 is invalid.");
  }
  return Buffer.from(value, "base64");
}

function requestError(message: string) {
  return Object.assign(new Error(message), { code: "invalid_request" });
}

function requireIdempotencyKey(value: string | string[] | undefined) {
  if (typeof value !== "string" || !value.trim())
    throw requestError("Idempotency-Key header is required.");
  return value;
}

function requestIdentifier(req: { headers: Record<string, unknown> }) {
  const value = req.headers["x-request-id"];
  return typeof value === "string" ? value : `request_${Date.now()}`;
}

export default router;
