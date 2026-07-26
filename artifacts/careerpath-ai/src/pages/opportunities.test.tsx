import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("opportunity browser experience", () => {
  const source = readFileSync(
    join(process.cwd(), "src/pages/opportunities.tsx"),
    "utf8",
  );

  it("contains protected-workspace matching, filtering and explanation surfaces", () => {
    expect(source).toContain("Recommended jobs");
    expect(source).toContain("Filter and search");
    expect(source).toContain("Why this job?");
    expect(source).toContain("Missing skills and requirements");
    expect(source).toContain("Advisor workflow");
  });

  it("does not render raw CV or private advisor notes", () => {
    expect(source).not.toContain("profile.raw");
    expect(source).not.toContain("rawCv");
    expect(source).not.toContain("advisorNotes.map");
  });

  it("loads matches and saved opportunities from persistent APIs", () => {
    expect(source).toContain('apiRequest<{ items: Opportunity[] }>("/job-matches")');
    expect(source).toContain('apiRequest("/saved-opportunities")');
    expect(source).toContain("DELETE");
    expect(source).not.toContain("const [saved, setSaved]");
  });
});
