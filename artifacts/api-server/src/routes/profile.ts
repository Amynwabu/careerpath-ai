import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profilesTable, workExperiencesTable, educationTable, skillsTable, certificationsTable, careerGoalsTable } from "@workspace/db";
import { UpdateProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/profile", requireAuth, async (req, res): Promise<void> => {
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.user!.userId));
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json({ ...profile, updatedAt: profile.updatedAt.toISOString() });
});

router.patch("/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [existing] = await db.select().from(profilesTable).where(eq(profilesTable.userId, req.user!.userId));
  if (!existing) {
    const [created] = await db.insert(profilesTable).values({ userId: req.user!.userId, ...parsed.data }).returning();
    res.json({ ...created, updatedAt: created.updatedAt.toISOString() });
    return;
  }

  const [updated] = await db.update(profilesTable).set(parsed.data).where(eq(profilesTable.userId, req.user!.userId)).returning();
  res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
});

router.get("/profile/completion", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  const [goal] = await db.select().from(careerGoalsTable).where(eq(careerGoalsTable.userId, userId));
  const workExp = await db.select().from(workExperiencesTable).where(eq(workExperiencesTable.userId, userId));
  const edu = await db.select().from(educationTable).where(eq(educationTable.userId, userId));
  const skills = await db.select().from(skillsTable).where(eq(skillsTable.userId, userId));
  const certs = await db.select().from(certificationsTable).where(eq(certificationsTable.userId, userId));

  const missingFields: string[] = [];
  const completedSections: string[] = [];

  if (profile?.currentRole) completedSections.push("Current Role"); else missingFields.push("Current Role");
  if (profile?.industry) completedSections.push("Industry"); else missingFields.push("Industry");
  if (profile?.yearsExperience != null) completedSections.push("Years of Experience"); else missingFields.push("Years of Experience");
  if (profile?.professionalSummary) completedSections.push("Professional Summary"); else missingFields.push("Professional Summary");
  if (profile?.location) completedSections.push("Location"); else missingFields.push("Location");
  if (workExp.length > 0) completedSections.push("Work Experience"); else missingFields.push("Work Experience");
  if (edu.length > 0) completedSections.push("Education"); else missingFields.push("Education");
  if (skills.length > 0) completedSections.push("Skills"); else missingFields.push("Skills");
  if (certs.length > 0) completedSections.push("Certifications"); else missingFields.push("Certifications");
  if (goal?.targetRole) completedSections.push("Career Goal"); else missingFields.push("Career Goal");

  const total = completedSections.length + missingFields.length;
  const percentage = Math.round((completedSections.length / total) * 100);

  res.json({ percentage, missingFields, completedSections });
});

export default router;
