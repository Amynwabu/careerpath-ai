import { Router, type IRouter, type Response } from "express";
import {
  addEvidenceRecord,
  buildActionPlan,
  compareScenarios,
  createCareerGoal,
  exportCareerPlan,
  orchestrateReadiness,
  resolveGoalTarget,
  safePlanningLog,
  updateActionStatus,
  validateActionPlan,
  validateCareerGoal,
} from "@workspace/career-planning";
import { careerIntelligenceEngine } from "../lib/career-intelligence-provider";
import { requireAuth } from "../middlewares/auth";
import {
  createAssessmentRecord,
  createEvidenceRecord,
  createGoalRecord,
  createPlanRecord,
  listPlanRecords,
} from "../lib/career-data-repository";

const router: IRouter = Router();
router.use(requireAuth);

router.post("/career-goals", async (req, res) => {
  await respondPlanning(res, async () => {
    const goal = createCareerGoal(req.body);
    const persisted = await createGoalRecord({
      ownerUserId: req.user!.userId,
      goal,
      idempotencyKey: idempotencyKey(req),
    });
    return {
      goal,
      persistentId: persisted.goalId,
      replayed: persisted.replayed,
      persistenceStatus: "persistent",
    };
  });
});

router.post("/career-goals/resolve", async (req, res) => {
  await respondPlanning(res, async () => ({
    resolution: await resolveGoalTarget(req.body?.goal, careerIntelligenceEngine),
    persistenceStatus: "stateless",
  }));
});

router.post("/career-assessments", async (req, res) => {
  await respondPlanning(res, async () => {
    const assessment = await orchestrateReadiness(
      req.body?.input,
      careerIntelligenceEngine,
      { now: req.body?.now },
    );
    const persisted = await createAssessmentRecord({
      ownerUserId: req.user!.userId,
      assessment,
      idempotencyKey: idempotencyKey(req),
    });
    return {
      assessment,
      persistentId: persisted.assessmentId,
      replayed: persisted.replayed,
      persistenceStatus: "persistent",
    };
  });
});

router.post("/career-plans", async (req, res) => {
  await respondPlanning(res, async () => {
    const plan = buildActionPlan(req.body);
    const persisted = await createPlanRecord({
      ownerUserId: req.user!.userId,
      plan,
      idempotencyKey: idempotencyKey(req),
    });
    return {
      plan,
      persistentId: persisted.planId,
      replayed: persisted.replayed,
      persistenceStatus: "persistent",
    };
  });
});

router.post("/career-plans/compare", async (req, res) => {
  await respondPlanning(res, async () => ({
    scenarios: await compareScenarios(
      req.body?.inputs,
      careerIntelligenceEngine,
      req.body?.now,
    ),
    persistenceStatus: "stateless",
  }));
});

router.post("/career-plans/reassess", async (req, res) => {
  await respondPlanning(res, async () => ({
    assessment: await orchestrateReadiness(
      req.body?.input,
      careerIntelligenceEngine,
      {
        now: req.body?.now,
        previousAssessment: req.body?.previousAssessment,
      },
    ),
    persistenceStatus: "stateless",
  }));
});

router.post("/career-plans/validate", async (req, res) => {
  await respondPlanning(res, async () => validateActionPlan(req.body?.plan));
});

router.post("/career-plans/export", async (req, res) => {
  await respondPlanning(res, async () => ({
    export: exportCareerPlan(req.body),
    persistenceStatus: "stateless",
  }));
});

router.post("/career-plans/actions/update", async (req, res) => {
  await respondPlanning(res, async () => ({
    plan: updateActionStatus(req.body?.plan, req.body?.update),
    persistenceStatus: "stateless",
  }));
});

router.post("/career-plans/evidence", async (req, res) => {
  await respondPlanning(res, async () => {
    const evidence = addEvidenceRecord(req.body?.evidence);
    const persisted = await createEvidenceRecord({
      ownerUserId: req.user!.userId,
      profileId: req.body?.profileId,
      planId: req.body?.planId,
      evidence,
    });
    return {
      evidence,
      persistentId: persisted.id,
      persistenceStatus: "persistent",
      fileStorage: "not_implemented",
    };
  });
});

router.post("/career-goals/validate", async (req, res) => {
  await respondPlanning(res, async () => validateCareerGoal(req.body?.goal));
});

router.get("/career-plans", async (req, res) => {
  await respondPlanning(res, async () => ({
    items: await listPlanRecords(req.user!.userId, req.query.limit),
    persistenceStatus: "persistent",
  }));
});

function idempotencyKey(req: { headers: Record<string, unknown> }) {
  const value = req.headers["idempotency-key"];
  if (typeof value !== "string" || !value.trim()) {
    throw Object.assign(new Error("Idempotency-Key header is required."), {
      code: "persistence_failed",
    });
  }
  return value;
}

export async function respondPlanning(
  res: Response,
  operation: () => Promise<unknown>,
) {
  const started = performance.now();
  try {
    res.json(await operation());
  } catch (error) {
    const code = planningErrorCode(error);
    const status = code === "taxonomy_unavailable" ? 503 : 400;
    const requestId = `planning_${Math.round(started)}`;
    safePlanningLog({
      requestId,
      durationMs: performance.now() - started,
      validationResult: "failed",
      errorCategory: code,
    });
    res.status(status).json({
      error: safePlanningMessage(code),
      code,
      ...(code === "taxonomy_unavailable"
        ? { taxonomyStatus: "unpublished_candidate" }
        : {}),
      persistenceStatus: "stateless",
    });
  }
}

function planningErrorCode(error: unknown) {
  const code = (error as { code?: string })?.code;
  const message = error instanceof Error ? error.message : "";
  if (
    message.includes("published taxonomy") ||
    (error as NodeJS.ErrnoException)?.code === "ENOENT"
  ) return "taxonomy_unavailable";
  if (typeof code === "string") return code;
  return "plan_validation_failed";
}

function safePlanningMessage(code: string) {
  const messages: Record<string, string> = {
    taxonomy_unavailable: "Career planning is unavailable until a taxonomy is published.",
    current_occupation_unresolved: "Current occupation must be confirmed before assessment.",
    target_occupation_unresolved: "Target occupation must be resolved before assessment.",
    profile_invalid: "The supplied Career Profile is invalid.",
    skills_unavailable: "Resolved canonical skills are required.",
    transition_unavailable: "No approved published transition supports this request.",
    insufficient_evidence: "Required evidence is incomplete.",
    goal_invalid: "The career goal is invalid.",
    plan_validation_failed: "The career plan request is invalid.",
  };
  return messages[code] ?? "The career planning request is invalid.";
}

export default router;
