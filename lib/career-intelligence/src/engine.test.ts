import { describe, expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { CareerIntelligenceEngine } from "./engine";
import type {
  PublishedTaxonomySnapshot,
  TaxonomyProvider,
} from "./types";

const publishedFixture: PublishedTaxonomySnapshot = {
  version: "fixture-2026.1",
  status: "published_local",
  checksum: "fixture-checksum",
  skills: [
    {
      code: "SKL-PLAN",
      name: "Project Planning",
      aliases: ["Programme Planning"],
      category: "project_delivery",
      description: "Plan delivery work.",
    },
    {
      code: "SKL-RISK",
      name: "Risk Management",
      aliases: ["Risk Control"],
      category: "transferable",
      description: "Manage delivery risk.",
    },
    {
      code: "SKL-LEAD",
      name: "Team Leadership",
      aliases: [],
      category: "leadership",
      description: "Lead teams.",
    },
  ],
  occupations: [
    {
      code: "OCC-COORD",
      title: "Project Coordinator",
      family: "Project and Programme Management",
      level: "practitioner",
      description: "Coordinates project delivery and project planning.",
      aliases: [
        { value: "Project Support Officer", exactMatchAllowed: true },
        {
          value: "Coordinator",
          exactMatchAllowed: false,
          context: "project",
        },
      ],
      requirements: [
        {
          skillCode: "SKL-PLAN",
          requirementType: "essential",
          requiredLevel: 2,
          weight: 1,
          evidence: ["fixture:onet:planning"],
        },
      ],
      minimumExperienceYears: 1,
    },
    {
      code: "OCC-MANAGER",
      title: "Project Manager",
      family: "Project and Programme Management",
      level: "manager",
      description: "Leads projects, teams, plans, and delivery risk.",
      aliases: [
        { value: "Delivery Manager", exactMatchAllowed: false, context: "project" },
      ],
      requirements: [
        {
          skillCode: "SKL-PLAN",
          requirementType: "essential",
          requiredLevel: 3,
          weight: 1,
          evidence: ["fixture:esco:planning"],
        },
        {
          skillCode: "SKL-RISK",
          requirementType: "essential",
          requiredLevel: 3,
          weight: 1,
          evidence: ["fixture:onet:risk"],
        },
        {
          skillCode: "SKL-LEAD",
          requirementType: "important",
          requiredLevel: 2,
          weight: 0.8,
          evidence: ["fixture:onet:leadership"],
        },
      ],
      minimumExperienceYears: 5,
      qualificationCodes: ["QUAL-PM"],
    },
  ],
  transitions: [
    {
      fromOccupationCode: "OCC-COORD",
      toOccupationCode: "OCC-MANAGER",
      type: "promotion",
      difficulty: 3,
      transferability: 0.8,
      estimatedExperience: "3-5 years",
      evidence: ["fixture:approved-transition"],
      reviewStatus: "approved",
    },
  ],
  learningResources: [
    {
      code: "COURSE-RISK",
      title: "Applied Risk Management",
      type: "course",
      skillCodes: ["SKL-RISK"],
      evidence: ["fixture:curated-course-map"],
    },
  ],
};

const provider: TaxonomyProvider = {
  async getPublishedSnapshot() {
    return publishedFixture;
  },
};

describe("CareerIntelligenceEngine", () => {
  const engine = new CareerIntelligenceEngine(provider);

  it("resolves canonical occupations before all fallback stages", async () => {
    const result = await engine.resolveOccupation({
      jobTitle: "Project Manager",
      text: "delivery coordinator",
    });
    expect(result.occupationCode).toBe("OCC-MANAGER");
    expect(result.matchType).toBe("canonical_title");
    expect(result.confidence).toBe(1);
  });

  it("extracts only published canonical skills and aliases", async () => {
    const result = await engine.resolveSkills({
      text: "Experienced in Programme Planning and Risk Management.",
    });
    expect(result.skills.map((skill) => skill.skillCode)).toEqual([
      "SKL-PLAN",
      "SKL-RISK",
    ]);
    expect(result.skills[0]?.extractionType).toBe("alias");
  });

  it("produces explainable reproducible readiness scores", async () => {
    const input = {
      targetOccupationCode: "OCC-MANAGER",
      skills: [{ skillCode: "SKL-PLAN", level: 3 }],
      experienceYears: 4,
      qualificationCodes: [] as string[],
    };
    const first = await engine.readiness(input);
    const second = await engine.readiness(input);
    expect(first).toEqual(second);
    expect(first.explanations[0]).toContain("skills 60%");
    expect(first.overallScore).toBeGreaterThan(0);
    expect(first.overallScore).toBeLessThan(100);
  });

  it("groups gaps, strengths, blockers, and transferable skills", async () => {
    const result = await engine.gapAnalysis({
      targetOccupationCode: "OCC-MANAGER",
      skills: [
        { skillCode: "SKL-PLAN", level: 3 },
        { skillCode: "SKL-LEAD", level: 2 },
      ],
    });
    expect(result.missingSkills.map((skill) => skill.skillCode)).toEqual([
      "SKL-RISK",
    ]);
    expect(result.careerBlockers).toHaveLength(1);
    expect(result.transferableSkills.map((skill) => skill.skillCode)).toEqual([
      "SKL-LEAD",
    ]);
  });

  it("returns only approved published transitions", async () => {
    const result = await engine.transitions({
      currentOccupationCode: "OCC-COORD",
      skills: [{ skillCode: "SKL-PLAN", level: 2 }],
    });
    expect(result.transitions).toHaveLength(1);
    expect(result.transitions[0]?.reviewStatus).toBe("approved");
    expect(result.transitions[0]?.likelySalaryProgression).toBe("not_available");
  });

  it("maps every recommendation to a missing canonical skill", async () => {
    const result = await engine.recommendations({
      targetOccupationCode: "OCC-MANAGER",
      skills: [{ skillCode: "SKL-PLAN", level: 3 }],
    });
    expect(result.recommendations[0]?.mappedMissingSkills).toEqual(["SKL-RISK"]);
    expect(result.recommendations[0]?.reason).toContain("directly maps");
  });

  it("builds structured AI context without raw taxonomy tables", async () => {
    const result = await engine.buildAiContext({
      currentOccupationCode: "OCC-COORD",
      targetOccupationCode: "OCC-MANAGER",
      skills: [{ skillCode: "SKL-PLAN", level: 2 }],
      experienceYears: 2,
    });
    expect(result.context.currentOccupation.code).toBe("OCC-COORD");
    expect(result).not.toHaveProperty("occupations");
    expect(result).not.toHaveProperty("taxonomy");
  });

  it("fails closed for unpublished taxonomy snapshots", async () => {
    const unpublished = new CareerIntelligenceEngine({
      async getPublishedSnapshot() {
        return { ...publishedFixture, status: "draft" as never };
      },
    });
    await expect(
      unpublished.resolveOccupation({ jobTitle: "Project Manager" }),
    ).rejects.toThrow("requires a published taxonomy");
  });

  it("meets foundation performance targets with cached fixtures", async () => {
    await engine.resolveOccupation({ jobTitle: "Project Manager" });
    const started = performance.now();
    for (let index = 0; index < 100; index += 1) {
      await engine.resolveOccupation({ jobTitle: "Project Manager" });
    }
    const averageMilliseconds = (performance.now() - started) / 100;
    expect(averageMilliseconds).toBeLessThan(100);

    const cases = [
      {
        ceiling: 300,
        run: () =>
          engine.resolveSkills({
            text: "Project Planning, Risk Management, and Team Leadership",
          }),
      },
      {
        ceiling: 200,
        run: () =>
          engine.readiness({
            targetOccupationCode: "OCC-MANAGER",
            skills: [{ skillCode: "SKL-PLAN", level: 3 }],
            experienceYears: 3,
          }),
      },
      {
        ceiling: 300,
        run: () =>
          engine.gapAnalysis({
            targetOccupationCode: "OCC-MANAGER",
            skills: [{ skillCode: "SKL-PLAN", level: 3 }],
          }),
      },
      {
        ceiling: 500,
        run: () =>
          engine.recommendations({
            targetOccupationCode: "OCC-MANAGER",
            skills: [{ skillCode: "SKL-PLAN", level: 3 }],
          }),
      },
    ];
    for (const performanceCase of cases) {
      const caseStart = performance.now();
      await performanceCase.run();
      expect(performance.now() - caseStart).toBeLessThan(
        performanceCase.ceiling,
      );
    }
  });
});
