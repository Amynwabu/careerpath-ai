import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, milestonesTable, activityLogTable } from "@workspace/db";
import { CompleteMilestoneParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/milestones", requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(milestonesTable)
    .where(eq(milestonesTable.userId, req.user!.userId));
  res.json(items.map(m => ({
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
  });

  res.json({
    ...milestone,
    createdAt: milestone.createdAt.toISOString(),
    completedAt: milestone.completedAt?.toISOString() ?? null,
  });
});

export default router;
