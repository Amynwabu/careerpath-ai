import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, careerAnalysesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function getActions(plan: string): string[] {
  return plan
    .replace(/^[^:]+:\s*/, "")
    .split(/\.\s+/)
    .map((action) =>
      action
        .replace(/^\d+\)\s*/, "")
        .replace(/\.$/, "")
        .trim(),
    )
    .filter(Boolean);
}

function getTimeframe(plan: string, fallback: string): string {
  return plan.match(/^(.+?) focus:/)?.[1] ?? fallback;
}

router.get("/roadmap", requireAuth, async (req, res): Promise<void> => {
  const [analysis] = await db
    .select()
    .from(careerAnalysesTable)
    .where(eq(careerAnalysesTable.userId, req.user!.userId))
    .orderBy(desc(careerAnalysesTable.createdAt))
    .limit(1);

  if (!analysis) {
    res.status(404).json({
      error: "No roadmap found. Run your first analysis to get started.",
    });
    return;
  }

  res.json({
    analysisId: analysis.id,
    targetRole: analysis.targetRole,
    readinessScore: analysis.readinessScore,
    phases: [
      {
        label: "Immediate Actions",
        timeframe: "0-90 days",
        focus: "Establish your direction and next development moves.",
        actions: getActions(analysis.immediateActions),
      },
      {
        label: "Foundation",
        timeframe: getTimeframe(analysis.year1Priorities, "Year 1"),
        focus: "Build foundational capability and evidence.",
        actions: getActions(analysis.year1Priorities),
      },
      {
        label: "Acceleration",
        timeframe: getTimeframe(analysis.year2To3Plan, "Years 2-3"),
        focus: "Increase responsibility, visibility, and credentials.",
        actions: getActions(analysis.year2To3Plan),
      },
      {
        label: "Positioning",
        timeframe: getTimeframe(analysis.year4To5Plan, "Years 4-5"),
        focus: `Position yourself for ${analysis.targetRole}.`,
        actions: getActions(analysis.year4To5Plan),
      },
    ],
  });
});

export default router;
