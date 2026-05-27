import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, careerAnalysesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

type RoadmapPhase = {
  sequence?: number;
  label: string;
  timeframeMonths?: number;
  timeframe?: string;
  focus: string;
  actions: string[];
};

function timeframeFromMonths(months?: number) {
  if (!months) return "Custom timeframe";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.round((months / 12) * 10) / 10;
  return `${years} year${years === 1 ? "" : "s"}`;
}

router.get("/roadmap", requireAuth, async (req, res): Promise<void> => {
  const [analysis] = await db.select().from(careerAnalysesTable)
    .where(eq(careerAnalysesTable.userId, req.user!.userId))
    .orderBy(desc(careerAnalysesTable.createdAt))
    .limit(1);

  if (!analysis) {
    res.status(404).json({ error: "No roadmap generated yet. Run your career analysis first." });
    return;
  }

  const structuredPhases = Array.isArray(analysis.roadmapPhases) ? analysis.roadmapPhases as RoadmapPhase[] : [];
  const phases = structuredPhases.length > 0
    ? structuredPhases.map((phase) => ({
      label: phase.label,
      timeframe: phase.timeframe ?? timeframeFromMonths(phase.timeframeMonths),
      actions: phase.actions,
      focus: phase.focus,
    }))
    : [
      { label: "Year 1", timeframe: "12 months", focus: "Foundational capability building", actions: [analysis.year1Priorities] },
      { label: "Years 2-3", timeframe: "24 months", focus: "Capability acceleration and visibility", actions: [analysis.year2To3Plan] },
      { label: "Years 4-5", timeframe: "24 months", focus: "Target-role positioning", actions: [analysis.year4To5Plan] },
    ];

  res.json({
    analysisId: analysis.id,
    targetRole: analysis.targetRole,
    readinessScore: analysis.readinessScore,
    phases,
  });
});

export default router;
