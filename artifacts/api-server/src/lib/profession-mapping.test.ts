import { describe, expect, it } from "vitest";
import {
  buildProfessionJourneyStages,
  classifyProfession,
  getCareerDirectionMapping,
  getTrainingStageRanges,
} from "./profession-mapping";

describe("profession mapping", () => {
  it.each([
    ["I am a head chef running a busy restaurant kitchen", "food-hospitality"],
    [
      "I teach science in a secondary school and design curriculum",
      "k12-education",
    ],
    [
      "I am a registered nurse leading shifts on a hospital ward",
      "healthcare-nursing",
    ],
    [
      "I am an automotive technician doing vehicle diagnostics",
      "skilled-trades-automotive",
    ],
    [
      "I am a civil engineer responsible for structural design",
      "civil-structural-engineering",
    ],
    [
      "I own a fashion boutique and manage merchandising",
      "fashion-apparel-retail",
    ],
    ["I am a content creator growing a YouTube audience", "creator-economy"],
  ])("classifies %s", (description, expectedCode) => {
    expect(classifyProfession(description)?.cluster.code).toBe(expectedCode);
  });

  it("returns profession-native destinations instead of a tech fallback", () => {
    const mapping = getCareerDirectionMapping(
      "Head chef managing food cost, staff and restaurant suppliers",
    );

    expect(mapping.classification?.code).toBe("food-hospitality");
    expect(mapping.options.map((option) => option.title)).toContain(
      "Multi-unit Operations Manager",
    );
    expect(mapping.options.map((option) => option.title)).not.toContain(
      "Software Engineer",
    );
  });

  it("ranks destination roles using the latest responsibility evidence", () => {
    const mapping = getCareerDirectionMapping(
      "I am a teacher coordinating a cross-staff education programme, managing partners, delivery plans and impact reporting",
    );

    expect(mapping.classification?.code).toBe("k12-education");
    expect(mapping.options[0]?.title).toBe("Education Programme Manager");
  });

  it("keeps curriculum leadership first when curriculum evidence is strongest", () => {
    const mapping = getCareerDirectionMapping(
      "I am a teacher leading curriculum strategy, assessment moderation, teacher coaching and pupil outcome analysis",
    );

    expect(mapping.options[0]?.title).toBe(
      "Head of Department / Curriculum Leader",
    );
  });

  it("asks for clarification when the evidence has no profession signal", () => {
    const mapping = getCareerDirectionMapping(
      "I enjoy making things better and working with people",
    );

    expect(mapping.needsClarification).toBe(true);
    expect(mapping.options).toEqual([]);
  });

  it("keeps explicit technology profiles on the existing technology route", () => {
    const mapping = getCareerDirectionMapping(
      "Software developer building React APIs with JavaScript",
    );

    expect(mapping.needsClarification).toBe(false);
    expect(mapping.options[0]?.title).toBe("Software Engineer");
  });

  it("builds cluster-specific, checkable journey stages", () => {
    const classification = classifyProfession(
      "Secondary school teacher leading curriculum assessment",
    );
    expect(classification).not.toBeNull();

    const stages = buildProfessionJourneyStages(classification!.cluster, 12);
    const milestoneTitles = stages.flatMap((stage) =>
      stage.checklist.map((item) => item.title),
    );

    expect(stages).toHaveLength(3);
    expect(milestoneTitles).toContain("Lead one curriculum improvement cycle");
    expect(milestoneTitles).not.toContain("Create a public notes repository");
  });

  it("keeps every suggested training route between 3 and 12 months", () => {
    const mapping = getCareerDirectionMapping(
      "Registered nurse pursuing advanced clinical practice on a hospital ward",
    );

    expect(mapping.options.length).toBeGreaterThan(0);
    for (const option of mapping.options) {
      expect(option.durationMonths).toBeGreaterThanOrEqual(3);
      expect(option.durationMonths).toBeLessThanOrEqual(12);
    }
  });

  it("creates valid three-stage ranges for the minimum training duration", () => {
    expect(getTrainingStageRanges(1)).toEqual([
      "Months 1-1",
      "Months 2-2",
      "Months 3-3",
    ]);
  });
});
