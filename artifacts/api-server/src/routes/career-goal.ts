import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, careerGoalsTable } from "@workspace/db";
import { SetCareerGoalBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/career-goal", requireAuth, async (req, res): Promise<void> => {
  const [goal] = await db.select().from(careerGoalsTable).where(eq(careerGoalsTable.userId, req.user!.userId));
  if (!goal) {
    res.status(404).json({ error: "Career goal not set" });
    return;
  }
  res.json({ ...goal, updatedAt: goal.updatedAt.toISOString() });
});

router.put("/career-goal", requireAuth, async (req, res): Promise<void> => {
  const parsed = SetCareerGoalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(careerGoalsTable).where(eq(careerGoalsTable.userId, req.user!.userId));

  if (existing) {
    const [updated] = await db.update(careerGoalsTable)
      .set(parsed.data)
      .where(eq(careerGoalsTable.userId, req.user!.userId))
      .returning();
    res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
  } else {
    const [created] = await db.insert(careerGoalsTable)
      .values({ ...parsed.data, userId: req.user!.userId })
      .returning();
    res.json({ ...created, updatedAt: created.updatedAt.toISOString() });
  }
});

export default router;
