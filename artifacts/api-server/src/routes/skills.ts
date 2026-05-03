import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, skillsTable } from "@workspace/db";
import { CreateSkillBody, DeleteSkillParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/skills", requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(skillsTable).where(eq(skillsTable.userId, req.user!.userId));
  res.json(items.map(i => ({ ...i, createdAt: i.createdAt.toISOString() })));
});

router.post("/skills", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateSkillBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(skillsTable).values({ ...parsed.data, userId: req.user!.userId }).returning();
  res.status(201).json({ ...item, createdAt: item.createdAt.toISOString() });
});

router.delete("/skills/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteSkillParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(skillsTable).where(and(eq(skillsTable.id, params.data.id), eq(skillsTable.userId, req.user!.userId)));
  res.sendStatus(204);
});

export default router;
