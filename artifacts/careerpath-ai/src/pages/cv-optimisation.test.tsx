import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("CV optimisation browser journey", () => {
  const source = readFileSync(
    join(process.cwd(), "src/pages/cv-optimisation.tsx"),
    "utf8",
  );

  it("contains all six evidence-grounded workflow steps", () => {
    expect(source).toContain("1. Selected vacancy");
    expect(source).toContain("2. Analyse current CV");
    expect(source).toContain("3. Review recommendations");
    expect(source).toContain("4. Generate tailored draft");
    expect(source).toContain("5. Compare versions");
    expect(source).toContain("6. Validate and export");
  });

  it("does not claim unavailable DOCX, PDF or advisor capabilities", () => {
    expect(source).toContain("DOCX and PDF are not");
    expect(source).toContain("requires an active scoped grant");
    expect(source).not.toContain("universally ATS-proof");
  });

  it("provides textual redline status for non-colour accessibility", () => {
    expect(source).toContain("labelled in text, not only by colour");
    expect(source).toContain('aria-label="Version comparison"');
  });

  it("resumes versioned sessions from the persistent API", () => {
    expect(source).toContain('"/cv-optimisation/sessions"');
    expect(source).toContain("recordVersion");
    expect(source).not.toContain("localStorage");
    expect(source).not.toContain("sessionStorage");
  });
});
