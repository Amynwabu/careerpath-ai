import { Router, type IRouter } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import {
  activityLogTable,
  careerAnalysesTable,
  careerGoalsTable,
  db,
  journeysTable,
  milestonesTable,
  profilesTable,
  skillsTable,
  workExperiencesTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { mapCareerText } from "../lib/career-intake";
import { getCareerDirectionMapping } from "../lib/profession-mapping";

const router: IRouter = Router();
const allowedFileTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

async function extractFileText(buffer: Buffer, fileType: string) {
  if (fileType === "application/pdf") {
    return (await pdfParse(buffer)).text;
  }
  if (
    fileType ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return (await mammoth.extractRawText({ buffer })).value;
  }
  return buffer.toString("utf8");
}

router.get(
  "/onboarding/status",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.userId;
    const [
      [profile],
      [goal],
      [latestAnalysis],
      [activeJourney],
      [skillCount],
      [workCount],
      milestones,
    ] = await Promise.all([
      db.select().from(profilesTable).where(eq(profilesTable.userId, userId)),
      db
        .select()
        .from(careerGoalsTable)
        .where(eq(careerGoalsTable.userId, userId)),
      db
        .select()
        .from(careerAnalysesTable)
        .where(eq(careerAnalysesTable.userId, userId))
        .orderBy(desc(careerAnalysesTable.createdAt))
        .limit(1),
      db
        .select()
        .from(journeysTable)
        .where(
          and(
            eq(journeysTable.userId, userId),
            eq(journeysTable.status, "active"),
          ),
        )
        .orderBy(desc(journeysTable.createdAt))
        .limit(1),
      db
        .select({ value: count() })
        .from(skillsTable)
        .where(eq(skillsTable.userId, userId)),
      db
        .select({ value: count() })
        .from(workExperiencesTable)
        .where(eq(workExperiencesTable.userId, userId)),
      db
        .select()
        .from(milestonesTable)
        .where(eq(milestonesTable.userId, userId)),
    ]);

    const hasCareerData = Boolean(
      latestAnalysis ||
      activeJourney ||
      (profile?.currentRole &&
        (profile.professionalSummary ||
          Number(skillCount.value) > 0 ||
          Number(workCount.value) > 0)),
    );
    const nextMilestone = milestones.find((milestone) => !milestone.completed);
    const completedMilestones = milestones.filter(
      (milestone) => milestone.completed,
    ).length;

    res.json({
      needsOnboarding: !hasCareerData,
      destination: hasCareerData ? "/dashboard" : "/onboarding",
      status: activeJourney
        ? activeJourney.progress === 100
          ? "Journey complete"
          : "Journey in progress"
        : latestAnalysis
          ? "Ready to build journey"
          : hasCareerData
            ? "Profile ready"
            : "Setup required",
      targetRole: goal?.targetRole ?? null,
      readinessScore: latestAnalysis?.readinessScore ?? null,
      journeyProgress: activeJourney?.progress ?? 0,
      milestonesCompleted: completedMilestones,
      milestonesTotal: milestones.length,
      nextAction:
        nextMilestone?.title ??
        (latestAnalysis
          ? "Build your career journey"
          : hasCareerData
            ? "Run your first analysis"
            : "Add your career background"),
    });
  },
);

router.post(
  "/onboarding/intake",
  requireAuth,
  async (req, res): Promise<void> => {
    const description =
      typeof req.body?.description === "string"
        ? req.body.description.trim()
        : "";
    const targetRole =
      typeof req.body?.targetRole === "string"
        ? req.body.targetRole.trim()
        : "";
    const fileName =
      typeof req.body?.fileName === "string" ? req.body.fileName.trim() : "";
    const fileType =
      typeof req.body?.fileType === "string" ? req.body.fileType.trim() : "";
    const fileBase64 =
      typeof req.body?.fileBase64 === "string" ? req.body.fileBase64 : "";

    if (!description && !fileBase64) {
      res
        .status(400)
        .json({ error: "Describe your work or upload a CV to continue." });
      return;
    }

    let fileText = "";
    if (fileBase64) {
      if (!allowedFileTypes.has(fileType)) {
        res.status(400).json({ error: "Upload a PDF, DOCX, or TXT CV." });
        return;
      }
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(fileBase64)) {
        res.status(400).json({ error: "The uploaded CV data is invalid." });
        return;
      }
      const fileBuffer = Buffer.from(fileBase64, "base64");
      if (fileBuffer.length === 0 || fileBuffer.length > 5 * 1024 * 1024) {
        res
          .status(400)
          .json({ error: "CV files must be between 1 byte and 5 MB." });
        return;
      }
      try {
        fileText = await extractFileText(fileBuffer, fileType);
      } catch {
        res
          .status(400)
          .json({
            error:
              "That CV could not be read. Try another file or a written description.",
          });
        return;
      }
    }
    const sourceText = [description, fileText]
      .filter(Boolean)
      .join("\n")
      .slice(0, 50_000);
    if (!sourceText.trim()) {
      res.status(400).json({ error: "No readable text was found in that CV." });
      return;
    }
    const extracted = mapCareerText(sourceText);
    const userId = req.user!.userId;

    await db.transaction(async (tx) => {
      const profileValues = Object.fromEntries(
        Object.entries(extracted).filter(
          ([key, value]) => key !== "skills" && value !== undefined,
        ),
      );
      await tx
        .update(profilesTable)
        .set(profileValues)
        .where(eq(profilesTable.userId, userId));

      const existingSkills = await tx
        .select({ name: skillsTable.name })
        .from(skillsTable)
        .where(eq(skillsTable.userId, userId));
      const existingNames = new Set(
        existingSkills.map((skill) => skill.name.toLowerCase()),
      );
      const newSkills = extracted.skills.filter(
        (skill) => !existingNames.has(skill.toLowerCase()),
      );
      if (newSkills.length > 0) {
        await tx.insert(skillsTable).values(
          newSkills.map((name) => ({
            userId,
            name,
            category: "Extracted from CV",
            proficiencyLevel: "Intermediate",
          })),
        );
      }

      await tx.insert(activityLogTable).values({
        userId,
        type: "profile",
        description: `Mapped career profile from ${fileBase64 ? "CV upload" : "work description"}`,
      });
    });

    const mapping = getCareerDirectionMapping(sourceText);
    const options = targetRole
      ? [
          {
            id: "career-goal",
            title: targetRole,
            durationMonths: 12,
            rationale:
              "Use your stated target as the primary direction, grounded in the experience we extracted.",
            skills: [
              "Role fundamentals",
              "Portfolio evidence",
              "Interview readiness",
            ],
            matchScore: 100,
          },
          ...mapping.options
            .filter(
              (option) =>
                option.title.toLowerCase() !== targetRole.toLowerCase(),
            )
            .slice(0, 3),
        ]
      : mapping.options;

    res.json({
      source: fileBase64 ? "cv" : "description",
      fileName: fileName || null,
      extracted,
      options,
      classification: mapping.classification,
      needsClarification: !targetRole && mapping.needsClarification,
    });
  },
);

export default router;
