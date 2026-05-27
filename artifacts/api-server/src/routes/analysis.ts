import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, careerAnalysesTable, careerGoalsTable, profilesTable, workExperiencesTable, educationTable, skillsTable, certificationsTable, milestonesTable, activityLogTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const inProgressUsers = new Set<number>();
const idempotencyCache = new Map<string, { expiresAt: number; response: unknown }>();

const PROMPT_VERSION = "local-rubric-2026-05";
const MODEL_NAME = "deterministic-rubric-v1";

type ProfileInput = { currentRole?: string | null; yearsExperience?: number | null; industry?: string | null; professionalSummary?: string | null; careerLevel?: string | null; weeklyLearningHours?: number | null };
type SkillInput = { name: string; category: string; proficiencyLevel: string };
type WorkInput = { company: string; title: string; description?: string | null };
type EducationInput = { degree: string; institution: string; fieldOfStudy?: string | null };
type CertificationInput = { name: string; issuingOrganization: string };

type AnalysisParams = {
  profile: ProfileInput;
  goal: { targetRole: string; targetYears?: number | null };
  targetRole: string;
  targetYears: number; // Retained API/database field name; value is interpreted as months.
  skills: SkillInput[];
  workExp: WorkInput[];
  education: EducationInput[];
  certifications: CertificationInput[];
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function tokenizeEstimate(value: unknown) {
  return Math.ceil(JSON.stringify(value).length / 4);
}

function listText(items: string[]) {
  return items.map((item, index) => `${index + 1}) ${item}`).join(" ");
}

function buildRoadmapPhases(targetRole: string, targetMonths: number, weeklyLearningHours: number) {
  const totalMonths = Math.max(1, targetMonths);
  const phaseCount = totalMonths <= 24 ? Math.min(4, Math.max(2, Math.ceil(totalMonths / 6))) : 4;
  const phaseMonths = Math.max(3, Math.round(totalMonths / phaseCount));
  const phases = [
    {
      sequence: 1,
      label: "Immediate foundation",
      timeframeMonths: Math.min(3, phaseMonths),
      focus: "Profile completeness, first learning commitment, and target-role research.",
      actions: [
        "Complete every profile section and validate your target role assumptions.",
        `Reserve ${weeklyLearningHours} learning hours per week and choose one priority credential.`,
        `Interview or connect with at least three professionals already working as ${targetRole}.`,
      ],
    },
    {
      sequence: 2,
      label: "Capability build",
      timeframeMonths: phaseMonths,
      focus: "Close the most visible skill and qualification gaps.",
      actions: [
        "Complete the first priority certification or equivalent portfolio proof.",
        "Take ownership of one stretch project with measurable outcomes.",
        "Document evidence for each required capability in a living portfolio.",
      ],
    },
    {
      sequence: 3,
      label: "Leadership proof",
      timeframeMonths: phaseMonths,
      focus: "Demonstrate senior responsibility, stakeholder influence, and delivery at scale.",
      actions: [
        "Lead a cross-functional initiative with senior stakeholder visibility.",
        "Mentor or coach junior colleagues to show scalable leadership.",
        "Publish, present, or otherwise build credibility in the target domain.",
      ],
    },
    {
      sequence: 4,
      label: "Target-role conversion",
      timeframeMonths: Math.max(3, totalMonths - (phaseMonths * 2) - 3),
      focus: `Position yourself for ${targetRole} roles and interview with evidence.`,
      actions: [
        `Apply for roles one step below or directly aligned to ${targetRole}.`,
        "Refine your CV and LinkedIn profile around measurable transition evidence.",
        "Build a final interview narrative connecting skills, experience, and leadership impact.",
      ],
    },
  ];
  return phases.slice(0, phaseCount).map((phase, index) => ({ ...phase, sequence: index + 1 }));
}

function generateAnalysis(params: AnalysisParams) {
  const startedAt = Date.now();
  const { profile, goal, targetRole, targetYears, skills, workExp, education, certifications } = params;

  const yearsExp = profile.yearsExperience ?? 0;
  const currentRole = profile.currentRole ?? "Professional";
  const skillCount = skills.length;
  const certCount = certifications.length;
  const weeklyLearningHours = profile.weeklyLearningHours ?? 5;

  const skillsCoverage = clampScore(25 + Math.min(skillCount * 7, 45) + Math.min(certCount * 5, 15) + (profile.professionalSummary ? 10 : 0));
  const experienceDepth = clampScore(20 + Math.min(yearsExp * 7, 55) + Math.min(workExp.length * 8, 20));
  const qualificationFit = clampScore(20 + (education.length > 0 ? 25 : 0) + Math.min(certCount * 15, 40) + (profile.industry ? 10 : 0));
  const leadershipReadiness = clampScore(15 + Math.min(yearsExp * 5, 35) + (workExp.some(w => /lead|manager|head|principal|senior/i.test(w.title)) ? 25 : 0) + Math.min(skillCount * 3, 20));
  const readinessSubScores = { skillsCoverage, experienceDepth, qualificationFit, leadershipReadiness };
  const readinessScore = clampScore(
    readinessSubScores.skillsCoverage * 0.30 +
    readinessSubScores.experienceDepth * 0.30 +
    readinessSubScores.qualificationFit * 0.20 +
    readinessSubScores.leadershipReadiness * 0.20,
  );

  const topSkills = skills.slice(0, 5).map(s => s.name);
  const latestRole = workExp[0]?.title ?? currentRole;
  const latestCompany = workExp[0]?.company ?? "your organisation";
  const highestDegree = education[0]?.degree ?? "your qualification";
  const isTechnicalTarget = /ai|data|engineer|developer|software|architect|product/i.test(targetRole);

  const currentStrengthsStructured = [
    { title: "Existing domain foundation", category: "Experience", evidence: `${yearsExp} year(s) of experience with ${workExp.length} documented role(s).` },
    { title: "Documented skills inventory", category: "Skills", evidence: topSkills.length ? topSkills.join(", ") : "Add more skills to make this assessment stronger." },
    { title: "Credential base", category: "Qualifications", evidence: education.length > 0 ? `${highestDegree} plus ${certCount} certification(s).` : `${certCount} certification(s); add education details if applicable.` },
  ];

  const skillGapsStructured = [
    { skill: "Strategic Leadership", priority: "High" as const, category: "Leadership", currentLevel: leadershipReadiness >= 70 ? "Intermediate" : null, requiredLevel: "Expert", rationale: "Target-role readiness requires evidence of operating through others and influencing senior stakeholders." },
    { skill: "Executive Stakeholder Management", priority: "High" as const, category: "Communication", currentLevel: null, requiredLevel: "Advanced", rationale: "Senior transitions depend on consistent communication with decision makers across functions." },
    { skill: isTechnicalTarget ? "Advanced Technical Depth" : "Domain Expertise", priority: "High" as const, category: isTechnicalTarget ? "Technical" : "Domain", currentLevel: skillCount >= 8 ? "Intermediate" : "Beginner", requiredLevel: "Expert", rationale: `The ${targetRole} path needs credible, up-to-date expertise beyond general experience.` },
    { skill: "Change Management", priority: "Medium" as const, category: "Management", currentLevel: null, requiredLevel: "Advanced", rationale: "Progression into larger roles requires leading adoption, not only delivering tasks." },
    { skill: "Budget and Commercial Ownership", priority: "Medium" as const, category: "Business", currentLevel: null, requiredLevel: "Intermediate", rationale: "Commercial accountability strengthens senior-role credibility." },
  ];

  const immediateActionsStructured = [
    { title: "Complete profile gaps", timeframe: "7 days", outcome: "Improve analysis accuracy and dashboard completeness." },
    { title: "Start one priority credential", timeframe: "30 days", outcome: `Build evidence for ${targetRole} readiness.` },
    { title: "Secure a stretch project", timeframe: "60 days", outcome: "Create measurable leadership or delivery proof." },
    { title: "Build target-role network", timeframe: "90 days", outcome: "Validate expectations and uncover opportunities." },
  ];

  const roadmapPhases = buildRoadmapPhases(targetRole, targetYears, weeklyLearningHours);
  const year1Priorities = `${roadmapPhases[0].label}: ${roadmapPhases[0].actions.join(" ")}`;
  const year2To3Plan = roadmapPhases[1] ? `${roadmapPhases[1].label}: ${roadmapPhases[1].actions.join(" ")}` : year1Priorities;
  const year4To5Plan = roadmapPhases.slice(2).map(phase => `${phase.label}: ${phase.actions.join(" ")}`).join(" ") || year2To3Plan;

  const profileSummary = `You are currently a ${latestRole} at ${latestCompany} with ${yearsExp} years of experience in ${profile.industry ?? "your field"}. Your structured readiness score for ${targetRole} is ${readinessScore}%, calculated from skills coverage, experience depth, qualification fit, and leadership readiness.`;
  const currentStrengths = currentStrengthsStructured.map(s => `${s.title}: ${s.evidence}`).join(" ");
  const skillGaps = skillGapsStructured.map(g => `${g.skill} (${g.priority}): ${g.rationale}`).join(" ");
  const experienceGaps = `To reach ${targetRole}, prioritise evidence of senior responsibility, measurable delivery outcomes, and stakeholder ownership. Seek roles or projects that expose you to team leadership, budget accountability, and strategic programme delivery.`;
  const qualificationGaps = `Credentials relevant to ${targetRole} would strengthen your candidacy. Prioritise qualifications that create demonstrable evidence instead of collecting generic certificates.`;
  const certificationRecommendations = listText([
    isTechnicalTarget ? "Cloud, data, AI, or architecture certification aligned to the target stack" : "Recognised sector-specific professional credential",
    "Project, programme, or agile delivery credential such as PMP, PRINCE2, or Scrum Master where relevant",
    "Leadership or management qualification such as CMI, CIPD, or an equivalent local credential",
  ]);
  const suggestedProjects = listText([
    "Lead a cross-functional project from discovery through measurable delivery",
    isTechnicalTarget ? "Build a technical portfolio project showing target-role depth" : "Produce a domain case study with commercial or operational impact",
    "Publish a short thought-leadership article or give an internal presentation",
  ]);
  const jobProgressionLadder = `${latestRole} → Senior ${latestRole.replace(/^Senior\s+/i, "")} → Lead / Principal role → ${targetRole}. Estimated timeline: ${targetYears} month(s) with deliberate development.`;
  const immediateActions = immediateActionsStructured.map(a => `${a.title} (${a.timeframe}): ${a.outcome}`).join(" ");

  const profileSnapshot = {
    profile,
    careerGoal: goal,
    skills,
    workExperience: workExp,
    education,
    certifications,
  };
  const output = {
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
    modelName: MODEL_NAME,
    promptVersion: PROMPT_VERSION,
    inputTokens: tokenizeEstimate(profileSnapshot),
    outputTokens: 0,
    latencyMs: 0,
    profileSnapshot,
  };
  output.outputTokens = tokenizeEstimate(output);
  output.latencyMs = Date.now() - startedAt;
  return output;
}

function generateMilestones(targetRole: string, roadmapPhases: Array<{ label: string; actions: string[] }>) {
  return roadmapPhases.flatMap((phase) => phase.actions.slice(0, 3).map((action, index) => ({
    title: index === phase.actions.length - 1 && phase.label.includes("Target-role") ? `Land the ${targetRole} role` : action.replace(/\.$/, ""),
    phase: phase.label,
    description: action,
  })));
}

router.post("/analysis", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const idempotencyKey = typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key")! : undefined;
  const cacheKey = idempotencyKey ? `${userId}:${idempotencyKey}` : undefined;

  if (cacheKey) {
    const cached = idempotencyCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      res.status(200).json(cached.response);
      return;
    }
  }

  if (inProgressUsers.has(userId)) {
    res.status(409).json({ error: "An analysis is already in progress. Please wait for it to complete before starting another." });
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
    const targetYears = goal.targetYears ?? 24;

    logger.info({ userId, targetRole: goal.targetRole, targetYears, promptVersion: PROMPT_VERSION }, "Running career analysis");

    const analysis = generateAnalysis({ profile: profile ?? {}, goal, targetRole: goal.targetRole, targetYears, skills, workExp, education, certifications });

    const [saved] = await db.insert(careerAnalysesTable).values({
      userId,
      targetRole: goal.targetRole,
      ...analysis,
    }).returning();

    const milestones = generateMilestones(goal.targetRole, analysis.roadmapPhases);
    for (const m of milestones) {
      await db.insert(milestonesTable).values({ userId, analysisId: saved.id, ...m, completed: false });
    }

    await db.insert(activityLogTable).values({
      userId,
      type: "analysis",
      description: `Ran career analysis for ${goal.targetRole} — readiness score: ${analysis.readinessScore}%`,
      entityType: "career_analysis",
      entityId: saved.id,
      metadata: {
        readinessSubScores: analysis.readinessSubScores,
        modelName: analysis.modelName,
        promptVersion: analysis.promptVersion,
        inputTokens: analysis.inputTokens,
        outputTokens: analysis.outputTokens,
        latencyMs: analysis.latencyMs,
      },
    });

    const response = { ...saved, createdAt: saved.createdAt.toISOString() };
    if (cacheKey) idempotencyCache.set(cacheKey, { expiresAt: Date.now() + 24 * 60 * 60 * 1000, response });
    res.status(201).json(response);
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

  res.json(analyses.map(a => ({ ...a, createdAt: a.createdAt.toISOString() })));
});

export default router;
