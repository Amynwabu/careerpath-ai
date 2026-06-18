import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  advisorBookingsTable,
  advisorsTable,
  db,
  journeysTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/advisors", requireAuth, async (_req, res): Promise<void> => {
  const advisors = await db
    .select()
    .from(advisorsTable)
    .where(eq(advisorsTable.active, true));
  res.json(advisors);
});

router.post("/advisor/book", requireAuth, async (req, res): Promise<void> => {
  const advisorId = Number(req.body?.advisorId);
  const journeyId = req.body?.journeyId == null ? null : Number(req.body.journeyId);
  const requestedSlot = typeof req.body?.requestedSlot === "string"
    ? req.body.requestedSlot.trim()
    : "";

  if (!Number.isInteger(advisorId) || advisorId <= 0 || !requestedSlot) {
    res.status(400).json({ error: "advisorId and requestedSlot are required." });
    return;
  }

  const [advisor] = await db
    .select()
    .from(advisorsTable)
    .where(and(eq(advisorsTable.id, advisorId), eq(advisorsTable.active, true)));
  if (!advisor) {
    res.status(404).json({ error: "Advisor not found." });
    return;
  }

  if (journeyId != null) {
    const [journey] = await db
      .select({ id: journeysTable.id })
      .from(journeysTable)
      .where(and(eq(journeysTable.id, journeyId), eq(journeysTable.userId, req.user!.userId)));
    if (!journey) {
      res.status(404).json({ error: "Journey not found." });
      return;
    }
  }

  const [booking] = await db
    .insert(advisorBookingsTable)
    .values({
      userId: req.user!.userId,
      advisorId,
      journeyId,
      requestedSlot,
      notes: typeof req.body?.notes === "string" ? req.body.notes.trim() || null : null,
    })
    .returning();

  res.status(201).json({ ...booking, advisor });
});

export default router;
