import { Router, type IRouter } from "express";
import { and, db, eq, workExperiencesTable } from "@workspace/db";
import { CreateWorkExperienceBody, UpdateWorkExperienceParams, UpdateWorkExperienceBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { toDateString } from "../lib/dates";

const router: IRouter = Router();

router.get("/work-experiences", requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(workExperiencesTable).where(eq(workExperiencesTable.userId, req.user!.userId));
  res.json(items.map(i => ({ ...i, createdAt: i.createdAt.toISOString() })));
});

router.post("/work-experiences", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateWorkExperienceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = { ...parsed.data, startDate: toDateString(parsed.data.startDate)!, endDate: toDateString(parsed.data.endDate) };
  const [item] = await db.insert(workExperiencesTable).values({ ...data, userId: req.user!.userId }).returning();
  res.status(201).json({ ...item, createdAt: item.createdAt.toISOString() });
});

router.patch("/work-experiences/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateWorkExperienceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateWorkExperienceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = { ...parsed.data, startDate: toDateString(parsed.data.startDate), endDate: toDateString(parsed.data.endDate) };
  const [item] = await db.update(workExperiencesTable)
    .set(data)
    .where(and(eq(workExperiencesTable.id, params.data.id), eq(workExperiencesTable.userId, req.user!.userId)))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...item, createdAt: item.createdAt.toISOString() });
});

router.delete("/work-experiences/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(workExperiencesTable).where(and(eq(workExperiencesTable.id, id), eq(workExperiencesTable.userId, req.user!.userId)));
  res.sendStatus(204);
});

export default router;
