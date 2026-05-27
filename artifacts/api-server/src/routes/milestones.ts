import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, milestonesTable, activityLogTable, careerAnalysesTable } from "@workspace/db";
import { CompleteMilestoneParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/milestones", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const [latestAnalysis] = await db.select().from(careerAnalysesTable)
    .where(eq(careerAnalysesTable.userId, userId))
    .orderBy(desc(careerAnalysesTable.createdAt))
    .limit(1);

  const items = await db.select().from(milestonesTable).where(eq(milestonesTable.userId, userId));
  const scopedItems = latestAnalysis ? items.filter(m => m.analysisId === latestAnalysis.id || m.analysisId == null) : items;

  res.json(scopedItems.map(m => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    completedAt: m.completedAt?.toISOString() ?? null,
  })));
});

router.patch("/milestones/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const params = CompleteMilestoneParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [milestone] = await db.update(milestonesTable)
    .set({ completed: true, completedAt: new Date() })
    .where(and(eq(milestonesTable.id, params.data.id), eq(milestonesTable.userId, req.user!.userId)))
    .returning();

  if (!milestone) {
    res.status(404).json({ error: "Milestone not found" });
    return;
  }

  await db.insert(activityLogTable).values({
    userId: req.user!.userId,
    type: "milestone",
    description: `Completed milestone: ${milestone.title}`,
    entityType: "milestone",
    entityId: milestone.id,
    metadata: { analysisId: milestone.analysisId, phase: milestone.phase },
  });

  res.json({
    ...milestone,
    createdAt: milestone.createdAt.toISOString(),
    completedAt: milestone.completedAt?.toISOString() ?? null,
  });
});

export default router;
