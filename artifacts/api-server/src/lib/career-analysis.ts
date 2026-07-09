import type {
  Certification,
  Education,
  Profile,
  Skill,
  WorkExperience,
} from "@workspace/db";
import {
  getProfessionCluster,
  type ProfessionCluster,
} from "./profession-mapping";

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

const PLAN_PHASES = {
  foundations: "Months 1-2",
  practice: "Months 3-4",
  applications: "Months 5-6",
} as const;

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

function normalizeRole(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesRolePhrase(input: string, phrase: string) {
  const normalizedPhrase = normalizeRole(phrase);
  return (
    normalizedPhrase.length > 0 &&
    ` ${normalizeRole(input)} `.includes(` ${normalizedPhrase} `)
  );
}

function isNativeClusterTarget(
  cluster: ProfessionCluster,
  targetRole: string,
) {
  return [...cluster.aliases, ...cluster.destinations.map((item) => item.title)]
    .some(
      (phrase) =>
        includesRolePhrase(targetRole, phrase) ||
        includesRolePhrase(phrase, targetRole),
    );
}

function getTargetFocus(targetRole: string) {
  const role = normalizeRole(targetRole);

  if (/\b(data analyst|business intelligence|bi analyst|analytics)\b/.test(role)) {
    return {
      label: "entry-level data analyst pathway",
      gaps: [
        "SQL",
        "spreadsheet analysis",
        "dashboarding",
        "basic Python",
        "portfolio evidence",
      ],
      projects: [
        "Clean and analyse a public dataset with spreadsheet and SQL notes",
        "Build a simple dashboard that answers three business questions",
        "Write a short case study explaining the insight and recommendation",
      ],
      certification:
        "Choose one practical data analysis course only if it helps you produce portfolio evidence.",
      foundations:
        "learn SQL, spreadsheet analysis, dashboard basics, and data storytelling",
      practice:
        "build 2 to 3 portfolio projects with clear business questions and written findings",
      applications:
        "update your CV and LinkedIn, then start applying for junior or entry-level data analyst roles from month 5",
    };
  }

  if (/\b(software|developer|engineer|frontend|backend)\b/.test(role)) {
    return {
      label: "entry-level software pathway",
      gaps: [
        "programming fundamentals",
        "version control",
        "testing",
        "shipped projects",
        "technical interview practice",
      ],
      projects: [
        "Ship a small web app that solves a real workflow problem",
        "Add tests and a readable README to one public project",
        "Practise explaining tradeoffs from your project work",
      ],
      certification:
        "Prioritise shipped projects over certificates unless a course fills a specific fundamentals gap.",
      foundations:
        "learn programming fundamentals, Git, testing, and one practical application stack",
      practice:
        "ship 2 portfolio projects that show problem solving, code quality, and user value",
      applications:
        "refresh your CV and profile, practise interviews, and apply from month 5",
    };
  }

  return {
    label: `${targetRole} pathway`,
    gaps: [
      "target-role fundamentals",
      "verified portfolio evidence",
      "field-specific tools",
      "practitioner feedback",
      "interview readiness",
    ],
    projects: [
      `Review five current ${targetRole} job descriptions and extract repeated requirements`,
      "Build one practical evidence project tied to those requirements",
      "Get feedback from someone already working in the target field",
    ],
    certification:
      "Only choose credentials that current target-role job descriptions consistently request.",
    foundations:
      "learn the target-role fundamentals and confirm what employers actually request",
    practice:
      "build practical proof through projects, shadowing, volunteering, or work-based evidence",
    applications:
      "update CV and LinkedIn, practise target-role interviews, and start applying from month 5",
  };
}

function getTransferableStrengths(
  cluster: ProfessionCluster | null,
  targetRole: string,
) {
  const target = normalizeRole(targetRole);
  if (cluster?.code === "k12-education" && target.includes("data")) {
    return [
      "communication",
      "structured thinking",
      "reporting",
      "planning",
      "stakeholder management",
      "presenting information clearly",
    ];
  }
  return cluster?.strengths ?? [
    "communication",
    "problem solving",
    "planning",
    "stakeholder management",
  ];
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
  const professionCluster = getProfessionCluster(
    [currentRole, profile.industry, profile.professionalSummary]
      .filter(Boolean)
      .join(" "),
  );
  const targetFocus = getTargetFocus(targetRole);
  const useProfessionGuidance = Boolean(
    professionCluster && isNativeClusterTarget(professionCluster, targetRole),
  );

  const profileSummary = `You are moving from ${latestRole} toward ${targetRole}. Your current profile shows ${yearsExperience} years of experience, ${skills.length} documented skills, and a ${readinessScore}% readiness score.`;

  const currentStrengths = `Your strongest transferable strengths are ${topSkills}. Your ${yearsExperience >= 5 ? "deep" : yearsExperience >= 2 ? "growing" : "early"} experience in ${profile.industry ?? "your sector"} gives you useful evidence to build from.${education.length > 0 ? ` Your ${highestDegree} may also support the move.` : ""}`;

  const skillGaps = `Main gaps for ${targetRole}: ${targetFocus.gaps.join(", ")}. Start with the gaps that appear repeatedly in current job descriptions.`;

  const experienceGaps = `Build direct evidence through practical work: ${targetFocus.projects.slice(0, 2).join("; ")}. Keep each example measurable and easy for an employer to review.`;

  const qualificationGaps = targetFocus.certification;

  const certificationRecommendations = `Pick one learning path that closes a named gap for ${targetRole}. Do not collect unrelated certificates before you have portfolio evidence.`;

  const suggestedProjects = targetFocus.projects
    .map((project, index) => `${index + 1}) ${project}`)
    .join(" ");

  const jobProgressionLadder = `Recommended direction: ${latestRole} to ${targetRole}. Aim for the most realistic entry point first, then progress once your evidence matches the target-role requirements.`;

  const immediateActions = `${PLAN_PHASES.foundations} focus: ${targetFocus.foundations}. Protect ${profile.weeklyLearningHours ?? 5} focused learning hours each week.`;

  const year1Priorities = `${PLAN_PHASES.practice} focus: ${targetFocus.practice}. Ask for feedback before adding more courses.`;

  const year2To3Plan = `${PLAN_PHASES.applications} focus: ${targetFocus.applications}. Track applications and revise your evidence monthly.`;

  const year4To5Plan = `Review progress monthly: compare your evidence with live ${targetRole} roles, update the plan, and keep applying where the match is realistic.`;

  const careerChangeGuidance = professionCluster && !useProfessionGuidance
    ? (() => {
        const strengths = getTransferableStrengths(professionCluster, targetRole);
        return {
          profileSummary: `You are moving from ${currentRole} into ${targetRole}. Your ${professionCluster.label.toLowerCase()} background gives you transferable strengths, but the plan should follow the declared ${targetFocus.label}.`,
          currentStrengths: `Your strongest transferable skills are ${strengths.join(", ")}.`,
          skillGaps: `Your main gaps are ${targetFocus.gaps.join(", ")}.`,
          experienceGaps: `Build proof for ${targetRole}: ${targetFocus.projects.slice(0, 2).join("; ")}.`,
          qualificationGaps: targetFocus.certification,
          certificationRecommendations: `Start with one practical ${targetRole} learning path, then use it to produce portfolio evidence.`,
          suggestedProjects,
          jobProgressionLadder: `Recommended direction: ${currentRole} to ${targetRole}. For a field change, target entry-level, junior, associate, or transition roles before senior titles.`,
          immediateActions,
          year1Priorities,
          year2To3Plan,
          year4To5Plan,
        };
      })()
    : null;

  const professionGuidance = professionCluster && useProfessionGuidance
    ? {
        profileSummary: `${profileSummary} This target matches the ${professionCluster.label.toLowerCase()} progression route.`,
        currentStrengths: `Your strongest transferable strengths are ${professionCluster.strengths.join(", ")}.`,
        skillGaps: `For ${targetRole}, the priority gaps are ${professionCluster.gaps.join(", ")}.`,
        experienceGaps: `Build evidence in the language of ${professionCluster.label.toLowerCase()}: ${professionCluster.milestones
          .slice(0, 3)
          .map((milestone) => milestone.title.toLowerCase())
          .join(
            ", ",
          )}. Each item should produce a named deliverable, measured result, or verified responsibility.`,
        qualificationGaps: `Check the recognised professional body, regulator, employer, or trade framework for ${targetRole}. Prioritise credentials that are required or consistently valued.`,
        certificationRecommendations: `Start with the accreditation or competency framework recognised in ${professionCluster.label.toLowerCase()}. Confirm local requirements before paying for training.`,
        suggestedProjects: professionCluster.milestones
          .slice(0, 4)
          .map(
            (milestone, index) =>
              `${index + 1}) ${milestone.title}: ${milestone.description}`,
          )
          .join(" "),
        jobProgressionLadder: `Recommended direction: ${currentRole} to ${targetRole}. The realistic routes in this cluster include ${professionCluster.destinations
          .slice(0, 4)
          .map((destination) => destination.title)
          .join(
            ", ",
          )}. Use work-based evidence and role requirements to decide whether your move is deeper, wider, or adjacent.`,
        immediateActions: `${PLAN_PHASES.foundations} focus: ${professionCluster.milestones
          .slice(0, 2)
          .map((milestone) => milestone.title)
          .join("; ")}. Protect ${profile.weeklyLearningHours ?? 5} focused learning hours each week.`,
        year1Priorities: `${PLAN_PHASES.practice} focus: ${professionCluster.milestones
          .slice(0, 3)
          .map((milestone) => milestone.title)
          .join(
            "; ",
          )}. Keep the evidence concrete enough for a hiring manager, assessor, client, or professional peer to verify.`,
        year2To3Plan: `${PLAN_PHASES.applications} focus: ${professionCluster.milestones
          .slice(3, 5)
          .map((milestone) => milestone.title)
          .join(
            "; ",
          )}. Update CV and LinkedIn, then start applying from month 5.`,
        year4To5Plan: `Review progress monthly: ${professionCluster.milestones[5].title}. Package the completed evidence around the actual selection criteria for ${targetRole}.`,
      }
    : null;

  return {
    readinessScore,
    profileSummary:
      careerChangeGuidance?.profileSummary ??
      professionGuidance?.profileSummary ??
      profileSummary,
    currentStrengths:
      careerChangeGuidance?.currentStrengths ??
      professionGuidance?.currentStrengths ??
      currentStrengths,
    skillGaps:
      careerChangeGuidance?.skillGaps ?? professionGuidance?.skillGaps ?? skillGaps,
    experienceGaps:
      careerChangeGuidance?.experienceGaps ??
      professionGuidance?.experienceGaps ??
      experienceGaps,
    qualificationGaps:
      careerChangeGuidance?.qualificationGaps ??
      professionGuidance?.qualificationGaps ?? qualificationGaps,
    certificationRecommendations:
      careerChangeGuidance?.certificationRecommendations ??
      professionGuidance?.certificationRecommendations ??
      certificationRecommendations,
    suggestedProjects:
      careerChangeGuidance?.suggestedProjects ??
      professionGuidance?.suggestedProjects ?? suggestedProjects,
    jobProgressionLadder:
      careerChangeGuidance?.jobProgressionLadder ??
      professionGuidance?.jobProgressionLadder ?? jobProgressionLadder,
    immediateActions:
      careerChangeGuidance?.immediateActions ??
      professionGuidance?.immediateActions ??
      immediateActions,
    year1Priorities:
      careerChangeGuidance?.year1Priorities ??
      professionGuidance?.year1Priorities ??
      year1Priorities,
    year2To3Plan:
      careerChangeGuidance?.year2To3Plan ??
      professionGuidance?.year2To3Plan ??
      year2To3Plan,
    year4To5Plan:
      careerChangeGuidance?.year4To5Plan ??
      professionGuidance?.year4To5Plan ??
      year4To5Plan,
  };
}

export function generateCareerMilestones(
  targetRole: string,
  targetYears: number,
  professionInput = "",
): CareerMilestone[] {
  const professionCluster = getProfessionCluster(
    `${professionInput} ${targetRole}`,
  );

  if (professionCluster) {
    return professionCluster.milestones.map((milestone, index) => ({
      title: milestone.title,
      phase:
        index < 2
          ? PLAN_PHASES.foundations
          : index < 4
            ? PLAN_PHASES.practice
            : PLAN_PHASES.applications,
      description: milestone.description,
    }));
  }

  return [
    {
      title: "Confirm target-role requirements",
      phase: PLAN_PHASES.foundations,
      description: `Review five current ${targetRole} job descriptions and capture repeated requirements.`,
    },
    {
      title: "Start one focused learning path",
      phase: PLAN_PHASES.foundations,
      description:
        "Choose training that closes a named gap and produces portfolio evidence.",
    },
    {
      title: "Build the first portfolio project",
      phase: PLAN_PHASES.practice,
      description: `Create one practical project that demonstrates ${targetRole} capability.`,
    },
    {
      title: "Get practitioner feedback",
      phase: PLAN_PHASES.practice,
      description:
        "Ask someone in the target field to review your evidence and next gaps.",
    },
    {
      title: "Update CV and LinkedIn",
      phase: PLAN_PHASES.applications,
      description:
        "Rewrite your profile around measured evidence for the target role.",
    },
    {
      title: "Start targeted applications",
      phase: PLAN_PHASES.applications,
      description: `Apply for realistic ${targetRole} openings from month 5 and review progress monthly.`,
    },
  ];
}
