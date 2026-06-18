import { Router, type IRouter } from "express";
import { and, eq, desc, count } from "drizzle-orm";
import { db, profilesTable, careerGoalsTable, careerAnalysesTable, skillsTable, certificationsTable, workExperiencesTable, milestonesTable, activityLogTable, journeysTable } from "@workspace/db";
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
  const completedMilestones = allMilestones.filter(m => m.completed);
  const nextMilestone = allMilestones.find(m => !m.completed);
  const [activeJourney] = await db.select().from(journeysTable)
    .where(and(eq(journeysTable.userId, userId), eq(journeysTable.status, "active")))
    .orderBy(desc(journeysTable.createdAt))
    .limit(1);

  // Calculate profile completion
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
    milestonesTotal: allMilestones.length,
    analysisCount: Number(analysisCount.value ?? 0),
    lastAnalysisDate: latestAnalysis?.createdAt.toISOString() ?? null,
    userStatus: activeJourney
      ? "Journey in progress"
      : latestAnalysis
        ? "Ready to build journey"
        : profile?.currentRole
          ? "Profile ready"
          : "Setup required",
    journeyProgress: activeJourney?.progress ?? 0,
    nextAction: nextMilestone?.title
      ?? (latestAnalysis ? "Build your milestone journey" : profile?.currentRole ? "Run your first analysis" : "Complete your career profile"),
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

  const [goal] = await db.select().from(careerGoalsTable).where(eq(careerGoalsTable.userId, userId));
  const targetRole = goal?.targetRole ?? "Target Role";

  const gaps = [
    { skill: "Strategic Leadership", priority: "High", category: "Leadership", currentLevel: null, requiredLevel: "Expert" },
    { skill: "Executive Stakeholder Management", priority: "High", category: "Communication", currentLevel: null, requiredLevel: "Advanced" },
    { skill: `${targetRole.includes("AI") || targetRole.includes("Data") ? "AI/ML Engineering" : "Domain Expertise"}`, priority: "High", category: "Technical", currentLevel: "Intermediate", requiredLevel: "Expert" },
    { skill: "Change Management", priority: "Medium", category: "Management", currentLevel: null, requiredLevel: "Advanced" },
    { skill: "P&L and Budget Accountability", priority: "Medium", category: "Business", currentLevel: null, requiredLevel: "Intermediate" },
    { skill: "Team Building at Scale", priority: "Medium", category: "Leadership", currentLevel: null, requiredLevel: "Advanced" },
    { skill: "Strategic Programme Delivery", priority: "Low", category: "Delivery", currentLevel: "Beginner", requiredLevel: "Advanced" },
  ];

  res.json(gaps);
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
  })));
});

export default router;
