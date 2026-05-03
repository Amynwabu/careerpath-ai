import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, certificationsTable } from "@workspace/db";
import { CreateCertificationBody, DeleteCertificationParams } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/certifications", requireAuth, async (req, res): Promise<void> => {
  const items = await db.select().from(certificationsTable).where(eq(certificationsTable.userId, req.user!.userId));
  res.json(items.map(i => ({ ...i, createdAt: i.createdAt.toISOString() })));
});

router.post("/certifications", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCertificationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [item] = await db.insert(certificationsTable).values({ ...parsed.data, userId: req.user!.userId }).returning();
  res.status(201).json({ ...item, createdAt: item.createdAt.toISOString() });
});

router.delete("/certifications/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteCertificationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(certificationsTable).where(and(eq(certificationsTable.id, params.data.id), eq(certificationsTable.userId, req.user!.userId)));
  res.sendStatus(204);
});

export default router;
