import { describe, expect, it } from "vitest";
import {
  CareerIntelligenceEngine,
  type PublishedTaxonomySnapshot,
} from "@workspace/career-intelligence";
import type { CareerProfile } from "@workspace/career-profile";
import {
  calculateEmployability,
  filterVacancies,
  normalizeVacancy,
  rankOpportunities,
  validateRawVacancy,
} from "./engine";

const taxonomy: PublishedTaxonomySnapshot = {
  version: "2026.1",
  status: "published_local",
  checksum: "fixture-only",
  occupations: [{
    code: "OCC-PM",
    title: "Project Manager",
    family: "Project and programme management",
    level: "senior",
    description: "Plans and delivers projects.",
    aliases: [{ value: "Senior Project Manager", exactMatchAllowed: true }],
    requirements: [],
  }],
  skills: [
    { code: "SK-PLAN", name: "Project planning", aliases: ["delivery planning"], category: "delivery", description: "" },
    { code: "SK-RISK", name: "Risk management", aliases: [], category: "governance", description: "" },
  ],
  transitions: [],
  learningResources: [],
};
const resolver = new CareerIntelligenceEngine({
  async getPublishedSnapshot() {
    return taxonomy;
  },
});

const raw = {
  source: "manual" as const,
  sourceReference: "fixture-1",
  title: "Senior Project Manager",
  description: "Requires 5 years of project planning and risk management.",
  location: "London",
  remoteType: "hybrid",
  employmentType: "permanent",
  salaryMin: 500,
  salaryMax: 600,
  salaryPeriod: "daily" as const,
  currency: "gbp",
  postedDate: "2026-07-20",
  requiredSkills: ["Project planning", "Risk management"],
  preferredSkills: ["Stakeholder diplomacy"],
  qualifications: ["Degree"],
};

const profile = {
  resolvedSkills: [{
    skillCode: "SK-PLAN",
    canonicalName: "Project planning",
    category: "delivery",
    confidence: 0.98,
    sourceText: "Project planning",
    extractionType: "explicit",
    evidence: ["CV employment item 1"],
  }],
  employment: [{ durationMonths: 72 }],
  education: [{ qualification: "BSc Degree" }],
  certifications: [],
} as unknown as CareerProfile;

describe("vacancy validation and normalization", () => {
  it("returns structured duplicate and salary errors", () => {
    const result = validateRawVacancy(
      { ...raw, salaryMin: 700, salaryMax: 600 },
      new Set(["manual:fixture-1"]),
    );
    expect(result.valid).toBe(false);
    expect(result.issues.map((item) => item.code)).toEqual(
      expect.arrayContaining(["duplicate", "salary_range"]),
    );
  });

  it("uses only published occupation and skills and preserves unresolved terms", async () => {
    const vacancy = await normalizeVacancy(raw, {
      taxonomy,
      resolver,
      now: new Date("2026-07-25T00:00:00Z"),
    });
    expect(vacancy.occupationCode).toBe("OCC-PM");
    expect(vacancy.requiredSkills).toEqual(["SK-PLAN", "SK-RISK"]);
    expect(vacancy.unresolvedPreferredSkills).toEqual(["Stakeholder diplomacy"]);
    expect(vacancy.salaryMin).toBe(130000);
    expect(vacancy.original.description).toBe(raw.description);
  });

  it("fails closed for an unpublished taxonomy", async () => {
    await expect(normalizeVacancy(raw, {
      taxonomy: { ...taxonomy, status: "unpublished_candidate" as never },
      resolver,
    })).rejects.toMatchObject({ code: "taxonomy_unavailable" });
  });
});

describe("matching, filtering and ranking", () => {
  it("produces deterministic evidence-linked scores and gaps", async () => {
    const vacancy = await normalizeVacancy(raw, { taxonomy, resolver });
    const result = calculateEmployability({
      profile,
      vacancy,
      preferences: {
        desiredOccupationCode: "OCC-PM",
        location: "London",
        remoteTypes: ["Hybrid"],
        salaryMin: 100000,
      },
    });
    expect(result.overallScore).toBeGreaterThanOrEqual(70);
    expect(result.strengths[0]?.evidence).toContain("CV employment item 1");
    expect(result.gaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "critical_skill", requirement: "SK-RISK" }),
      expect.objectContaining({ kind: "evidence", requirement: "Stakeholder diplomacy" }),
    ]));
    expect(result.disclaimer).toContain("not a hiring prediction");
  });

  it("filters and ranks with stable tie-breaking", async () => {
    const vacancy = await normalizeVacancy(raw, { taxonomy, resolver });
    expect(filterVacancies([vacancy], {
      minimumSalary: 120000,
      remoteTypes: ["Hybrid"],
      location: "London",
    })).toHaveLength(1);
    const match = calculateEmployability({ profile, vacancy });
    const ranked = rankOpportunities([
      { vacancy: { ...vacancy, jobId: "job-b" }, match: { ...match, jobId: "job-b" } },
      { vacancy: { ...vacancy, jobId: "job-a" }, match: { ...match, jobId: "job-a" } },
    ], new Date("2026-07-25"));
    expect(ranked.map((item) => item.vacancy.jobId)).toEqual(["job-a", "job-b"]);
  });

  it("normalizes and ranks 1000 jobs inside the target on representative fixtures", async () => {
    const vacancy = await normalizeVacancy(raw, { taxonomy, resolver });
    const match = calculateEmployability({ profile, vacancy });
    const start = performance.now();
    const ranked = rankOpportunities(
      Array.from({ length: 1000 }, (_, index) => ({
        vacancy: { ...vacancy, jobId: `job-${index.toString().padStart(4, "0")}` },
        match: { ...match, jobId: `job-${index.toString().padStart(4, "0")}` },
      })),
      new Date("2026-07-25"),
    );
    expect(ranked).toHaveLength(1000);
    expect(performance.now() - start).toBeLessThan(750);
  });
});
