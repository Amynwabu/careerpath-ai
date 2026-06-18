import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import {
  db,
  careerAnalysesTable,
  careerGoalsTable,
  profilesTable,
  workExperiencesTable,
  educationTable,
  skillsTable,
  certificationsTable,
  milestonesTable,
  activityLogTable,
} from "@workspace/db";
import {
  generateCareerAnalysis,
  generateCareerMilestones,
} from "../lib/career-analysis";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/analysis", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));
  const [goal] = await db
    .select()
    .from(careerGoalsTable)
    .where(eq(careerGoalsTable.userId, userId));

  if (!goal?.targetRole) {
    res
      .status(400)
      .json({ error: "Please set your career goal before running analysis" });
    return;
  }

  const skills = await db
    .select()
    .from(skillsTable)
    .where(eq(skillsTable.userId, userId));
  const workExp = await db
    .select()
    .from(workExperiencesTable)
    .where(eq(workExperiencesTable.userId, userId));
  const education = await db
    .select()
    .from(educationTable)
    .where(eq(educationTable.userId, userId));
  const certifications = await db
    .select()
    .from(certificationsTable)
    .where(eq(certificationsTable.userId, userId));

  const targetYears = goal.targetYears ?? 5;

  logger.info(
    { userId, targetRole: goal.targetRole, targetYears },
    "Running career analysis",
  );

  const analysis = generateCareerAnalysis({
    profile: profile ?? {},
    targetRole: goal.targetRole,
    targetYears,
    skills,
    workExperiences: workExp,
    education,
    certifications,
  });

  const [saved] = await db
    .insert(careerAnalysesTable)
    .values({
      userId,
      targetRole: goal.targetRole,
      ...analysis,
    })
    .returning();

  // Auto-create milestones if none exist
  const existingMilestones = await db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.userId, userId));
  if (existingMilestones.length === 0) {
    const milestones = generateCareerMilestones(goal.targetRole, targetYears);
    for (const m of milestones) {
      await db
        .insert(milestonesTable)
        .values({ userId, ...m, completed: false });
    }
  }

  // Log activity
  await db.insert(activityLogTable).values({
    userId,
    type: "analysis",
    description: `Ran career analysis for ${goal.targetRole} — readiness score: ${analysis.readinessScore}%`,
  });

  res.status(201).json({ ...saved, createdAt: saved.createdAt.toISOString() });
});

router.get("/analysis/latest", requireAuth, async (req, res): Promise<void> => {
  const [analysis] = await db
    .select()
    .from(careerAnalysesTable)
    .where(eq(careerAnalysesTable.userId, req.user!.userId))
    .orderBy(desc(careerAnalysesTable.createdAt))
    .limit(1);

  if (!analysis) {
    res.status(404).json({
      error: "No analysis found. Run your first analysis to get started.",
    });
    return;
  }

  res.json({ ...analysis, createdAt: analysis.createdAt.toISOString() });
});

router.get(
  "/analysis/history",
  requireAuth,
  async (req, res): Promise<void> => {
    const analyses = await db
      .select({
        id: careerAnalysesTable.id,
        readinessScore: careerAnalysesTable.readinessScore,
        targetRole: careerAnalysesTable.targetRole,
        createdAt: careerAnalysesTable.createdAt,
      })
      .from(careerAnalysesTable)
      .where(eq(careerAnalysesTable.userId, req.user!.userId))
      .orderBy(desc(careerAnalysesTable.createdAt));

    res.json(
      analyses.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })),
    );
  },
);

export default router;
