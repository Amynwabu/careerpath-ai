import { describe, expect, it } from "vitest";
import { generateCareerAnalysis } from "./career-analysis";

describe("analysis generation", () => {
  it("respects an explicit teacher to data analyst career change", () => {
    const analysis = generateCareerAnalysis({
      profile: {
        currentRole: "Secondary school teacher",
        industry: "Education",
        professionalSummary:
          "Secondary school teacher who plans lessons, reports pupil progress, presents findings to leaders, and wants to move into data analysis.",
        yearsExperience: 7,
        weeklyLearningHours: 6,
      },
      targetRole: "Data Analyst",
      targetYears: 1,
      skills: [
        { name: "Communication" },
        { name: "Presentation" },
        { name: "Planning" },
      ],
      workExperiences: [
        { company: "Local secondary school", title: "Secondary school teacher" },
      ],
      education: [{ degree: "PGCE" }],
      certifications: [],
    });

    expect(analysis.profileSummary).toContain("Data Analyst");
    expect(analysis.currentStrengths).toContain("structured thinking");
    expect(analysis.skillGaps).toContain("SQL");
    expect(analysis.jobProgressionLadder).not.toContain(
      "Head of Department / Curriculum Leader",
    );
    expect(analysis.year2To3Plan).toContain("month 5");
  });
});
