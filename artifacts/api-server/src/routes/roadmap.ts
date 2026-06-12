import { Router, type IRouter } from "express";
import { careerAnalysesTable, db, desc, eq } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function extractActions(text: string): string[] {
  const numberedItems = text
    .split(/\s+\d+\)\s+/)
    .map((item) => item.replace(/^\d+\)\s*/, "").trim())
    .filter(Boolean);

  if (numberedItems.length > 1) return numberedItems;

  return text
    .split(".")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => `${item}.`);
}

router.get("/roadmap", requireAuth, async (req, res): Promise<void> => {
  const [analysis] = await db
    .select()
    .from(careerAnalysesTable)
    .where(eq(careerAnalysesTable.userId, req.user!.userId))
    .orderBy(desc(careerAnalysesTable.createdAt))
    .limit(1);

  if (!analysis) {
    res.status(404).json({ error: "No roadmap found. Run your first analysis to generate a roadmap." });
    return;
  }

  res.json({
    analysisId: analysis.id,
    targetRole: analysis.targetRole,
    readinessScore: analysis.readinessScore,
    learningRecommendations: analysis.learningRecommendations.filter((group) => group.sourceType === "roadmap-phase"),
    phases: analysis.roadmapPhases.length > 0
      ? analysis.roadmapPhases
      : [
          {
            label: "Immediate",
            timeframe: "0-90 days",
            focus: "Set foundations, choose the first credential, and create momentum.",
            actions: extractActions(analysis.immediateActions),
          },
          {
            label: "Foundation",
            timeframe: "Year 1",
            focus: "Build core capability and gather evidence for your next move.",
            actions: extractActions(analysis.year1Priorities),
          },
          {
            label: "Acceleration",
            timeframe: "Mid-term",
            focus: "Increase visibility, responsibility, and proof of delivery.",
            actions: extractActions(analysis.year2To3Plan),
          },
          {
            label: "Positioning",
            timeframe: "Final phase",
            focus: "Position yourself for target-role interviews and senior opportunities.",
            actions: extractActions(analysis.year4To5Plan),
          },
        ],
  });
});

export default router;
