import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, weeklyRemindersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();
const allowedFrequencies = new Set(["weekly", "fortnightly", "off"]);

const preview = {
  focus: "Complete the next unfinished journey milestone.",
  smarterTrainingTip: "Read for 90 minutes, then build one small proof artifact.",
  skipThisWeek: "Do not start another broad course before finishing the current checklist.",
};

router.get("/reminders/preferences", requireAuth, async (req, res): Promise<void> => {
  const [preferences] = await db
    .select()
    .from(weeklyRemindersTable)
    .where(eq(weeklyRemindersTable.userId, req.user!.userId));

  res.json({
    frequency: preferences?.frequency ?? "weekly",
    dayOfWeek: preferences?.dayOfWeek ?? 1,
    lastSentAt: preferences?.lastSentAt ?? null,
    preview,
  });
});

router.patch("/reminders/preferences", requireAuth, async (req, res): Promise<void> => {
  const frequency = typeof req.body?.frequency === "string" ? req.body.frequency : "weekly";
  const dayOfWeek = Number(req.body?.dayOfWeek ?? 1);

  if (!allowedFrequencies.has(frequency) || !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    res.status(400).json({
      error: "frequency must be weekly, fortnightly, or off; dayOfWeek must be 0-6.",
    });
    return;
  }

  const [preferences] = await db
    .insert(weeklyRemindersTable)
    .values({ userId: req.user!.userId, frequency, dayOfWeek, contentLog: [] })
    .onConflictDoUpdate({
      target: weeklyRemindersTable.userId,
      set: { frequency, dayOfWeek, updatedAt: new Date() },
    })
    .returning();

  res.json(preferences);
});

export default router;
