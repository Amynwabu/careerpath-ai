import type {
  Certification,
  Education,
  Profile,
  Skill,
  WorkExperience,
} from "@workspace/db";

type CareerAnalysisInput = {
  profile: Partial<
    Pick<
      Profile,
      | "currentRole"
      | "industry"
      | "professionalSummary"
      | "weeklyLearningHours"
      | "yearsExperience"
    >
  >;
  targetRole: string;
  targetYears: number;
  skills: Array<Pick<Skill, "name">>;
  workExperiences: Array<Pick<WorkExperience, "company" | "title">>;
  education: Array<Pick<Education, "degree">>;
  certifications: Array<Pick<Certification, "name">>;
};

type CareerMilestone = {
  title: string;
  phase: string;
  description: string;
};

function getTimelineLabels(targetYears: number) {
  const midpoint = Math.min(Math.ceil(targetYears / 2), targetYears);
  const lateStart = Math.min(midpoint + 1, targetYears);

  return {
    analysisMidpoint:
      midpoint <= 2
        ? targetYears >= 2
          ? "Year 2"
          : "Year 1"
        : `Years 2-${midpoint}`,
    milestoneMidpoint:
      midpoint <= 2
        ? targetYears >= 2
          ? "Year 2"
          : "Year 1"
        : `Year 2-${midpoint}`,
    analysisLate:
      lateStart >= targetYears
        ? `Year ${targetYears}`
        : `Years ${lateStart}-${targetYears}`,
    milestoneLate:
      lateStart >= targetYears
        ? `Year ${targetYears}`
        : `Year ${lateStart}-${targetYears}`,
  };
}

function getReadinessScore({
  profile,
  skills,
  workExperiences,
  education,
  certifications,
}: Pick<
  CareerAnalysisInput,
  "profile" | "skills" | "workExperiences" | "education" | "certifications"
>) {
  const yearsExperience = profile.yearsExperience ?? 0;
  let score = 20;

  if (yearsExperience >= 1) score += 10;
  if (yearsExperience >= 3) score += 10;
  if (yearsExperience >= 5) score += 5;
  if (skills.length >= 3) score += 10;
  if (skills.length >= 8) score += 5;
  if (certifications.length >= 1) score += 10;
  if (certifications.length >= 3) score += 5;
  if (workExperiences.length >= 1) score += 10;
  if (education.length >= 1) score += 5;
  if (profile.professionalSummary) score += 5;
  if (profile.industry) score += 5;

  return Math.min(score, 82);
}

export function generateCareerAnalysis({
  profile,
  targetRole,
  targetYears,
  skills,
  workExperiences,
  education,
  certifications,
}: CareerAnalysisInput) {
  const yearsExperience = profile.yearsExperience ?? 0;
  const currentRole = profile.currentRole ?? "Professional";
  const readinessScore = getReadinessScore({
    profile,
    skills,
    workExperiences,
    education,
    certifications,
  });

  const topSkills =
    skills
      .slice(0, 5)
      .map((skill) => skill.name)
      .join(", ") || "general professional skills";
  const latestRole = workExperiences[0]?.title ?? currentRole;
  const latestCompany = workExperiences[0]?.company ?? "your organisation";
  const highestDegree = education[0]?.degree ?? "your qualification";
  const timeline = getTimelineLabels(targetYears);

  const profileSummary = `You are currently a ${latestRole} at ${latestCompany} with ${yearsExperience} years of experience in ${profile.industry ?? "your field"}. Your profile demonstrates a solid foundation with ${skills.length} documented skills and ${certifications.length} certification(s). Based on your background, you have a ${readinessScore}% readiness score for your target role of ${targetRole}.`;

  const currentStrengths = `Your core strengths include: ${topSkills}. Your ${yearsExperience >= 5 ? "extensive" : yearsExperience >= 2 ? "growing" : "foundational"} experience in ${profile.industry ?? "your sector"} positions you well to begin this transition. ${education.length > 0 ? `Your ${highestDegree} provides the academic foundation required.` : ""} Your demonstrated track record across ${workExperiences.length} role(s) shows career progression.`;

  const skillGaps = `To reach ${targetRole}, you will need to develop competencies in strategic leadership, stakeholder management, and advanced ${targetRole.toLowerCase().includes("ai") || targetRole.toLowerCase().includes("data") ? "AI/ML and data engineering" : "domain-specific technical"} capabilities. Communication at the executive level, change management, and cross-functional delivery are critical gaps to address. Consider deepening expertise in emerging tools and methodologies relevant to the ${targetRole} space.`;

  const experienceGaps = `You currently lack direct experience in ${targetRole.split(" ").slice(-2).join(" ")} responsibilities such as P&L ownership, team leadership at scale, and strategic programme delivery. You will need at least 2-3 years in progressively senior roles to close this gap. Seek opportunities for project leadership, mentoring junior staff, and representing your team in senior forums.`;

  const qualificationGaps = `Industry-recognised credentials relevant to ${targetRole} would strengthen your candidacy significantly. Consider pursuing relevant postgraduate qualifications if your target role is highly credentialed. A professional certificate from a recognised body in your target domain is strongly recommended within the next 12 months.`;

  const certificationRecommendations = `Priority certifications for ${targetRole}: 1) Project Management Professional (PMP) or PRINCE2 if transitioning to delivery leadership. 2) Relevant cloud or technology certifications (AWS, Azure, Google Cloud) for technical roles. 3) CIPD, CMI Level 5/7 or equivalent for people leadership roles. 4) Agile/Scrum Master certification for product or delivery roles. 5) Sector-specific credentials relevant to your target industry.`;

  const suggestedProjects = `Build your portfolio with: 1) A cross-functional project you led end-to-end. 2) A data or AI implementation project demonstrating technical credibility. 3) A change initiative you championed with measurable outcomes. 4) An external contribution such as a conference talk, article, or open-source contribution. 5) Evidence of mentoring or coaching others in your field.`;

  const jobProgressionLadder = `Recommended progression: ${latestRole} → Senior ${latestRole.replace("Senior ", "")} → Lead / Principal ${latestRole.split(" ").slice(-1)[0]} → ${targetRole.includes("Director") || targetRole.includes("Head") ? targetRole : "Senior " + targetRole} → ${targetRole}. Estimated timeline: ${targetYears} years with deliberate development.`;

  const immediateActions = `In the next 90 days: 1) Complete your CareerPath AI profile and run a full gap analysis. 2) Identify and enrol in one priority certification course. 3) Request a stretch project or secondment opportunity. 4) Connect with 3 professionals already in your target role via LinkedIn. 5) Begin a personal learning routine of at least ${profile.weeklyLearningHours ?? 5} hours per week.`;

  const year1Priorities = `Year 1 focus: Foundational capability building. Complete your first priority certification. Volunteer for a leadership opportunity within your current organisation. Build a professional network in your target sector. Begin developing a portfolio of evidence. Set up a mentoring relationship with someone 2-3 roles ahead of you on your target path.`;

  const year2To3Plan = `${timeline.analysisMidpoint} focus: Capability acceleration and visibility. Move into a role with direct reports or significant stakeholder responsibility. Complete your second priority qualification. Deliver at least one high-visibility project. Begin speaking or publishing in your professional community. Seek roles that give you P&L or budget accountability.`;

  const year4To5Plan = `${timeline.analysisLate} focus: Positioning for the target role. Apply for roles within 1 step of ${targetRole}. Build a track record of delivering at scale. Develop your personal brand and executive presence. Engage with senior industry networks. By year ${targetYears}, you should be actively interviewing for ${targetRole} positions with a compelling evidence portfolio.`;

  return {
    readinessScore,
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

export function generateCareerMilestones(
  targetRole: string,
  targetYears: number,
): CareerMilestone[] {
  const timeline = getTimelineLabels(targetYears);

  return [
    {
      title: "Complete profile and career goal setup",
      phase: "Immediate (0-90 days)",
      description: `Fill out all profile sections and set your ${targetYears}-year career goal`,
    },
    {
      title: "Enrol in a priority certification course",
      phase: "Immediate (0-90 days)",
      description: "Identify and start your first professional certification",
    },
    {
      title: "Connect with 5 professionals in target role",
      phase: "Immediate (0-90 days)",
      description: "Build your network in the direction of your target career",
    },
    {
      title: "Complete first certification",
      phase: "Year 1",
      description: `Earn a credential relevant to ${targetRole}`,
    },
    {
      title: "Take on a leadership opportunity",
      phase: "Year 1",
      description:
        "Lead a project or team initiative within your current organisation",
    },
    {
      title: "Build a portfolio piece",
      phase: "Year 1",
      description:
        "Create a tangible piece of evidence demonstrating your target capabilities",
    },
    {
      title: "Move into a role with team responsibility",
      phase: timeline.milestoneMidpoint,
      description:
        "Progress to a role with direct reports or significant stakeholder ownership",
    },
    {
      title: "Complete second priority qualification",
      phase: timeline.milestoneMidpoint,
      description: "Deepen your credentials with a second key certification",
    },
    {
      title: "Deliver a high-visibility project",
      phase: timeline.milestoneMidpoint,
      description: "Lead a project that demonstrates executive-level impact",
    },
    {
      title: "Apply for roles one step below target",
      phase: timeline.milestoneLate,
      description: `Secure a position 1 step below ${targetRole} to build final experience`,
    },
    {
      title: "Develop executive presence and personal brand",
      phase: timeline.milestoneLate,
      description: "Speak at an event or publish thought leadership content",
    },
    {
      title: `Land the ${targetRole} role`,
      phase: timeline.milestoneLate,
      description: `Achieve your ${targetYears}-year career target`,
    },
  ];
}
