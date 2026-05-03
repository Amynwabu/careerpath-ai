import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, careerAnalysesTable, careerGoalsTable, profilesTable, workExperiencesTable, educationTable, skillsTable, certificationsTable, milestonesTable, activityLogTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function generateAnalysis(params: {
  profile: { currentRole?: string | null; yearsExperience?: number | null; industry?: string | null; professionalSummary?: string | null; careerLevel?: string | null; weeklyLearningHours?: number | null };
  targetRole: string;
  targetYears: number;
  skills: { name: string; category: string; proficiencyLevel: string }[];
  workExp: { company: string; title: string; description?: string | null }[];
  education: { degree: string; institution: string; fieldOfStudy?: string | null }[];
  certifications: { name: string; issuingOrganization: string }[];
}) {
  const { profile, targetRole, targetYears, skills, workExp, education, certifications } = params;

  const yearsExp = profile.yearsExperience ?? 0;
  const currentRole = profile.currentRole ?? "Professional";
  const skillCount = skills.length;
  const certCount = certifications.length;

  // Compute a readiness score based on profile completeness and experience
  let score = 20; // base
  if (yearsExp >= 1) score += 10;
  if (yearsExp >= 3) score += 10;
  if (yearsExp >= 5) score += 5;
  if (skillCount >= 3) score += 10;
  if (skillCount >= 8) score += 5;
  if (certCount >= 1) score += 10;
  if (certCount >= 3) score += 5;
  if (workExp.length >= 1) score += 10;
  if (education.length >= 1) score += 5;
  if (profile.professionalSummary) score += 5;
  if (profile.industry) score += 5;
  score = Math.min(score, 82); // Cap at 82 — full score requires real AI

  const topSkills = skills.slice(0, 5).map(s => s.name).join(", ") || "general professional skills";
  const latestRole = workExp[0]?.title ?? currentRole;
  const latestCompany = workExp[0]?.company ?? "your organisation";
  const highestDegree = education[0]?.degree ?? "your qualification";

  const profileSummary = `You are currently a ${latestRole} at ${latestCompany} with ${yearsExp} years of experience in ${profile.industry ?? "your field"}. Your profile demonstrates a solid foundation with ${skillCount} documented skills and ${certCount} certification(s). Based on your background, you have a ${score}% readiness score for your target role of ${targetRole}.`;

  const currentStrengths = `Your core strengths include: ${topSkills}. Your ${yearsExp >= 5 ? "extensive" : yearsExp >= 2 ? "growing" : "foundational"} experience in ${profile.industry ?? "your sector"} positions you well to begin this transition. ${education.length > 0 ? `Your ${highestDegree} provides the academic foundation required.` : ""} Your demonstrated track record across ${workExp.length} role(s) shows career progression.`;

  const skillGaps = `To reach ${targetRole}, you will need to develop competencies in strategic leadership, stakeholder management, and advanced ${targetRole.toLowerCase().includes("ai") || targetRole.toLowerCase().includes("data") ? "AI/ML and data engineering" : "domain-specific technical"} capabilities. Communication at the executive level, change management, and cross-functional delivery are critical gaps to address. Consider deepening expertise in emerging tools and methodologies relevant to the ${targetRole} space.`;

  const experienceGaps = `You currently lack direct experience in ${targetRole.split(" ").slice(-2).join(" ")} responsibilities such as P&L ownership, team leadership at scale, and strategic programme delivery. You will need at least 2-3 years in progressively senior roles to close this gap. Seek opportunities for project leadership, mentoring junior staff, and representing your team in senior forums.`;

  const qualificationGaps = `Industry-recognised credentials relevant to ${targetRole} would strengthen your candidacy significantly. Consider pursuing relevant postgraduate qualifications if your target role is highly credentialed. A professional certificate from a recognised body in your target domain is strongly recommended within the next 12 months.`;

  const certificationRecommendations = `Priority certifications for ${targetRole}: 1) Project Management Professional (PMP) or PRINCE2 if transitioning to delivery leadership. 2) Relevant cloud or technology certifications (AWS, Azure, Google Cloud) for technical roles. 3) CIPD, CMI Level 5/7 or equivalent for people leadership roles. 4) Agile/Scrum Master certification for product or delivery roles. 5) Sector-specific credentials relevant to your target industry.`;

  const suggestedProjects = `Build your portfolio with: 1) A cross-functional project you led end-to-end. 2) A data or AI implementation project demonstrating technical credibility. 3) A change initiative you championed with measurable outcomes. 4) An external contribution such as a conference talk, article, or open-source contribution. 5) Evidence of mentoring or coaching others in your field.`;

  const jobProgressionLadder = `Recommended progression: ${latestRole} → Senior ${latestRole.replace("Senior ", "")} → Lead / Principal ${latestRole.split(" ").slice(-1)[0]} → ${targetRole.includes("Director") || targetRole.includes("Head") ? targetRole : "Senior " + targetRole} → ${targetRole}. Estimated timeline: ${targetYears} years with deliberate development.`;

  const immediateActions = `In the next 90 days: 1) Complete your CareerPath AI profile and run a full gap analysis. 2) Identify and enrol in one priority certification course. 3) Request a stretch project or secondment opportunity. 4) Connect with 3 professionals already in your target role via LinkedIn. 5) Begin a personal learning routine of at least ${profile.weeklyLearningHours ?? 5} hours per week.`;

  // Compute phase boundaries valid for any targetYears 1–10
  const midPoint = Math.min(Math.ceil(targetYears / 2), targetYears);
  const lateStart = Math.min(midPoint + 1, targetYears);
  const midLabel = midPoint <= 2
    ? (targetYears >= 2 ? "Year 2" : "Year 1")
    : `Years 2-${midPoint}`;
  const lateLabel = lateStart >= targetYears
    ? `Year ${targetYears}`
    : `Years ${lateStart}-${targetYears}`;

  const year1Priorities = `Year 1 focus: Foundational capability building. Complete your first priority certification. Volunteer for a leadership opportunity within your current organisation. Build a professional network in your target sector. Begin developing a portfolio of evidence. Set up a mentoring relationship with someone 2-3 roles ahead of you on your target path.`;

  const year2To3Plan = `${midLabel} focus: Capability acceleration and visibility. Move into a role with direct reports or significant stakeholder responsibility. Complete your second priority qualification. Deliver at least one high-visibility project. Begin speaking or publishing in your professional community. Seek roles that give you P&L or budget accountability.`;

  const year4To5Plan = `${lateLabel} focus: Positioning for the target role. Apply for roles within 1 step of ${targetRole}. Build a track record of delivering at scale. Develop your personal brand and executive presence. Engage with senior industry networks. By year ${targetYears}, you should be actively interviewing for ${targetRole} positions with a compelling evidence portfolio.`;

  return {
    readinessScore: score,
    profileSummary,
    currentStrengths,
    skillGaps,
    experienceGaps,
    qualificationGaps,
    certificationRecommendations,
    suggestedProjects,
    jobProgressionLadder,
    immediateActions,
    year1Priorities,
    year2To3Plan,
    year4To5Plan,
  };
}

function generateMilestones(targetRole: string, targetYears: number) {
  // Safe clamp valid for all targetYears 1–10 (same logic as generateAnalysis/roadmap)
  const midPoint = Math.min(Math.ceil(targetYears / 2), targetYears);
  const lateStart = Math.min(midPoint + 1, targetYears);
  const midPhase = midPoint <= 2
    ? (targetYears >= 2 ? "Year 2" : "Year 1")
    : `Year 2-${midPoint}`;
  const latePhase = lateStart >= targetYears
    ? `Year ${targetYears}`
    : `Year ${lateStart}-${targetYears}`;
  return [
    { title: "Complete profile and career goal setup", phase: "Immediate (0-90 days)", description: `Fill out all profile sections and set your ${targetYears}-year career goal` },
    { title: "Enrol in a priority certification course", phase: "Immediate (0-90 days)", description: "Identify and start your first professional certification" },
    { title: "Connect with 5 professionals in target role", phase: "Immediate (0-90 days)", description: "Build your network in the direction of your target career" },
    { title: "Complete first certification", phase: "Year 1", description: `Earn a credential relevant to ${targetRole}` },
    { title: "Take on a leadership opportunity", phase: "Year 1", description: "Lead a project or team initiative within your current organisation" },
    { title: "Build a portfolio piece", phase: "Year 1", description: "Create a tangible piece of evidence demonstrating your target capabilities" },
    { title: "Move into a role with team responsibility", phase: midPhase, description: "Progress to a role with direct reports or significant stakeholder ownership" },
    { title: "Complete second priority qualification", phase: midPhase, description: "Deepen your credentials with a second key certification" },
    { title: "Deliver a high-visibility project", phase: midPhase, description: "Lead a project that demonstrates executive-level impact" },
    { title: "Apply for roles one step below target", phase: latePhase, description: `Secure a position 1 step below ${targetRole} to build final experience` },
    { title: "Develop executive presence and personal brand", phase: latePhase, description: "Speak at an event or publish thought leadership content" },
    { title: `Land the ${targetRole} role`, phase: latePhase, description: `Achieve your ${targetYears}-year career target` },
  ];
}

router.post("/analysis", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

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

  const targetYears = goal.targetYears ?? 5;

  logger.info({ userId, targetRole: goal.targetRole, targetYears }, "Running career analysis");

  const analysis = generateAnalysis({ profile: profile ?? {}, targetRole: goal.targetRole, targetYears, skills, workExp, education, certifications });

  const [saved] = await db.insert(careerAnalysesTable).values({
    userId,
    targetRole: goal.targetRole,
    ...analysis,
  }).returning();

  // Auto-create milestones if none exist
  const existingMilestones = await db.select().from(milestonesTable).where(eq(milestonesTable.userId, userId));
  if (existingMilestones.length === 0) {
    const milestones = generateMilestones(goal.targetRole, targetYears);
    for (const m of milestones) {
      await db.insert(milestonesTable).values({ userId, ...m, completed: false });
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
