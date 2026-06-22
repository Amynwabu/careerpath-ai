import { describe, expect, it } from "vitest";
import { getCareerPathOutcome } from "./career-path-outcome";

describe("career path refresh outcome", () => {
  it("reports a remap when updated evidence selects a different target", () => {
    const outcome = getCareerPathOutcome(
      "Head of Department / Curriculum Leader",
      "Education Programme Manager",
    );

    expect(outcome.status).toBe("changed");
    expect(outcome.previousTargetRole).toBe(
      "Head of Department / Curriculum Leader",
    );
    expect(outcome.message).toContain("updated evidence");
  });

  it("confirms the existing path without treating casing as a change", () => {
    const outcome = getCareerPathOutcome(
      "Head of Department / Curriculum Leader",
      "head of department / curriculum leader",
    );

    expect(outcome.status).toBe("confirmed");
  });

  it("reports a newly created path for first-time analysis", () => {
    expect(
      getCareerPathOutcome(null, "Head of Department / Curriculum Leader").status,
    ).toBe("created");
  });
});
