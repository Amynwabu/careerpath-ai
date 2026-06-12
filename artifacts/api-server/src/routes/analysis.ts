import { Router, type IRouter } from "express";
import {
  careerAnalysesTable,
  careerGoalsTable,
  certificationsTable,
  db,
  desc,
  educationTable,
  eq,
  milestonesTable,
  profilesTable,
  skillsTable,
  workExperiencesTable,
  type AnalysisProfileSnapshot,
  type ReadinessSubScores,
  type RoadmapPhase,
  type StructuredInsight,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logActivity } from "../lib/audit";
import { logger } from "../lib/logger";
import { buildLearningRecommendations, inferSkillCodesFromTargetRole } from "../lib/learning-recommendations";

const router: IRouter = Router();
const inProgressUsers = new Set<number>();
const idempotencyCache = new Map<string, { analysisId: number; expiresAt: number }>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

type ProfileInput = {
  currentRole?: string | null;
  totalExperienceMonths?: number | null;
  industry?: string | null;
  professionalSummary?: string | null;
  careerLevel?: string | null;
  weeklyLearningMinutes?: number | null;
};

type SkillInput = { name: string; category: string; proficiencyLevel: string };
type WorkExperienceInput = { company: string; title: string; description?: string | null };
type EducationInput = { degree: string; institution: string; fieldOfStudy?: string | null };
type CertificationInput = { name: string; issuingOrganization: string };

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function compactJoin(values: Array<string | null | undefined>, fallback: string): string {
  const cleaned = values.map((value) => value?.trim()).filter(Boolean) as string[];
  return cleaned.length > 0 ? cleaned.join(", ") : fallback;
}

function yearsFromMonths(totalExperienceMonths?: number | null): number {
  return Math.floor((totalExperienceMonths ?? 0) / 12);
}

function formatExperience(totalExperienceMonths?: number | null): string {
  const total = totalExperienceMonths ?? 0;
  const years = Math.floor(total / 12);
  const months = total % 12;
  if (years > 0 && months > 0) return `${years} year${years === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"}`;
  if (years > 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${months} month${months === 1 ? "" : "s"}`;
}

function formatWeeklyLearning(weeklyLearningMinutes?: number | null): string {
  const total = weeklyLearningMinutes ?? 0;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m / week`;
  if (hours > 0) return `${hours}h / week`;
  return `${minutes}m / week`;
}

export function buildReadinessSubScores(params: {
  profile: ProfileInput;
  skills: SkillInput[];
  workExp: WorkExperienceInput[];
  education: EducationInput[];
  certifications: CertificationInput[];
}): ReadinessSubScores {
  const { profile, skills, workExp, education, certifications } = params;
  const yearsExp = yearsFromMonths(profile.totalExperienceMonths);

  return {
    profile: clampScore(
      20 +
        (profile.currentRole ? 15 : 0) +
        (profile.industry ? 15 : 0) +
        (profile.professionalSummary ? 25 : 0) +
        (profile.careerLevel ? 10 : 0) +
        (profile.weeklyLearningMinutes ? 15 : 0),
    ),
    skills: clampScore(20 + skills.length * 8),
    experience: clampScore(15 + yearsExp * 8 + workExp.length * 12),
    education: clampScore(education.length > 0 ? 70 + Math.min(education.length, 3) * 10 : 35),
    certifications: clampScore(certifications.length > 0 ? 55 + Math.min(certifications.length, 4) * 10 : 25),
  };
}

function weightedReadiness(subScores: ReadinessSubScores): number {
  return clampScore(
    subScores.profile * 0.2 +
      subScores.skills * 0.25 +
      subScores.experience * 0.3 +
      subScores.education * 0.1 +
      subScores.certifications * 0.15,
  );
}

function splitTargetThemes(targetRole: string): { technical: string; leadership: string; business: string } {
  const lower = targetRole.toLowerCase();
  const technical =
    lower.includes("ai") || lower.includes("data")
      ? "AI, data product, model evaluation, and applied analytics"
      : lower.includes("product")
        ? "product strategy, discovery, delivery metrics, and customer insight"
        : "advanced domain methods, modern tooling, and evidence-based delivery";

  return {
    technical,
    leadership: "cross-functional leadership, stakeholder influence, and mentoring",
    business: "commercial judgement, prioritisation, and measurable impact",
  };
}

function skillLabelFromCode(skillCode: string): string {
  return skillCode
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildSkillGapInsights(targetRole: string, themes: ReturnType<typeof splitTargetThemes>): StructuredInsight[] {
  const [primarySkill = "data-analysis", secondarySkill = "stakeholder-management", tertiarySkill = "strategic-planning"] = inferSkillCodesFromTargetRole(targetRole);

  return [
    {
      title: `${skillLabelFromCode(primarySkill)} depth`,
      detail: `Build stronger evidence in ${themes.technical}.`,
      priority: "High",
      category: "Technical",
      skillCode: primarySkill,
      skillLabel: skillLabelFromCode(primarySkill),
    },
    {
      title: `${skillLabelFromCode(secondarySkill)} signal`,
      detail: `Show more proof of ${themes.leadership}.`,
      priority: "High",
      category: "Leadership",
      skillCode: secondarySkill,
      skillLabel: skillLabelFromCode(secondarySkill),
    },
    {
      title: `${skillLabelFromCode(tertiarySkill)} impact`,
      detail: `Translate work into ${themes.business} outcomes that hiring managers can compare.`,
      priority: "Medium",
      category: "Business",
      skillCode: tertiarySkill,
      skillLabel: skillLabelFromCode(tertiarySkill),
    },
  ];
}

export function buildRoadmapPhases(targetRole: string, targetMonths: number, weeklyLearningMinutes: number): RoadmapPhase[] {
  const months = Math.max(1, targetMonths);
  const foundationEnd = Math.max(1, Math.min(months, Math.min(3, Math.ceil(months * 0.25))));
  const accelerationStart = Math.min(months, foundationEnd + 1);
  const accelerationEnd = Math.max(accelerationStart, Math.min(months, Math.ceil(months * 0.6)));
  const positioningStart = Math.min(months, accelerationEnd + 1);

  return [
    {
      label: "Immediate",
      timeframe: "0-30 days",
      focus: "Clarify the target, baseline your evidence, and start one visible development action.",
      actions: [
        `Confirm the success profile for ${targetRole} by reviewing 5 job descriptions.`,
        `Block ${formatWeeklyLearning(weeklyLearningMinutes)} in your calendar.`,
        "Choose one credential, project, or mentor conversation to start this month.",
      ],
    },
    {
      label: "Foundation",
      timeframe: `Months 1-${foundationEnd}`,
      focus: "Build missing foundations and create proof that your current role can stretch toward the target.",
      actions: [
        "Complete the first priority learning module or certification milestone.",
        "Volunteer for a project with measurable business or user impact.",
        "Document your portfolio evidence in STAR format after each meaningful achievement.",
      ],
    },
    {
      label: "Acceleration",
      timeframe: `Months ${accelerationStart}-${accelerationEnd}`,
      focus: "Increase responsibility, visibility, and target-role signal.",
      actions: [
        "Lead a cross-functional deliverable and publish the outcome internally.",
        "Ask for feedback from a manager or mentor against the target role criteria.",
        "Build a second portfolio artifact showing leadership and technical judgement.",
      ],
    },
    {
      label: "Positioning",
      timeframe: `Months ${positioningStart}-${months}`,
      focus: `Convert evidence into applications, interviews, and a credible move into ${targetRole}.`,
      actions: [
        "Refresh your CV and LinkedIn around quantified outcomes.",
        "Apply for roles one step below or directly aligned with the target.",
        "Run interview practice using your portfolio evidence and readiness gaps.",
      ],
    },
  ];
}

function generateAnalysis(params: {
  profile: ProfileInput;
  targetRole: string;
  targetMonths: number;
  skills: SkillInput[];
  workExp: WorkExperienceInput[];
  education: EducationInput[];
  certifications: CertificationInput[];
}) {
  const startedAt = Date.now();
  const { profile, targetRole, targetMonths, skills, workExp, education, certifications } = params;
  const experienceLabel = formatExperience(profile.totalExperienceMonths);
  const currentRole = profile.currentRole ?? "Professional";
  const latestRole = workExp[0]?.title ?? currentRole;
  const latestCompany = workExp[0]?.company ?? "your organisation";
  const topSkills = compactJoin(skills.slice(0, 5).map((skill) => skill.name), "general professional skills");
  const highestDegree = education[0]?.degree ?? "your current qualification base";
  const weeklyLearningMinutes = profile.weeklyLearningMinutes ?? 300;
  const weeklyLearningLabel = formatWeeklyLearning(weeklyLearningMinutes);
  const themes = splitTargetThemes(targetRole);
  const readinessSubScores = buildReadinessSubScores({ profile, skills, workExp, education, certifications });
  const readinessScore = Math.min(weightedReadiness(readinessSubScores), 92);
  const roadmapPhases = buildRoadmapPhases(targetRole, targetMonths, weeklyLearningMinutes);

  const currentStrengthsStructured: StructuredInsight[] = [
    {
      title: "Relevant foundation",
      detail: `${latestRole} experience at ${latestCompany} gives you a practical base to connect to ${targetRole}.`,
      priority: "High",
      category: "Experience",
    },
    {
      title: "Documented skills",
      detail: `Your strongest visible skills are ${topSkills}. Keep turning these into measurable outcomes.`,
      priority: skills.length >= 5 ? "Medium" : "High",
      category: "Skills",
    },
    {
      title: "Learning capacity",
      detail: `${weeklyLearningLabel} is enough to make visible progress if focused on one priority at a time.`,
      priority: "Medium",
      category: "Execution",
    },
  ];

  const skillGapsStructured = buildSkillGapInsights(targetRole, themes);

  const immediateActionsStructured: StructuredInsight[] = [
    {
      title: "Map the role",
      detail: `Collect 5 ${targetRole} job descriptions and identify repeated skills, tools, and accountabilities.`,
      priority: "High",
      category: "Research",
    },
    {
      title: "Choose one proof project",
      detail: "Pick a project you can complete or influence in the next 90 days with a measurable outcome.",
      priority: "High",
      category: "Portfolio",
    },
    {
      title: "Close one credential gap",
      detail: "Start the most relevant certification, course, or structured learning path.",
      priority: "Medium",
      category: "Learning",
    },
  ];

  const profileSummary = `You are currently a ${latestRole} at ${latestCompany} with ${experienceLabel} of experience in ${profile.industry ?? "your field"}. Your profile shows ${skills.length} documented skill(s), ${certifications.length} certification(s), and a ${readinessScore}% readiness score for ${targetRole}.`;
  const currentStrengths = currentStrengthsStructured.map((item) => `${item.title}: ${item.detail}`).join(" ");
  const skillGaps = skillGapsStructured.map((item) => `${item.title}: ${item.detail}`).join(" ");
  const experienceGaps = `To reach ${targetRole}, build more direct evidence of target-role responsibilities: owning outcomes, influencing senior stakeholders, and leading work beyond your immediate remit.`;
  const qualificationGaps = education.length > 0
    ? `Your ${highestDegree} is a useful foundation. Add role-specific credentials only where they create clear hiring signal.`
    : "Add a recognised qualification or portfolio-backed learning path to strengthen credibility for the target role.";
  const certificationRecommendations = `Prioritise one credential aligned to ${themes.technical}; then add a delivery or leadership credential only if it supports your target job descriptions.`;
  const suggestedProjects = `Build a portfolio around: a measurable cross-functional project, a target-role technical artifact, a stakeholder-facing presentation, and a retrospective showing decisions and trade-offs.`;
  const jobProgressionLadder = `Recommended progression: ${latestRole} -> Senior ${latestRole.replace("Senior ", "")} -> Lead / Principal role -> ${targetRole}. Target timeline: ${targetMonths} months with focused evidence building.`;
  const immediateActions = immediateActionsStructured.map((item, index) => `${index + 1}) ${item.detail}`).join(" ");
  const year1Priorities = roadmapPhases[1]?.actions.join(" ") ?? "Build foundations and evidence.";
  const year2To3Plan = roadmapPhases[2]?.actions.join(" ") ?? "Accelerate visibility and responsibility.";
  const year4To5Plan = roadmapPhases[3]?.actions.join(" ") ?? "Position for target-role applications.";
  const learningRecommendations = buildLearningRecommendations({
    skillGaps: skillGapsStructured,
    roadmapPhases,
    targetRole,
    profileSkills: skills.map((skill) => skill.name),
    totalExperienceMonths: profile.totalExperienceMonths,
  });
  const profileSnapshot: AnalysisProfileSnapshot = {
    currentRole: profile.currentRole ?? null,
    totalExperienceMonths: profile.totalExperienceMonths ?? null,
    industry: profile.industry ?? null,
    careerLevel: profile.careerLevel ?? null,
    weeklyLearningMinutes: profile.weeklyLearningMinutes ?? null,
    skills: skills.map((skill) => skill.name),
    workExperienceCount: workExp.length,
    educationCount: education.length,
    certificationCount: certifications.length,
  };
  const promptBasis = JSON.stringify({ profile, targetRole, targetMonths, skills, workExp, education, certifications });

  return {
    readinessScore,
    readinessSubScores,
    profileSummary,
    currentStrengths,
    currentStrengthsStructured,
    skillGaps,
    skillGapsStructured,
    experienceGaps,
    qualificationGaps,
    certificationRecommendations,
    suggestedProjects,
    jobProgressionLadder,
    immediateActions,
    immediateActionsStructured,
    year1Priorities,
    year2To3Plan,
    year4To5Plan,
    roadmapPhases,
    learningRecommendations,
    modelName: "careerpath-rules-v2",
    promptVersion: "v2.0.0",
    inputTokens: Math.ceil(promptBasis.length / 4),
    outputTokens: Math.ceil(
      [
        profileSummary,
        currentStrengths,
        skillGaps,
        experienceGaps,
        qualificationGaps,
        certificationRecommendations,
        suggestedProjects,
        jobProgressionLadder,
        immediateActions,
      ].join(" ").length / 4,
    ),
    latencyMs: Date.now() - startedAt,
    profileSnapshot,
  };
}

function generateMilestones(targetRole: string, roadmapPhases: RoadmapPhase[]) {
  return roadmapPhases.flatMap((phase) =>
    phase.actions.map((action, index) => ({
      title: index === phase.actions.length - 1 && phase.label === "Positioning"
        ? `Land the ${targetRole} role`
        : action.replace(/\.$/, ""),
      phase: phase.timeframe,
      description: action,
      completed: false,
    })),
  );
}

function getIdempotencyKey(userId: number, rawKey: unknown): string | null {
  if (typeof rawKey !== "string" || rawKey.trim().length === 0) return null;
  return `${userId}:${rawKey.trim()}`;
}

async function readAnalysisForResponse(analysisId: number) {
  const [analysis] = await db.select().from(careerAnalysesTable).where(eq(careerAnalysesTable.id, analysisId)).limit(1);
  return analysis ? { ...analysis, createdAt: analysis.createdAt.toISOString() } : null;
}

router.post("/analysis", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const idempotencyKey = getIdempotencyKey(userId, req.header("idempotency-key"));
  const cached = idempotencyKey ? idempotencyCache.get(idempotencyKey) : undefined;

  if (cached && cached.expiresAt > Date.now()) {
    const cachedAnalysis = await readAnalysisForResponse(cached.analysisId);
    if (cachedAnalysis) {
      res.status(200).json(cachedAnalysis);
      return;
    }
  }

  if (inProgressUsers.has(userId)) {
    res.status(409).json({ error: "An analysis is already in progress for this user" });
    return;
  }

  inProgressUsers.add(userId);

  try {
    const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.userId, userId));
    const [goal] = await db.select().from(careerGoalsTable).where(eq(careerGoalsTable.userId, userId));

    if (!goal?.targetRole) {
      res.status(400).json({ error: "Please set your career goal before running analysis" });
      return;
    }

    const skills = await db.select().from(skillsTable).where(eq(skillsTable.userId, userId));
    const workExp = await db.select().from(workExperiencesTable).where(eq(workExperiencesTable.userId, userId));
    const education = await db.select().from(educationTable).where(eq(educationTable.userId, userId));
    const certifications = await db.select().from(certificationsTable).where(eq(certificationsTable.userId, userId));
    const targetMonths = goal.targetMonths ?? 60;

    logger.info({ userId, targetRole: goal.targetRole, targetMonths }, "Running career analysis");

    const analysis = generateAnalysis({
      profile: profile ?? {},
      targetRole: goal.targetRole,
      targetMonths,
      skills,
      workExp,
      education,
      certifications,
    });

    const [saved] = await db.insert(careerAnalysesTable).values({
      userId,
      targetRole: goal.targetRole,
      ...analysis,
    }).returning();

    const milestones = generateMilestones(goal.targetRole, analysis.roadmapPhases);
    for (const milestone of milestones) {
      await db.insert(milestonesTable).values({ userId, analysisId: saved.id, ...milestone });
    }

    await logActivity({
      userId,
      type: "analysis",
      description: `Ran career analysis for ${goal.targetRole}; readiness score: ${analysis.readinessScore}%`,
    });

    if (idempotencyKey) {
      idempotencyCache.set(idempotencyKey, { analysisId: saved.id, expiresAt: Date.now() + IDEMPOTENCY_TTL_MS });
    }

    res.status(201).json({ ...saved, createdAt: saved.createdAt.toISOString() });
  } finally {
    inProgressUsers.delete(userId);
  }
});

router.get("/analysis/latest", requireAuth, async (req, res): Promise<void> => {
  const [analysis] = await db.select().from(careerAnalysesTable)
    .where(eq(careerAnalysesTable.userId, req.user!.userId))
    .orderBy(desc(careerAnalysesTable.createdAt))
    .limit(1);

  if (!analysis) {
    res.status(404).json({ error: "No analysis found. Run your first analysis to get started." });
    return;
  }

  res.json({ ...analysis, createdAt: analysis.createdAt.toISOString() });
});

router.get("/analysis/history", requireAuth, async (req, res): Promise<void> => {
  const analyses = await db.select({
    id: careerAnalysesTable.id,
    readinessScore: careerAnalysesTable.readinessScore,
    targetRole: careerAnalysesTable.targetRole,
    createdAt: careerAnalysesTable.createdAt,
  }).from(careerAnalysesTable)
    .where(eq(careerAnalysesTable.userId, req.user!.userId))
    .orderBy(desc(careerAnalysesTable.createdAt));

  res.json(analyses.map((analysis) => ({ ...analysis, createdAt: analysis.createdAt.toISOString() })));
});

export default router;
