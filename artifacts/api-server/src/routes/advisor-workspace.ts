import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/auth";
import {
  acceptCase,
  closeCase,
  createAdvisorProfile,
  createCase,
  getAdvisorCapacity,
  getAdvisorProfile,
  getCase,
  holdCase,
  listAdvisorCases,
  listClientCases,
  resumeCase,
  revokeCaseAccess,
  setAdvisorCapacity,
  updateAdvisorProfile,
} from "../lib/advisor-workspace-repository";
import { persistentResponse } from "./career-data";

const router: IRouter = Router();
router.use(requireAuth);

router.get("/advisors/me", async (req, res) => {
  await respond(res, async () => ({
    advisor: await getAdvisorProfile(req.user!.userId),
    persistenceStatus: "persistent",
  }));
});

router.post("/advisors/me", async (req, res) => {
  await respond(res, async () => ({
    advisor: await createAdvisorProfile({
      advisorUserId: req.user!.userId,
      displayName: requiredString(req.body?.displayName),
      professionalTitle: optionalString(req.body?.professionalTitle),
      idempotencyKey: idempotencyKey(req),
    }),
    persistenceStatus: "persistent",
  }));
});

router.patch("/advisors/me", async (req, res) => {
  await respond(res, async () => ({
    advisor: await updateAdvisorProfile({
      advisorUserId: req.user!.userId,
      expectedVersion: recordVersion(req),
      displayName: optionalNonNullString(req.body?.displayName),
      professionalTitle: optionalString(req.body?.professionalTitle),
    }),
    persistenceStatus: "persistent",
  }));
});

router.get("/advisors/me/capacity", async (req, res) => {
  await respond(res, async () => ({
    capacity: await getAdvisorCapacity(req.user!.userId),
    persistenceStatus: "persistent",
  }));
});

router.patch("/advisors/me/capacity", async (req, res) => {
  await respond(res, async () => ({
    capacity: await setAdvisorCapacity({
      advisorUserId: req.user!.userId,
      capacityStatus: requiredString(req.body?.capacityStatus),
      maximumActiveCases: optionalInteger(req.body?.maximumActiveCases),
      availableSessionSlots: optionalInteger(req.body?.availableSessionSlots),
      serviceCategories: stringArray(req.body?.serviceCategories),
      expectedVersion: optionalVersion(req),
    }),
    persistenceStatus: "persistent",
  }));
});

router.post("/advisor-cases", async (req, res) => {
  await respond(res, async () => ({
    case: await createCase({
      ownerUserId: req.user!.userId,
      advisorUserId: requiredInteger(req.body?.advisorUserId),
      advisorGrantId: requiredString(req.body?.advisorGrantId),
      serviceType: requiredString(req.body?.serviceType),
      priority: optionalNonNullString(req.body?.priority),
      idempotencyKey: idempotencyKey(req),
    }),
    persistenceStatus: "persistent",
  }));
});

router.get("/advisor-cases", async (req, res) => {
  await respond(res, async () => ({
    items: await listClientCases(req.user!.userId),
    persistenceStatus: "persistent",
  }));
});

router.get("/advisor-cases/:caseId", async (req, res) => {
  await respond(res, async () => ({
    case: await getCase({ userId: req.user!.userId, role: "client" }, String(req.params.caseId)),
    persistenceStatus: "persistent",
  }));
});

router.post("/advisor-cases/:caseId/cancel", async (req, res) => {
  await clientTransition(req, res, "cancelled");
});

router.post("/advisor-cases/:caseId/revoke-access", async (req, res) => {
  await respond(res, async () => ({
    case: await revokeCaseAccess({
      actor: { userId: req.user!.userId, role: "client" },
      caseId: String(req.params.caseId), expectedVersion: recordVersion(req),
    }),
    persistenceStatus: "persistent",
  }));
});

router.get("/advisor/cases", async (req, res) => {
  await respond(res, async () => ({
    items: await listAdvisorCases(req.user!.userId),
    persistenceStatus: "persistent",
  }));
});

router.get("/advisor/cases/:caseId", async (req, res) => {
  await respond(res, async () => ({
    case: await getCase({ userId: req.user!.userId, role: "advisor" }, String(req.params.caseId)),
    persistenceStatus: "persistent",
  }));
});

for (const [path, operation] of [
  ["accept", acceptCase], ["hold", holdCase], ["resume", resumeCase], ["close", closeCase],
] as const) {
  router.post(`/advisor/cases/:caseId/${path}`, async (req, res) => {
    await respond(res, async () => ({
      case: await operation({
        actor: { userId: req.user!.userId, role: "advisor" },
        caseId: String(req.params.caseId), expectedVersion: recordVersion(req),
      }),
      persistenceStatus: "persistent",
    }));
  });
}

async function clientTransition(req: Request, res: Response, nextStatus: "cancelled") {
  const { transitionAdvisorCase } = await import("../lib/advisor-workspace-repository");
  await respond(res, async () => ({
    case: await transitionAdvisorCase({
      actor: { userId: req.user!.userId, role: "client" },
      caseId: String(req.params.caseId), expectedVersion: recordVersion(req), nextStatus,
    }),
    persistenceStatus: "persistent",
  }));
}

async function respond(res: Response, operation: () => Promise<unknown>) {
  await persistentResponse(res, operation);
}

function idempotencyKey(req: Request) {
  const value = req.headers["idempotency-key"];
  if (typeof value !== "string" || !value.trim()) throw coded("idempotency_key_required");
  return value.trim();
}
function recordVersion(req: Request) {
  const value = Number(req.headers["if-match"] ?? req.body?.recordVersion);
  if (!Number.isInteger(value) || value < 1) throw coded("record_version_conflict");
  return value;
}
function optionalVersion(req: Request) {
  const value = req.headers["if-match"] ?? req.body?.recordVersion;
  return value === undefined ? undefined : recordVersion(req);
}
function requiredString(value: unknown) {
  if (typeof value !== "string" || !value.trim()) throw coded("validation_failed");
  return value.trim();
}
function optionalString(value: unknown) {
  if (value === null) return null;
  return value === undefined ? undefined : requiredString(value);
}
function optionalNonNullString(value: unknown) {
  return value === undefined ? undefined : requiredString(value);
}
function requiredInteger(value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 1) throw coded("validation_failed");
  return Number(value);
}
function optionalInteger(value: unknown) {
  return value === null || value === undefined ? null : requiredInteger(value);
}
function stringArray(value: unknown) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) throw coded("validation_failed");
  return value.map((item) => item.trim()).filter(Boolean);
}
function coded(code: string) {
  return Object.assign(new Error(code), { code });
}

export default router;
