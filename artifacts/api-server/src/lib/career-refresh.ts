import { and, eq } from "drizzle-orm";
import {
  activityLogTable,
  careerAnalysesTable,
  careerGoalsTable,
  certificationsTable,
  db,
  educationTable,
  journeyStagesTable,
  journeysTable,
  milestonesTable,
  profilesTable,
  skillsTable,
  weeklyRemindersTable,
  workExperiencesTable,
} from "@workspace/db";
import { generateCareerAnalysis } from "./career-analysis";
import { getCareerPathOutcome } from "./career-path-outcome";
import {
  buildProfessionJourneyStages,
  clampTrainingDurationMonths,
  findProfessionDestination,
  getProfessionCluster,
  getTrainingStageRanges,
} from "./profession-mapping";

export type CareerRefreshInput = {
  source: "cv" | "description";
  fileName?: string | null;
  selectedDirectionId: string;
  targetRole: string;
  durationMonths: number;
  extractedSkills: string[];
  profile: {
    currentRole: string;
    industry: string;
    professionalSummary: string;
    careerLevel?: string;
    location?: string;
    yearsExperience?: number;
    weeklyLearningHours?: number;
  };
};

function buildGenericJourneyStages(targetRole: string, durationMonths: number) {
  const ranges = getTrainingStageRanges(durationMonths);
  return [
    {
      stageOrder: 1,
      title: "Validate the target route",
      duration: ranges[0],
      description: `Confirm the real selection criteria and evidence expected for ${targetRole}.`,
      resources: [
        { name: "Target-role evidence checklist", type: "free" as const, price: "GBP 0" },
      ],
      checklist: [
        { key: "role-requirements", title: "Review five current target-role specifications", completed: false },
        { key: "evidence-baseline", title: "Map existing evidence against the recurring criteria", completed: false },
      ],
    },
    {
      stageOrder: 2,
      title: "Build verified evidence",
      duration: ranges[1],
      description: `Complete one work-based proof point that demonstrates readiness for ${targetRole}.`,
      resources: [
        { name: "Evidence case-study template", type: "free" as const, price: "GBP 0" },
      ],
      checklist: [
        { key: "proof-project", title: "Complete one target-role evidence project", completed: false },
        { key: "practitioner-feedback", title: "Get feedback from a practitioner in the field", completed: false },
      ],
    },
    {
      stageOrder: 3,
      title: "Position for the move",
      duration: ranges[2],
      description: `Package verified experience and pursue realistic opportunities toward ${targetRole}.`,
      resources: [
        { name: "Career evidence portfolio guide", type: "free" as const, price: "GBP 0" },
      ],
      checklist: [
        { key: "portfolio-refresh", title: "Refresh CV and profile with measured evidence", completed: false },
        { key: "targeted-opportunities", title: "Pursue five evidence-matched opportunities", completed: false },
      ],
    },
  ];
}

export async function refreshCareerPath(userId: number, input: CareerRefreshInput) {
  const durationMonths = clampTrainingDurationMonths(input.durationMonths);
  const targetYears = Math.max(1, Math.ceil(durationMonths / 12));

  const [previousGoal] = await db
    .select({ targetRole: careerGoalsTable.targetRole })
    .from(careerGoalsTable)
    .where(eq(careerGoalsTable.userId, userId));
  const pathOutcome = getCareerPathOutcome(previousGoal?.targetRole, input.targetRole);

  return db.transaction(async (tx) => {
    await tx
      .update(profilesTable)
      .set({
        currentRole: input.profile.currentRole,
        industry: input.profile.industry,
        professionalSummary: input.profile.professionalSummary,
        careerLevel: input.profile.careerLevel || null,
        location: input.profile.location || null,
        yearsExperience: input.profile.yearsExperience,
        weeklyLearningHours: input.profile.weeklyLearningHours,
      })
      .where(eq(profilesTable.userId, userId));

    await tx
      .delete(skillsTable)
      .where(
        and(
          eq(skillsTable.userId, userId),
          eq(skillsTable.category, "Extracted from CV"),
        ),
      );

    const existingSkills = await tx
      .select({ name: skillsTable.name })
      .from(skillsTable)
      .where(eq(skillsTable.userId, userId));
    const existingSkillNames = new Set(
      existingSkills.map((skill) => skill.name.trim().toLowerCase()),
    );
    const uniqueExtractedSkills = Array.from(
      new Map(
        input.extractedSkills
          .map((skill) => skill.trim())
          .filter(
            (skill) =>
              Boolean(skill) && !existingSkillNames.has(skill.toLowerCase()),
          )
          .map((skill) => [skill.toLowerCase(), skill]),
      ).values(),
    ).slice(0, 50);
    if (uniqueExtractedSkills.length > 0) {
      await tx.insert(skillsTable).values(
        uniqueExtractedSkills.map((name) => ({
          userId,
          name,
          category: "Extracted from CV",
          proficiencyLevel: "Intermediate",
        })),
      );
    }

    await tx
      .insert(careerGoalsTable)
      .values({ userId, targetRole: input.targetRole, targetYears })
      .onConflictDoUpdate({
        target: careerGoalsTable.userId,
        set: {
          targetRole: input.targetRole,
          targetYears,
          updatedAt: new Date(),
        },
      });

    const [profile, skills, workExperiences, education, certifications] = await Promise.all([
      tx.select().from(profilesTable).where(eq(profilesTable.userId, userId)).then((rows) => rows[0]),
      tx.select().from(skillsTable).where(eq(skillsTable.userId, userId)),
      tx.select().from(workExperiencesTable).where(eq(workExperiencesTable.userId, userId)),
      tx.select().from(educationTable).where(eq(educationTable.userId, userId)),
      tx.select().from(certificationsTable).where(eq(certificationsTable.userId, userId)),
    ]);

    const analysis = generateCareerAnalysis({
      profile: profile ?? {},
      targetRole: input.targetRole,
      targetYears,
      skills,
      workExperiences,
      education,
      certifications,
    });
    const [savedAnalysis] = await tx
      .insert(careerAnalysesTable)
      .values({ userId, targetRole: input.targetRole, ...analysis })
      .returning();

    await tx
      .update(journeysTable)
      .set({ status: "archived" })
      .where(
        and(
          eq(journeysTable.userId, userId),
          eq(journeysTable.status, "active"),
        ),
      );
    await tx.delete(milestonesTable).where(eq(milestonesTable.userId, userId));

    const [journey] = await tx
      .insert(journeysTable)
      .values({
        userId,
        analysisId: savedAnalysis.id,
        selectedDirection: input.selectedDirectionId,
        currentRole: input.profile.currentRole,
        targetRole: input.targetRole,
        durationMonths,
        generatedFrom: `${input.source}-evidence-refresh`,
      })
      .returning();

    const professionDestination = findProfessionDestination(input.selectedDirectionId);
    const professionCluster = professionDestination?.cluster ?? getProfessionCluster(
      [
        input.profile.currentRole,
        input.profile.industry,
        input.profile.professionalSummary,
        input.targetRole,
      ].join(" "),
      input.selectedDirectionId,
    );
    const stages = professionCluster
      ? buildProfessionJourneyStages(professionCluster, durationMonths)
      : buildGenericJourneyStages(input.targetRole, durationMonths);

    for (const stageInput of stages) {
      const [stage] = await tx
        .insert(journeyStagesTable)
        .values({ userId, journeyId: journey.id, ...stageInput })
        .returning();
      await tx.insert(milestonesTable).values(
        stageInput.checklist.map((item) => ({
          userId,
          journeyStageId: stage.id,
          checklistItemKey: item.key,
          title: item.title,
          description: stageInput.description,
          phase: stageInput.duration,
          completed: false,
        })),
      );
    }

    await tx
      .insert(weeklyRemindersTable)
      .values({
        userId,
        journeyId: journey.id,
        frequency: "weekly",
        dayOfWeek: 1,
        contentLog: [],
      })
      .onConflictDoUpdate({
        target: weeklyRemindersTable.userId,
        set: { journeyId: journey.id, updatedAt: new Date() },
      });

    await tx.insert(activityLogTable).values([
      {
        userId,
        type: "profile",
        description: `Refreshed career evidence from ${input.source === "cv" ? input.fileName || "CV" : "work description"}`,
      },
      {
        userId,
        type: "analysis",
        description: `Reanalysed ${input.profile.currentRole} evidence for ${input.targetRole} - readiness score: ${analysis.readinessScore}%`,
      },
      {
        userId,
        type: "journey",
        description: pathOutcome.message,
      },
    ]);

    return {
      pathOutcome,
      analysis: {
        id: savedAnalysis.id,
        readinessScore: savedAnalysis.readinessScore,
      },
      journey: {
        id: journey.id,
        targetRole: journey.targetRole,
        durationMonths: journey.durationMonths,
      },
      refreshedAt: new Date().toISOString(),
    };
  });
}
