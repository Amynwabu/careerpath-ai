import { Router, type IRouter, type Response } from "express";
import { careerIntelligenceEngine } from "../lib/career-intelligence-provider";

const router: IRouter = Router();

router.post("/career/resolve", async (req, res) => {
  await respond(res, () => careerIntelligenceEngine.resolveOccupation(req.body));
});

router.post("/career/skills", async (req, res) => {
  if (typeof req.body?.text !== "string") {
    res.status(400).json({ error: "text is required" });
    return;
  }
  await respond(res, () => careerIntelligenceEngine.resolveSkills(req.body));
});

router.post("/career/readiness", async (req, res) => {
  await respond(res, () => careerIntelligenceEngine.readiness(req.body));
});

router.post("/career/gap-analysis", async (req, res) => {
  await respond(res, () => careerIntelligenceEngine.gapAnalysis(req.body));
});

router.post("/career/transitions", async (req, res) => {
  await respond(res, () => careerIntelligenceEngine.transitions(req.body));
});

router.post("/career/recommendations", async (req, res) => {
  await respond(res, () => careerIntelligenceEngine.recommendations(req.body));
});

router.post("/career/context", async (req, res) => {
  await respond(res, () => careerIntelligenceEngine.buildAiContext(req.body));
});

export async function respond(
  res: Response,
  operation: () => Promise<unknown>,
) {
  try {
    res.json(await operation());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
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
    if (message.includes("not found")) {
      res.status(404).json({ error: message });
      return;
    }
    res.status(400).json({ error: message });
  }
}

export default router;
