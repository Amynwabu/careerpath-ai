import { Router, type IRouter } from "express";
import { and, db, eq, educationTable } from "@workspace/db";
import { CreateEducationBody, UpdateEducationParams, UpdateEducationBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { toDateString } from "../lib/dates";

const router: IRouter = Router();

router.get("/education", requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(educationTable).where(eq(educationTable.userId, req.user!.userId));
  res.json(items.map(i => ({ ...i, createdAt: i.createdAt.toISOString() })));
});

router.post("/education", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateEducationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = { ...parsed.data, startDate: toDateString(parsed.data.startDate)!, endDate: toDateString(parsed.data.endDate) };
  const [item] = await db.insert(educationTable).values({ ...data, userId: req.user!.userId }).returning();
  res.status(201).json({ ...item, createdAt: item.createdAt.toISOString() });
});

router.patch("/education/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateEducationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateEducationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = { ...parsed.data, startDate: toDateString(parsed.data.startDate), endDate: toDateString(parsed.data.endDate) };
  const [item] = await db.update(educationTable)
    .set(data)
    .where(and(eq(educationTable.id, params.data.id), eq(educationTable.userId, req.user!.userId)))
    .returning();
  if (!item) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...item, createdAt: item.createdAt.toISOString() });
});

router.delete("/education/:id", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  await db.delete(educationTable).where(and(eq(educationTable.id, id), eq(educationTable.userId, req.user!.userId)));
  res.sendStatus(204);
});

export default router;
