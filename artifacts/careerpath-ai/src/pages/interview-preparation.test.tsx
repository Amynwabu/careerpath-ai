import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("interview preparation browser journey", () => {
  const source = readFileSync(
    join(process.cwd(), "src/pages/interview-preparation.tsx"),
    "utf8",
  );

  it("contains all seven required preparation steps", () => {
    for (const title of [
      "1. Interview overview", "2. Competency map", "3. Question plan",
      "4. Build STAR responses", "5. Practice", "6. Review feedback",
      "7. Interview readiness",
    ]) expect(source).toContain(title);
  });

  it("contains accessible STAR fields and non-colour feedback language", () => {
    expect(source).toContain('aria-label={`${field} response`}');
    expect(source).toContain("not colour alone");
  });

  it("states biometric and advisor boundaries", () => {
    expect(source).toContain("No voice, video, emotion, accent or biometric analysis");
    expect(source).toContain("genuine persistent scoped grant");
  });

  it("resumes persistent sessions and response histories", () => {
    expect(source).toContain('"/interview-intelligence/sessions"');
    expect(source).toContain("responses");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("sessionStorage");
  });
});
