import type {
  IntelligenceOccupation,
  PublishedTaxonomySnapshot,
  ResolvedSkill,
  SkillRequirement,
  TaxonomyProvider,
} from "./types";

export const readinessWeights = {
  skills: 0.6,
  experience: 0.25,
  qualifications: 0.15,
} as const;

export class CareerIntelligenceEngine {
  private snapshots = new Map<string, PublishedTaxonomySnapshot>();

  constructor(private readonly provider: TaxonomyProvider) {}

  async resolveOccupation(input: {
    text?: string;
    jobTitle?: string;
    existingOccupationCode?: string;
    skillCodes?: string[];
    version?: string;
  }) {
    const taxonomy = await this.snapshot(input.version);
    const evidenceText = [input.jobTitle, input.text].filter(Boolean).join(" ");
    if (input.existingOccupationCode) {
      const occupation = taxonomy.occupations.find(
        (item) => item.code === input.existingOccupationCode,
      );
      if (occupation) {
        return occupationResolution(
          occupation,
          1,
          "existing_occupation_code",
          [],
          input.skillCodes ?? [],
          taxonomy.version,
        );
      }
    }

    const title = normalise(input.jobTitle ?? input.text ?? "");
    const canonical = taxonomy.occupations.find(
      (item) => normalise(item.title) === title,
    );
    if (canonical) {
      return occupationResolution(
        canonical,
        1,
        "canonical_title",
        [],
        input.skillCodes ?? [],
        taxonomy.version,
      );
    }

    const curated = taxonomy.occupations.filter((occupation) =>
      occupation.aliases.some(
        (alias) => alias.exactMatchAllowed && normalise(alias.value) === title,
      ),
    );
    if (curated.length === 1) {
      return occupationResolution(
        curated[0]!,
        0.98,
        "curated_alias",
        [input.jobTitle ?? input.text ?? ""],
        input.skillCodes ?? [],
        taxonomy.version,
      );
    }

    const contextual = taxonomy.occupations
      .filter((occupation) =>
        occupation.aliases.some((alias) => normalise(alias.value) === title),
      )
      .map((occupation) => ({
        occupation,
        score: contextualScore(
          occupation,
          evidenceText,
          input.skillCodes ?? [],
        ),
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.occupation.code.localeCompare(right.occupation.code),
      );
    if (
      contextual[0] &&
      contextual[0].score > 0 &&
      contextual[0].score > (contextual[1]?.score ?? -1)
    ) {
      return occupationResolution(
        contextual[0].occupation,
        round(0.75 + Math.min(contextual[0].score, 0.2)),
        "contextual_alias",
        [input.jobTitle ?? input.text ?? ""],
        input.skillCodes ?? [],
        taxonomy.version,
      );
    }

    const inputTokens = tokens(evidenceText);
    const semantic = taxonomy.occupations
      .map((occupation) => ({
        occupation,
        score: tokenSimilarity(
          inputTokens,
          tokens(`${occupation.title} ${occupation.description}`),
        ),
      }))
      .filter((candidate) => candidate.score >= 0.2)
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.occupation.code.localeCompare(right.occupation.code),
      );
    if (
      semantic[0] &&
      semantic[0].score > (semantic[1]?.score ?? 0) + 0.05
    ) {
      return occupationResolution(
        semantic[0].occupation,
        round(Math.min(0.7, 0.45 + semantic[0].score)),
        "semantic_fallback",
        [],
        input.skillCodes ?? [],
        taxonomy.version,
      );
    }
    return {
      version: taxonomy.version,
      occupationCode: null,
      confidence: 0,
      matchType: "unresolved",
      explanations: [
        "No deterministic occupation match met the resolution threshold.",
      ],
      evidence: [],
    };
  }

  async resolveSkills(input: { text: string; version?: string }) {
    const taxonomy = await this.snapshot(input.version);
    const normalisedText = ` ${normalise(input.text)} `;
    const resolved = new Map<string, ResolvedSkill>();
    for (const skill of taxonomy.skills) {
      const canonical = phraseMatch(normalisedText, skill.name);
      const matchedAlias = skill.aliases.find((alias) =>
        phraseMatch(normalisedText, alias),
      );
      if (!canonical && !matchedAlias) continue;
      const sourceText = canonical ? skill.name : matchedAlias!;
      resolved.set(skill.code, {
        skillCode: skill.code,
        canonicalName: skill.name,
        category: skill.category,
        confidence: canonical ? 0.98 : 0.92,
        sourceText,
        extractionType: canonical ? "explicit" : "alias",
        evidence: [
          canonical
            ? `Canonical skill phrase matched: ${sourceText}`
            : `Published skill alias matched: ${sourceText}`,
        ],
      });
    }
    return {
      version: taxonomy.version,
      confidence:
        resolved.size === 0
          ? 0
          : round(
              [...resolved.values()].reduce(
                (sum, item) => sum + item.confidence,
                0,
              ) / resolved.size,
            ),
      skills: [...resolved.values()].sort((left, right) =>
        left.skillCode.localeCompare(right.skillCode),
      ),
      explanations: [
        "Skills are extracted only from published canonical names and aliases.",
        "No LLM or inferred occupation requirements were treated as possessed skills.",
      ],
    };
  }

  async readiness(input: {
    currentOccupationCode?: string;
    targetOccupationCode: string;
    skills: Array<{ skillCode: string; level?: number }>;
    experienceYears?: number;
    qualificationCodes?: string[];
    version?: string;
  }) {
    const taxonomy = await this.snapshot(input.version);
    const target = requiredOccupation(
      taxonomy,
      input.targetOccupationCode,
      "target occupation",
    );
    const skillScore = scoreSkills(target.requirements, input.skills);
    const requiredExperience =
      target.minimumExperienceYears ?? defaultExperience(target.level);
    const experienceScore =
      requiredExperience === 0
        ? 100
        : clamp(
            Math.round(
              ((input.experienceYears ?? 0) / requiredExperience) * 100,
            ),
          );
    const requiredQualifications = target.qualificationCodes ?? [];
    const heldQualifications = new Set(input.qualificationCodes ?? []);
    const qualificationScore =
      requiredQualifications.length === 0
        ? 100
        : Math.round(
            (requiredQualifications.filter((code) =>
              heldQualifications.has(code),
            ).length /
              requiredQualifications.length) *
              100,
          );
    const overallScore = Math.round(
      skillScore.score * readinessWeights.skills +
        experienceScore * readinessWeights.experience +
        qualificationScore * readinessWeights.qualifications,
    );
    return {
      version: taxonomy.version,
      targetOccupationCode: target.code,
      overallScore,
      skillScore: skillScore.score,
      experienceScore,
      qualificationScore,
      confidence: skillScore.coverageConfidence,
      recommendedActions: skillScore.missing
        .slice(0, 5)
        .map((item) => `Develop ${item.skillCode} to level ${item.requiredLevel}.`),
      explanations: [
        "Overall score = skills 60% + experience 25% + qualifications 15%.",
        "Skill weights come from published requirement type and importance, not arbitrary per-user scoring.",
        `Experience is measured against ${requiredExperience} years for the published target level.`,
        requiredQualifications.length === 0
          ? "No published qualification requirements exist; qualification score is neutral at 100."
          : `${requiredQualifications.length} published qualifications are required.`,
      ],
      evidence: [
        ...skillScore.evidence,
        `taxonomy:${taxonomy.version}:${taxonomy.checksum}`,
      ],
    };
  }

  async gapAnalysis(input: {
    targetOccupationCode: string;
    skills: Array<{ skillCode: string; level?: number }>;
    version?: string;
  }) {
    const taxonomy = await this.snapshot(input.version);
    const target = requiredOccupation(
      taxonomy,
      input.targetOccupationCode,
      "target occupation",
    );
    const held = new Map(
      input.skills.map((skill) => [skill.skillCode, skill.level ?? 1]),
    );
    const skillRequirement = (item: SkillRequirement) => {
      const skill = taxonomy.skills.find(
        (candidate) => candidate.code === item.skillCode,
      );
      return {
        ...item,
        canonicalName: skill?.name ?? item.skillCode,
        skillCategory: skill?.category ?? "unknown",
      };
    };
    const strengths = target.requirements
      .filter((item) => (held.get(item.skillCode) ?? 0) >= item.requiredLevel)
      .map(skillRequirement);
    const missing = target.requirements
      .filter((item) => (held.get(item.skillCode) ?? 0) < item.requiredLevel)
      .map(skillRequirement);
    const transferable = strengths.filter((item) => {
      const skill = taxonomy.skills.find(
        (candidate) => candidate.code === item.skillCode,
      );
      return ["transferable", "behavioural", "leadership"].includes(
        skill?.category ?? "",
      );
    });
    return {
      version: taxonomy.version,
      targetOccupationCode: target.code,
      confidence: target.requirements.length ? 0.95 : 0,
      strengths,
      missingSkills: missing,
      transferableSkills: transferable,
      careerBlockers: missing.filter(
        (item) => item.requirementType === "essential",
      ),
      quickWins: missing
        .filter(
          (item) =>
            item.requirementType !== "essential" && item.requiredLevel <= 2,
        )
        .slice(0, 5),
      priorityImprovements: {
        immediate: missing.filter(
          (item) => item.requirementType === "essential",
        ),
        shortTerm: missing.filter(
          (item) =>
            item.requirementType === "important" ||
            item.requirementType === "supporting",
        ),
        longTerm: missing.filter(
          (item) => item.requirementType === "optional",
        ),
      },
      explanations: [
        "Strengths meet or exceed published required levels.",
        "Immediate gaps are published essential requirements.",
        "No skills were introduced through generic profession fallbacks.",
      ],
      evidence: target.requirements.flatMap((item) => item.evidence),
    };
  }

  async transitions(input: {
    currentOccupationCode: string;
    skills: Array<{ skillCode: string; level?: number }>;
    version?: string;
  }) {
    const taxonomy = await this.snapshot(input.version);
    requiredOccupation(
      taxonomy,
      input.currentOccupationCode,
      "current occupation",
    );
    const approved = taxonomy.transitions.filter(
      (item) =>
        item.fromOccupationCode === input.currentOccupationCode &&
        item.reviewStatus === "approved",
    );
    const results = await Promise.all(
      approved.map(async (transition) => {
        const gap = await this.gapAnalysis({
          targetOccupationCode: transition.toOccupationCode,
          skills: input.skills,
          version: taxonomy.version,
        });
        return {
          ...transition,
          missingSkills: gap.missingSkills,
          skillsOverlap: gap.strengths.length,
          likelySalaryProgression: "not_available",
          typicalProgressionPath: [
            transition.fromOccupationCode,
            transition.toOccupationCode,
          ],
          explanations: [
            "Transition is present in the published, approved taxonomy.",
            "Salary progression is not inferred because no approved salary evidence is available.",
          ],
        };
      }),
    );
    return {
      version: taxonomy.version,
      confidence: results.length ? 0.95 : 1,
      transitions: results,
      explanations: [
        results.length
          ? "Only published transitions with approved review status are returned."
          : "No approved published transition supports the requested move.",
      ],
      evidence: results.flatMap((item) => item.evidence),
    };
  }

  async recommendations(input: {
    targetOccupationCode: string;
    skills: Array<{ skillCode: string; level?: number }>;
    version?: string;
  }) {
    const taxonomy = await this.snapshot(input.version);
    const gaps = await this.gapAnalysis(input);
    const missingCodes = new Set(
      gaps.missingSkills.map((item) => item.skillCode),
    );
    const recommendations = taxonomy.learningResources
      .map((resource) => {
        const mappedSkills = resource.skillCodes.filter((code) =>
          missingCodes.has(code),
        );
        return { resource, mappedSkills };
      })
      .filter((item) => item.mappedSkills.length > 0)
      .map(({ resource, mappedSkills }) => ({
        ...resource,
        mappedMissingSkills: mappedSkills,
        reason: `${resource.title} directly maps to ${mappedSkills.length} published missing canonical skill(s).`,
        evidence: resource.evidence,
      }))
      .sort((left, right) => left.code.localeCompare(right.code));
    return {
      version: taxonomy.version,
      confidence: recommendations.length ? 0.9 : 0,
      recommendations,
      unexplainedMissingSkills: [...missingCodes].filter(
        (code) =>
          !recommendations.some((item) =>
            item.mappedMissingSkills.includes(code),
          ),
      ),
      explanations: [
        "Every recommendation maps directly to at least one missing canonical skill.",
        "No generic course or certification fallback is used.",
      ],
      evidence: recommendations.flatMap((item) => item.evidence),
    };
  }

  async buildAiContext(input: {
    currentOccupationCode: string;
    targetOccupationCode: string;
    skills: Array<{ skillCode: string; level?: number }>;
    experienceYears?: number;
    qualificationCodes?: string[];
    version?: string;
  }) {
    const taxonomy = await this.snapshot(input.version);
    const current = requiredOccupation(
      taxonomy,
      input.currentOccupationCode,
      "current occupation",
    );
    const [readiness, gaps, transitions, recommendations] = await Promise.all([
      this.readiness(input),
      this.gapAnalysis(input),
      this.transitions(input),
      this.recommendations(input),
    ]);
    return {
      version: taxonomy.version,
      confidence: Math.min(
        readiness.confidence,
        gaps.confidence,
        transitions.confidence,
      ),
      context: {
        currentOccupation: {
          code: current.code,
          title: current.title,
          careerFamily: current.family,
          currentLevel: current.level,
        },
        targetOccupationCode: input.targetOccupationCode,
        skills: input.skills,
        missingSkills: gaps.missingSkills.map((item) => item.skillCode),
        recommendedTransitions: transitions.transitions.map(
          (item) => item.toOccupationCode,
        ),
        recommendationCodes: recommendations.recommendations.map(
          (item) => item.code,
        ),
        readinessScore: readiness.overallScore,
      },
      explanations: [
        "Context contains structured identifiers and computed outputs only.",
        "Raw taxonomy tables and source archives are excluded.",
      ],
      evidence: readiness.evidence,
    };
  }

  private async snapshot(version?: string) {
    const key = version ?? "latest";
    const cached = this.snapshots.get(key);
    if (cached) return cached;
    const snapshot = await this.provider.getPublishedSnapshot(version);
    if (!["published", "published_local"].includes(snapshot.status)) {
      throw new Error("Career intelligence requires a published taxonomy.");
    }
    this.snapshots.set(key, snapshot);
    return snapshot;
  }
}

function occupationResolution(
  occupation: IntelligenceOccupation,
  confidence: number,
  matchType: string,
  matchedAliases: string[],
  matchedSkills: string[],
  version: string,
) {
  return {
    version,
    occupationCode: occupation.code,
    canonicalTitle: occupation.title,
    careerFamily: occupation.family,
    careerLevel: occupation.level,
    confidence,
    matchType,
    matchedAliases,
    matchedSkills: matchedSkills.filter((code) =>
      occupation.requirements.some((item) => item.skillCode === code),
    ),
    explanations: [
      `Resolved by ${matchType.replaceAll("_", " ")} using published taxonomy precedence.`,
    ],
    evidence: [`occupation:${occupation.code}`, `taxonomy:${version}`],
  };
}

function scoreSkills(
  requirements: SkillRequirement[],
  heldSkills: Array<{ skillCode: string; level?: number }>,
) {
  if (requirements.length === 0) {
    return {
      score: 0,
      coverageConfidence: 0,
      missing: [] as SkillRequirement[],
      evidence: ["No published skill profile exists for the target occupation."],
    };
  }
  const held = new Map(
    heldSkills.map((skill) => [skill.skillCode, skill.level ?? 1]),
  );
  let earned = 0;
  let available = 0;
  const missing: SkillRequirement[] = [];
  for (const requirement of requirements) {
    const typeWeight =
      requirement.requirementType === "essential"
        ? 2
        : requirement.requirementType === "important"
          ? 1.5
          : requirement.requirementType === "supporting"
            ? 1
            : 0.5;
    const weight = typeWeight * requirement.weight;
    available += weight;
    const level = held.get(requirement.skillCode) ?? 0;
    earned += weight * Math.min(1, level / requirement.requiredLevel);
    if (level < requirement.requiredLevel) missing.push(requirement);
  }
  return {
    score: available ? Math.round((earned / available) * 100) : 0,
    coverageConfidence: round(
      Math.min(1, requirements.length / 10) * 0.95,
    ),
    missing,
    evidence: requirements.flatMap((item) => item.evidence),
  };
}

function requiredOccupation(
  taxonomy: PublishedTaxonomySnapshot,
  code: string,
  label: string,
) {
  const occupation = taxonomy.occupations.find((item) => item.code === code);
  if (!occupation) throw new Error(`Published ${label} not found: ${code}`);
  return occupation;
}

function contextualScore(
  occupation: IntelligenceOccupation,
  text: string,
  skillCodes: string[],
) {
  const familyScore = normalise(text).includes(normalise(occupation.family))
    ? 0.1
    : 0;
  const matched = skillCodes.filter((code) =>
    occupation.requirements.some((item) => item.skillCode === code),
  ).length;
  return familyScore + Math.min(0.1, matched * 0.02);
}

function phraseMatch(normalisedText: string, phrase: string) {
  const value = normalise(phrase);
  return value.length >= 2 && normalisedText.includes(` ${value} `);
}

function normalise(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string) {
  return new Set(
    normalise(value)
      .split(" ")
      .filter((token) => token.length >= 3),
  );
}

function tokenSimilarity(left: Set<string>, right: Set<string>) {
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  return intersection / new Set([...left, ...right]).size;
}

function defaultExperience(level: string) {
  const levels: Record<string, number> = {
    entry: 0,
    practitioner: 2,
    specialist: 3,
    senior_practitioner: 5,
    senior_specialist: 6,
    manager: 5,
    senior_manager: 8,
    executive: 10,
  };
  return levels[level] ?? 2;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}
