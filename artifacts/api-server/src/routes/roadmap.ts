import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, careerAnalysesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function getActions(plan: string, limit = 5): string[] {
  return plan
    .replace(/^[^:]+:\s*/, "")
    .split(/\.\s+/)
    .map((action) =>
      action
        .replace(/^\d+\)\s*/, "")
        .replace(/\.$/, "")
        .trim(),
    )
    .filter(Boolean)
    .slice(0, limit);
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
        label: "Learn core tools",
        timeframe: getTimeframe(analysis.immediateActions, "Months 1-2"),
        focus: "Build the foundation for your target role.",
        actions: getActions(analysis.immediateActions),
      },
      {
        label: "Build portfolio evidence",
        timeframe: getTimeframe(analysis.year1Priorities, "Months 3-4"),
        focus: "Create 2 to 3 proof points employers can review.",
        actions: getActions(analysis.year1Priorities),
      },
      {
        label: "Apply and review",
        timeframe: getTimeframe(analysis.year2To3Plan, "Months 5-6"),
        focus: `Update CV and LinkedIn, apply for ${analysis.targetRole}, and review progress monthly.`,
        actions: [
          ...getActions(analysis.year2To3Plan, 4),
          ...getActions(analysis.year4To5Plan, 1),
        ],
      },
    ],
  });
});

export default router;
