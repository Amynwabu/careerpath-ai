import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import {
  certificatesTable,
  db,
  journeyStagesTable,
  journeysTable,
  usersTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/certificates/generate", requireAuth, async (req, res): Promise<void> => {
  const journeyId = Number(req.body?.journeyId);
  if (!Number.isInteger(journeyId) || journeyId <= 0) {
    res.status(400).json({ error: "journeyId is required." });
    return;
  }

  const [journey] = await db
    .select()
    .from(journeysTable)
    .where(and(eq(journeysTable.id, journeyId), eq(journeysTable.userId, req.user!.userId)));
  if (!journey) {
    res.status(404).json({ error: "Journey not found." });
    return;
  }

  const stages = await db
    .select({ completed: journeyStagesTable.completed })
    .from(journeyStagesTable)
    .where(eq(journeyStagesTable.journeyId, journey.id));
  if (stages.length === 0 || stages.some((stage) => !stage.completed)) {
    res.status(409).json({ error: "Complete every journey stage before generating a certificate." });
    return;
  }

  const [existing] = await db
    .select()
    .from(certificatesTable)
    .where(
      and(
        eq(certificatesTable.userId, req.user!.userId),
        eq(certificatesTable.journeyId, journey.id),
      ),
    );
  if (existing) {
    res.json({ ...existing, verifyUrl: `/verify/${existing.verificationToken}` });
    return;
  }

  const [user] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId));
  const verificationToken = randomUUID();
  const [certificate] = await db
    .insert(certificatesTable)
    .values({
      userId: req.user!.userId,
      journeyId: journey.id,
      title: `${journey.targetRole} Career Journey`,
      recipientName: user?.name ?? "CareerPath AI learner",
      completionDuration: `Completed a ${journey.durationMonths}-month pathway`,
      verificationToken,
    })
    .returning();

  res.status(201).json({ ...certificate, verifyUrl: `/verify/${verificationToken}` });
});

router.get("/certificates/verify/:token", async (req, res): Promise<void> => {
  const token = req.params.token.trim();
  const [certificate] = await db
    .select()
    .from(certificatesTable)
    .where(eq(certificatesTable.verificationToken, token));

  if (!certificate) {
    res.status(404).json({ valid: false, error: "Certificate not found." });
    return;
  }

  res.json({
    valid: true,
    title: certificate.title,
    recipientName: certificate.recipientName,
    completionDuration: certificate.completionDuration,
    issuedAt: certificate.issuedAt.toISOString(),
    pdfUrl: certificate.pdfUrl,
  });
});

export default router;
