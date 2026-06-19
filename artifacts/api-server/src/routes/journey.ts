import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  activityLogTable,
  careerAnalysesTable,
  careerGoalsTable,
  db,
  journeyStagesTable,
  journeysTable,
  milestonesTable,
  profilesTable,
  weeklyRemindersTable,
  type JourneyChecklistItem,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { careerDirections } from "../lib/career-directions";
import {
  buildProfessionJourneyStages,
  findProfessionDestination,
  getCareerDirectionMapping,
  getProfessionCluster,
} from "../lib/profession-mapping";

const router: IRouter = Router();

const stageTemplates = [
  {
    stageOrder: 1,
    title: "Build the foundation",
    duration: "Months 1-2",
    description:
      "Understand the core language, tools, and vocabulary of the target field.",
    resources: [
      {
        name: "Kaggle Python micro-course",
        type: "free" as const,
        price: "GBP 0",
      },
      {
        name: "Coursera foundations audit",
        type: "free" as const,
        price: "GBP 0",
      },
      {
        name: "Role-specific reference book",
        type: "paid" as const,
        price: "GBP 28",
      },
    ],
    checklist: [
      {
        key: "starter-course",
        title: "Finish the starter course",
        completed: false,
      },
      {
        key: "notes-repo",
        title: "Create a public notes repository",
        completed: false,
      },
      {
        key: "small-project",
        title: "Build one small portfolio example",
        completed: false,
      },
    ],
  },
  {
    stageOrder: 2,
    title: "Build proof",
    duration: "Months 3-5",
    description:
      "Create visible projects that demonstrate readiness for the transition.",
    resources: [
      { name: "Project brief library", type: "free" as const, price: "GBP 0" },
      { name: "Portfolio walkthroughs", type: "free" as const, price: "GBP 0" },
      {
        name: "Specialist short course",
        type: "paid" as const,
        price: "from GBP 39",
      },
    ],
    checklist: [
      { key: "case-study", title: "Ship one case study", completed: false },
      { key: "reviews", title: "Ask for two reviews", completed: false },
      {
        key: "cv-rewrite",
        title: "Rewrite your CV around evidence",
        completed: false,
      },
    ],
  },
  {
    stageOrder: 3,
    title: "Move into the market",
    duration: "Months 6-9",
    description: "Prepare applications, interviews, and advisor feedback.",
    resources: [
      {
        name: "Interview practice checklist",
        type: "free" as const,
        price: "GBP 0",
      },
      {
        name: "Target-role profile review",
        type: "free" as const,
        price: "GBP 0",
      },
      {
        name: "One-to-one advisor session",
        type: "paid" as const,
        price: "GBP 30",
      },
    ],
    checklist: [
      {
        key: "applications",
        title: "Apply to 10 realistic roles",
        completed: false,
      },
      {
        key: "advisor-review",
        title: "Book an advisor review",
        completed: false,
      },
      {
        key: "practice-interviews",
        title: "Record two practice interviews",
        completed: false,
      },
    ],
  },
];

router.post(
  "/journey/generate",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.userId;
    const [profile] = await db
      .select()
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId));
    const [goal] = await db
      .select()
      .from(careerGoalsTable)
      .where(eq(careerGoalsTable.userId, userId));
    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : "";

    if (!description && !profile?.professionalSummary && !goal?.targetRole) {
      res
        .status(400)
        .json({
          error:
            "Add a career description, profile summary, or career goal first.",
        });
      return;
    }

    const mappingInput = [
      description,
      profile?.currentRole,
      profile?.professionalSummary,
      profile?.industry,
    ]
      .filter(Boolean)
      .join(" ");
    const mapping = getCareerDirectionMapping(mappingInput);
    const rankedOptions = mapping.options;
    const options = goal?.targetRole
      ? [
          {
            id: "career-goal",
            title: goal.targetRole,
            durationMonths: Math.max(
              6,
              Math.min(60, (goal.targetYears ?? 1) * 12),
            ),
            rationale:
              "Continue from your saved career goal and latest analysis.",
            skills: [
              "Role fundamentals",
              "Portfolio evidence",
              "Interview readiness",
            ],
          },
          ...rankedOptions.filter((option) => option.title !== goal.targetRole),
        ]
      : rankedOptions;

    res.json({
      source: description
        ? "description"
        : goal?.targetRole
          ? "career-goal"
          : "profile",
      currentRole: profile?.currentRole ?? null,
      classification: mapping.classification,
      needsClarification: !goal?.targetRole && mapping.needsClarification,
      options,
    });
  },
);

router.post("/journey/build", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const directionId =
    typeof req.body?.selectedDirectionId === "string"
      ? req.body.selectedDirectionId
      : "";
  const [profile] = await db
    .select()
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));
  const [goal] = await db
    .select()
    .from(careerGoalsTable)
    .where(eq(careerGoalsTable.userId, userId));
  const [analysis] = await db
    .select()
    .from(careerAnalysesTable)
    .where(eq(careerAnalysesTable.userId, userId))
    .orderBy(desc(careerAnalysesTable.createdAt))
    .limit(1);

  const professionDestination = findProfessionDestination(directionId);
  const selectedDirection =
    directionId === "career-goal" && goal?.targetRole
      ? {
          id: "career-goal",
          title: goal.targetRole,
          durationMonths: Math.max(
            6,
            Math.min(60, (goal.targetYears ?? 1) * 12),
          ),
        }
      : (professionDestination?.destination ??
        careerDirections.find((option) => option.id === directionId));

  if (!selectedDirection) {
    res.status(400).json({ error: "Select a valid journey direction." });
    return;
  }

  const result = await db.transaction(async (tx) => {
    await tx
      .update(journeysTable)
      .set({ status: "archived" })
      .where(
        and(
          eq(journeysTable.userId, userId),
          eq(journeysTable.status, "active"),
        ),
      );

    // A rebuilt journey replaces the active roadmap. The archived journey keeps
    // its stage checklist, while dashboard milestones follow the new journey.
    await tx
      .delete(milestonesTable)
      .where(eq(milestonesTable.userId, userId));

    const [journey] = await tx
      .insert(journeysTable)
      .values({
        userId,
        analysisId: analysis?.id ?? null,
        selectedDirection: selectedDirection.id,
        currentRole: profile?.currentRole ?? null,
        targetRole: selectedDirection.title,
        durationMonths: selectedDirection.durationMonths,
        generatedFrom: analysis
          ? "career-analysis"
          : goal
            ? "career-goal"
            : "journey-builder",
      })
      .returning();

    const clusterInput = [
      profile?.currentRole,
      profile?.professionalSummary,
      profile?.industry,
      selectedDirection.title,
    ]
      .filter(Boolean)
      .join(" ");
    const professionCluster =
      professionDestination?.cluster ??
      getProfessionCluster(clusterInput, directionId);
    const templates = professionCluster
      ? buildProfessionJourneyStages(
          professionCluster,
          selectedDirection.durationMonths,
        )
      : stageTemplates;

    const stages = [];
    for (const template of templates) {
      const [stage] = await tx
        .insert(journeyStagesTable)
        .values({ userId, journeyId: journey.id, ...template })
        .returning();
      stages.push(stage);

      await tx.insert(milestonesTable).values(
        template.checklist.map((item) => ({
          userId,
          journeyStageId: stage.id,
          checklistItemKey: item.key,
          title: item.title,
          description: template.description,
          phase: template.duration,
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
        set: {
          journeyId: journey.id,
          frequency: "weekly",
          dayOfWeek: 1,
          updatedAt: new Date(),
        },
      });

    await tx.insert(activityLogTable).values({
      userId,
      type: "journey",
      description: `Built a journey toward ${selectedDirection.title}`,
    });

    return { journey, stages };
  });

  res.status(201).json(result);
});

router.get("/journey/:id", requireAuth, async (req, res): Promise<void> => {
  const journeyId = Number(req.params.id);
  if (!Number.isInteger(journeyId) || journeyId <= 0) {
    res.status(400).json({ error: "Journey id must be a positive integer." });
    return;
  }

  const [journey] = await db
    .select()
    .from(journeysTable)
    .where(
      and(
        eq(journeysTable.id, journeyId),
        eq(journeysTable.userId, req.user!.userId),
      ),
    );
  if (!journey) {
    res.status(404).json({ error: "Journey not found." });
    return;
  }

  const stages = await db
    .select()
    .from(journeyStagesTable)
    .where(eq(journeyStagesTable.journeyId, journey.id))
    .orderBy(asc(journeyStagesTable.stageOrder));

  res.json({ journey, stages });
});

router.patch(
  "/journey/stage/:id/milestone",
  requireAuth,
  async (req, res): Promise<void> => {
    const stageId = Number(req.params.id);
    const checklistItemKey =
      typeof req.body?.checklistItemKey === "string"
        ? req.body.checklistItemKey.trim()
        : "";
    const completed = req.body?.completed !== false;

    if (!Number.isInteger(stageId) || stageId <= 0 || !checklistItemKey) {
      res
        .status(400)
        .json({ error: "A valid stage id and checklistItemKey are required." });
      return;
    }

    const [stage] = await db
      .select()
      .from(journeyStagesTable)
      .where(
        and(
          eq(journeyStagesTable.id, stageId),
          eq(journeyStagesTable.userId, req.user!.userId),
        ),
      );
    if (!stage) {
      res.status(404).json({ error: "Journey stage not found." });
      return;
    }

    const itemExists = stage.checklist.some(
      (item) => item.key === checklistItemKey,
    );
    if (!itemExists) {
      res.status(404).json({ error: "Checklist item not found." });
      return;
    }

    const checklist: JourneyChecklistItem[] = stage.checklist.map((item) =>
      item.key === checklistItemKey ? { ...item, completed } : item,
    );
    const stageCompleted = checklist.every((item) => item.completed);
    const completedAt = stageCompleted ? new Date() : null;

    await db.transaction(async (tx) => {
      await tx
        .update(journeyStagesTable)
        .set({ checklist, completed: stageCompleted, completedAt })
        .where(eq(journeyStagesTable.id, stage.id));

      await tx
        .update(milestonesTable)
        .set({ completed, completedAt: completed ? new Date() : null })
        .where(
          and(
            eq(milestonesTable.userId, req.user!.userId),
            eq(milestonesTable.journeyStageId, stage.id),
            eq(milestonesTable.checklistItemKey, checklistItemKey),
          ),
        );

      const stages = await tx
        .select()
        .from(journeyStagesTable)
        .where(eq(journeyStagesTable.journeyId, stage.journeyId));
      const updatedStages = stages.map((item) =>
        item.id === stage.id
          ? { ...item, checklist, completed: stageCompleted }
          : item,
      );
      const items = updatedStages.flatMap((item) => item.checklist);
      const completedItems = items.filter((item) => item.completed).length;
      const progress =
        items.length === 0
          ? 0
          : Math.round((completedItems / items.length) * 100);

      await tx
        .update(journeysTable)
        .set({
          progress,
          status: progress === 100 ? "completed" : "active",
          completedAt: progress === 100 ? new Date() : null,
        })
        .where(eq(journeysTable.id, stage.journeyId));
    });

    res.json({ stageId, checklistItemKey, completed, stageCompleted });
  },
);

export default router;
