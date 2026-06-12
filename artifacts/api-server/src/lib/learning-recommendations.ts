import {
  commonSkills,
  courses,
  type LearningCourse,
} from "@workspace/taxonomy";
import type { LearningCourseSnapshot, LearningRecommendationGroup, RoadmapPhase, StructuredInsight } from "@workspace/db";

type RecommendationParams = {
  skillGaps: StructuredInsight[];
  roadmapPhases: RoadmapPhase[];
  targetRole: string;
  profileSkills: string[];
  totalExperienceMonths?: number | null;
};

const skillLabels = new Map(commonSkills.map((skill) => [skill.code, skill.label]));
const skillCodesByLabel = new Map(commonSkills.map((skill) => [normalize(skill.label), skill.code]));
const courseCatalog = courses as readonly LearningCourse[];

const targetRoleSkillMap: Array<{ pattern: RegExp; skillCodes: string[] }> = [
  { pattern: /ai|machine learning|data scientist|ml/i, skillCodes: ["machine-learning", "python", "data-analysis"] },
  { pattern: /data|analytics|business intelligence|bi/i, skillCodes: ["data-analysis", "sql", "power-bi", "tableau"] },
  { pattern: /software|frontend|backend|full stack|developer|engineer/i, skillCodes: ["javascript", "typescript", "react", "python"] },
  { pattern: /cloud|architect|devops|platform/i, skillCodes: ["aws", "azure", "risk-management"] },
  { pattern: /product/i, skillCodes: ["strategic-planning", "stakeholder-management", "agile", "data-analysis"] },
  { pattern: /project|programme|delivery|scrum/i, skillCodes: ["project-management", "programme-management", "agile", "scrum"] },
  { pattern: /manager|lead|director|head/i, skillCodes: ["leadership", "people-management", "stakeholder-management", "strategic-planning"] },
  { pattern: /finance|commercial/i, skillCodes: ["budgeting", "risk-management", "negotiation"] },
  { pattern: /operations|process|quality/i, skillCodes: ["process-improvement", "project-management", "risk-management"] },
];

const categoryFallbacks: Record<string, string[]> = {
  technical: ["machine-learning", "python", "sql"],
  analytical: ["data-analysis", "sql", "power-bi"],
  leadership: ["leadership", "people-management", "stakeholder-management"],
  management: ["project-management", "agile", "risk-management"],
  communication: ["presentation", "stakeholder-management", "negotiation"],
  business: ["strategic-planning", "budgeting", "stakeholder-management"],
};

export function inferSkillCodesFromTargetRole(targetRole: string): string[] {
  const matches = targetRoleSkillMap.flatMap((entry) => (entry.pattern.test(targetRole) ? entry.skillCodes : []));
  return unique(matches.length > 0 ? matches : ["strategic-planning", "stakeholder-management", "data-analysis"]);
}

export function buildLearningRecommendations(params: RecommendationParams): LearningRecommendationGroup[] {
  const { skillGaps, roadmapPhases, targetRole, profileSkills, totalExperienceMonths } = params;
  const targetSkillCodes = inferSkillCodesFromTargetRole(targetRole);
  const profileSkillCodes = inferSkillCodesFromNames(profileSkills);
  const preferredLevel = preferredCourseLevel(totalExperienceMonths, profileSkillCodes.length);
  const analysisCourseIds = new Set<string>();

  const skillGroups = skillGaps.slice(0, 6).map((gap, index) => {
    const skillCode = inferSkillCodeForGap(gap, targetSkillCodes, index);
    const courseMatches = rankCourses({
      skillCodes: [skillCode, ...relatedSkillCodes(skillCode), ...targetSkillCodes.slice(0, 2)],
      priority: gap.priority,
      preferredLevel,
      maxDurationHours: gap.priority === "High" ? 80 : 40,
      excludeIds: analysisCourseIds,
    }).slice(0, 3);

    courseMatches.forEach((course) => analysisCourseIds.add(course.id));

    return {
      sourceType: "skill-gap" as const,
      sourceId: `skill-gap-${index}`,
      sourceLabel: gap.title,
      priority: gap.priority,
      skillCode,
      skillLabel: skillLabels.get(skillCode) ?? gap.skillLabel ?? gap.title,
      courses: courseMatches,
    };
  }).filter((group) => group.courses.length > 0);

  const phaseGroups = roadmapPhases.map((phase, index) => {
    const phaseSkillCodes = inferSkillCodesForPhase(phase, targetSkillCodes, index);
    const courseMatches = rankCourses({
      skillCodes: phaseSkillCodes,
      priority: index <= 1 ? "High" : "Medium",
      preferredLevel: index <= 1 ? "beginner" : preferredLevel,
      maxDurationHours: index === 0 ? 12 : index === 1 ? 40 : 120,
      excludeIds: new Set<string>(),
    }).slice(0, 5);

    return {
      sourceType: "roadmap-phase" as const,
      sourceId: `roadmap-phase-${index}`,
      sourceLabel: phase.label,
      timeframe: phase.timeframe,
      courses: courseMatches,
    };
  }).filter((group) => group.courses.length > 0);

  return [...skillGroups, ...phaseGroups];
}

function rankCourses(params: {
  skillCodes: string[];
  priority?: "High" | "Medium" | "Low";
  preferredLevel: "beginner" | "intermediate" | "advanced";
  maxDurationHours: number;
  excludeIds: Set<string>;
}): LearningCourseSnapshot[] {
  const providerCounts = new Map<string, number>();
  const requested = unique(params.skillCodes);

  const ranked: LearningCourseSnapshot[] = [];

  for (const course of courseCatalog) {
    if (params.excludeIds.has(course.id)) continue;

      const matchedSkills = course.skills.filter((skill) => requested.includes(skill));
      if (matchedSkills.length === 0) continue;

      const providerCount = providerCounts.get(course.provider) ?? 0;
      const score =
        matchedSkills.length * (params.priority === "High" ? 36 : params.priority === "Medium" ? 28 : 22) +
        (course.level === params.preferredLevel ? 18 : adjacentLevel(course.level, params.preferredLevel) ? 8 : 0) +
        (course.cost === "free" ? 10 : course.cost === "freemium" ? 6 : 0) +
        (course.durationHours <= params.maxDurationHours ? 12 : course.durationHours <= params.maxDurationHours * 1.8 ? 4 : -8) -
        providerCount * 7;

      providerCounts.set(course.provider, providerCount + 1);

      ranked.push({
        ...course,
        matchedSkills,
        matchReason: matchedSkills.map((skill) => skillLabels.get(skill) ?? skill).join(", "),
        score: Math.round(score),
      });
  }

  return ranked.sort((left, right) => right.score - left.score || left.durationHours - right.durationHours);
}

function inferSkillCodeForGap(gap: StructuredInsight, targetSkillCodes: string[], index: number): string {
  if (gap.skillCode && skillLabels.has(gap.skillCode)) return gap.skillCode;

  const text = normalize(`${gap.title} ${gap.detail} ${gap.category ?? ""}`);
  const direct = commonSkills.find((skill) => text.includes(normalize(skill.label)) || text.includes(skill.code));
  if (direct) return direct.code;

  const categoryCodes = gap.category ? categoryFallbacks[normalize(gap.category)] : undefined;
  if (categoryCodes?.length) return categoryCodes[index % categoryCodes.length];

  return targetSkillCodes[index % targetSkillCodes.length] ?? "data-analysis";
}

function inferSkillCodesForPhase(phase: RoadmapPhase, targetSkillCodes: string[], index: number): string[] {
  const text = normalize(`${phase.label} ${phase.focus} ${phase.actions.join(" ")}`);
  const matches = commonSkills.filter((skill) => text.includes(normalize(skill.label)) || text.includes(skill.code)).map((skill) => skill.code);

  if (matches.length > 0) return unique([...matches, ...targetSkillCodes]).slice(0, 5);
  if (index === 0) return unique(["strategic-planning", "stakeholder-management", ...targetSkillCodes]).slice(0, 5);
  if (index === 1) return unique(defined([targetSkillCodes[0], targetSkillCodes[1], "project-management", "data-analysis"]));
  if (index === 2) return unique(defined(["leadership", "stakeholder-management", targetSkillCodes[0], "presentation"]));
  return unique(["presentation", "negotiation", "strategic-planning", ...targetSkillCodes]).slice(0, 5);
}

function relatedSkillCodes(skillCode: string): string[] {
  const course = courseCatalog.find((item) => item.skills.includes(skillCode));
  return course?.skills.filter((skill) => skill !== skillCode) ?? [];
}

function inferSkillCodesFromNames(names: string[]): string[] {
  return names
    .map((name) => skillCodesByLabel.get(normalize(name)) ?? commonSkills.find((skill) => normalize(name).includes(skill.code))?.code)
    .filter((value): value is string => Boolean(value));
}

function preferredCourseLevel(totalExperienceMonths?: number | null, knownSkillCount = 0): "beginner" | "intermediate" | "advanced" {
  const months = totalExperienceMonths ?? 0;
  if (months >= 96 && knownSkillCount >= 8) return "advanced";
  if (months >= 36 || knownSkillCount >= 4) return "intermediate";
  return "beginner";
}

function adjacentLevel(left: LearningCourse["level"], right: LearningCourse["level"]): boolean {
  const order = ["beginner", "intermediate", "advanced"];
  return Math.abs(order.indexOf(left) - order.indexOf(right)) === 1;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values.filter(Boolean))];
}

function defined(values: Array<string | undefined>): string[] {
  return values.filter((value): value is string => Boolean(value));
}
