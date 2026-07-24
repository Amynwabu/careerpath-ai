import { describe, expect, it } from "vitest";
import { areEquivalentSkills, normaliseSkill } from "./skill-normaliser";
import { normaliseForMatch } from "./text-normaliser";
import { normaliseTitle } from "./title-normaliser";

describe("taxonomy normalisation", () => {
  it("normalises title abbreviations without losing sector context", () => {
    const title = normaliseTitle("Sr. PM - Power Transmission");

    expect(title.normalised).toContain("senior project manager");
    expect(title.sector).toBe("Energy and Utilities");
    expect(title.specialism).toBe("Power Transmission");
  });

  it("makes British and American spelling comparable", () => {
    expect(normaliseForMatch("Programme organisation behaviour")).toBe(
      normaliseForMatch("Program organization behavior"),
    );
  });

  it("does not merge tool skills with broader capabilities", () => {
    expect(areEquivalentSkills("P6", "Oracle Primavera")).toBe(true);
    expect(areEquivalentSkills("Project planning", "Primavera P6")).toBe(false);
    expect(normaliseSkill("Primavera P6").skillCategory).toBe("tool");
    expect(normaliseSkill("Project planning").skillCategory).toBe(
      "project_delivery",
    );
  });
});
