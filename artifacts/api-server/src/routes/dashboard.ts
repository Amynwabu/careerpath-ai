import { Router, type IRouter } from "express";
import { eq, desc, count } from "drizzle-orm";
import { db, profilesTable, careerGoalsTable, careerAnalysesTable, skillsTable, certificationsTable, workExperiencesTable, milestonesTable, activityLogTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
  const [goal] = await db.select().from(careerGoalsTable).where(eq(careerGoalsTable.userId, userId));
  const [latestAnalysis] = await db.select().from(careerAnalysesTable)
    .where(eq(careerAnalysesTable.userId, userId))
    .orderBy(desc(careerAnalysesTable.createdAt))
    .limit(1);
  const [skillsCount] = await db.select({ value: count() }).from(skillsTable).where(eq(skillsTable.userId, userId));
  const [certsCount] = await db.select({ value: count() }).from(certificationsTable).where(eq(certificationsTable.userId, userId));
  const [workExpCount] = await db.select({ value: count() }).from(workExperiencesTable).where(eq(workExperiencesTable.userId, userId));
  const [analysisCount] = await db.select({ value: count() }).from(careerAnalysesTable).where(eq(careerAnalysesTable.userId, userId));
  const allMilestones = await db.select().from(milestonesTable).where(eq(milestonesTable.userId, userId));
  const currentMilestones = latestAnalysis ? allMilestones.filter(m => m.analysisId === latestAnalysis.id || m.analysisId == null) : allMilestones;
  const completedMilestones = currentMilestones.filter(m => m.completed);

  let completedFields = 0;
  const totalFields = 10;
  if (profile?.currentRole) completedFields++;
  if (profile?.industry) completedFields++;
  if (profile?.yearsExperience != null) completedFields++;
  if (profile?.professionalSummary) completedFields++;
  if (profile?.location) completedFields++;
  if ((workExpCount.value ?? 0) > 0) completedFields++;
  if ((skillsCount.value ?? 0) > 0) completedFields++;
  if ((certsCount.value ?? 0) > 0) completedFields++;
  if (goal?.targetRole) completedFields++;
  if (latestAnalysis) completedFields++;
  const profileCompletion = Math.round((completedFields / totalFields) * 100);

  res.json({
    profileCompletion,
    targetRole: goal?.targetRole ?? null,
    readinessScore: latestAnalysis?.readinessScore ?? null,
    totalSkills: Number(skillsCount.value ?? 0),
    totalCertifications: Number(certsCount.value ?? 0),
    totalWorkExperiences: Number(workExpCount.value ?? 0),
    milestonesCompleted: completedMilestones.length,
    milestonesTotal: currentMilestones.length,
    analysisCount: Number(analysisCount.value ?? 0),
    lastAnalysisDate: latestAnalysis?.createdAt.toISOString() ?? null,
  });
});

router.get("/dashboard/skill-gaps", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const [latestAnalysis] = await db.select().from(careerAnalysesTable)
    .where(eq(careerAnalysesTable.userId, userId))
    .orderBy(desc(careerAnalysesTable.createdAt))
    .limit(1);

  if (!latestAnalysis) {
    res.json([]);
    return;
  }

  if (Array.isArray(latestAnalysis.skillGapsStructured) && latestAnalysis.skillGapsStructured.length > 0) {
    res.json(latestAnalysis.skillGapsStructured.map(gap => ({
      skill: gap.skill,
      priority: gap.priority,
      category: gap.category,
      currentLevel: gap.currentLevel,
      requiredLevel: gap.requiredLevel,
      rationale: gap.rationale,
    })));
    return;
  }

  res.json([]);
});

router.get("/dashboard/activity", requireAuth, async (req, res): Promise<void> => {
  const activities = await db.select().from(activityLogTable)
    .where(eq(activityLogTable.userId, req.user!.userId))
    .orderBy(desc(activityLogTable.createdAt))
    .limit(10);

  res.json(activities.map(a => ({
    id: a.id,
    type: a.type,
    description: a.description,
    timestamp: a.createdAt.toISOString(),
    entityType: a.entityType,
    entityId: a.entityId,
    metadata: a.metadata,
  })));
});

export default router;
