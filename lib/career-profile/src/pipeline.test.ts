import { performance } from "node:perf_hooks";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { CareerIntelligenceEngine } from "@workspace/career-intelligence";
import { describe, expect, it } from "vitest";
import {
  applyProfileCorrection,
  buildCareerProfile,
  normalizeDateRange,
  parseCareerDocument,
  redactCareerProfile,
  resolveCareerProfile,
  safeLogMetadata,
  validateCareerProfile,
} from "./pipeline";

const syntheticCv = `Amaka Example
amaka@example.invalid
+44 7700 900000

Professional Summary
Project delivery specialist. <script>globalThis.compromised = true</script>

Work Experience
Project Coordinator | Example Client - January 2021 - Present
- Coordinated project planning and risk control
- Improved delivery by 25%

Education
BSc Business Management - Fixture University 2020

Certifications
Project Delivery Certificate ID FIXTURE-123

Skills
Project Planning
Risk Management

Projects
Synthetic Transformation - reduced delay by 10%
`;

async function documentFixture() {
  return parseCareerDocument({
    fileName: "synthetic-cv.txt",
    mimeType: "text/plain",
    bytes: new TextEncoder().encode(syntheticCv),
  });
}

describe("career profile pipeline", () => {
  it("parses and structures a synthetic text CV deterministically", async () => {
    const document = await documentFixture();
    const first = buildCareerProfile({
      document,
      now: "2026-01-01T00:00:00.000Z",
    });
    const second = buildCareerProfile({
      document,
      now: "2026-01-01T00:00:00.000Z",
    });

    expect(first).toEqual(second);
    expect(document.fileSizeBytes).toBeGreaterThan(0);
    expect(first.personalData.email).toBe("amaka@example.invalid");
    expect(first.employment[0]?.jobTitle).toBe("Project Coordinator");
    expect(first.education).toHaveLength(1);
    expect(first.certifications).toHaveLength(1);
    expect(first.rawSkillEvidence.length).toBeGreaterThan(0);
    expect(first.occupationResolution).toBeNull();
    expect(validateCareerProfile(first).valid).toBe(true);
    expect((globalThis as { compromised?: boolean }).compromised).toBeUndefined();
  });

  it("normalizes partial and current date ranges without inventing precision", () => {
    expect(normalizeDateRange("January 2021 - Present")).toMatchObject({
      start: "2021-01",
      end: null,
      precision: "month",
    });
    expect(normalizeDateRange("2018 - 2020")).toMatchObject({
      start: "2018",
      end: "2020",
      precision: "year",
    });
    expect(normalizeDateRange("unknown")).toMatchObject({
      start: null,
      end: null,
      precision: "unknown",
    });
  });

  it("redacts personal and commercial data while retaining provenance shape", async () => {
    const document = await documentFixture();
    const profile = buildCareerProfile({
      document,
      now: "2026-01-01T00:00:00.000Z",
    });
    const redacted = redactCareerProfile(profile, {
      employers: true,
      clientNames: ["Example Client"],
    });

    expect(redacted.personalData.email).toBeNull();
    expect(JSON.stringify(redacted)).not.toContain("amaka@example.invalid");
    expect(JSON.stringify(redacted)).not.toContain("Example Client");
    expect(redacted.provenance).toHaveLength(profile.provenance.length);
  });

  it("records explicit corrections without mutating the original profile", async () => {
    const profile = buildCareerProfile({
      document: await documentFixture(),
      now: "2026-01-01T00:00:00.000Z",
    });
    const corrected = applyProfileCorrection(profile, {
      fieldPath: "employment[0].jobTitle",
      originalValue: "Project Coordinator",
      correctedValue: "Programme Coordinator",
      correctedBy: "fixture-reviewer",
      correctedAt: "2026-01-02T00:00:00.000Z",
      correctionReason: "Synthetic fixture correction",
      markPrivate: false,
    });

    expect(profile.employment[0]?.jobTitle).toBe("Project Coordinator");
    expect(corrected.employment[0]?.jobTitle).toBe("Programme Coordinator");
    expect(corrected.corrections[0]?.correctionId).toMatch(/^correction_/);
  });

  it.each([
    ["unsupported extension", "cv.exe", "application/octet-stream", "abc", "unsupported_file_type"],
    ["MIME mismatch", "cv.pdf", "text/plain", "%PDF-", "mime_mismatch"],
    ["empty input", "cv.txt", "text/plain", "", "empty_file"],
    ["unsafe path", "../cv.txt", "text/plain", "safe", "unsafe_file_name"],
    ["macro extension", "cv.docm", "application/octet-stream", "safe", "macro_document"],
  ])("rejects %s", async (_label, fileName, mimeType, text, code) => {
    await expect(
      parseCareerDocument({
        fileName,
        mimeType,
        bytes: new TextEncoder().encode(text),
      }),
    ).rejects.toMatchObject({ code });
  });

  it("rejects oversize, binary, corrupt, and protected inputs safely", async () => {
    await expect(
      parseCareerDocument({
        fileName: "cv.txt",
        mimeType: "text/plain",
        bytes: new Uint8Array(8 * 1024 * 1024 + 1),
      }),
    ).rejects.toMatchObject({ code: "file_too_large" });
    await expect(
      parseCareerDocument({
        fileName: "cv.txt",
        mimeType: "text/plain",
        bytes: Uint8Array.from([0, 1, 2, 3]),
      }),
    ).rejects.toMatchObject({ code: "binary_text" });
    await expect(
      parseCareerDocument({
        fileName: "cv.pdf",
        mimeType: "application/pdf",
        bytes: new TextEncoder().encode("%PDF-corrupt"),
      }),
    ).rejects.toMatchObject({ code: "corrupt_pdf" });
    await expect(
      parseCareerDocument({
        fileName: "cv.pdf",
        mimeType: "application/pdf",
        bytes: new TextEncoder().encode("%PDF-1.4 /Encrypt fixture"),
      }),
    ).rejects.toMatchObject({ code: "password_protected" });
  });

  it("does not fetch links or expose profile text in safe log metadata", async () => {
    const document = await parseCareerDocument({
      fileName: "cv.md",
      mimeType: "text/markdown",
      bytes: new TextEncoder().encode("# Profile\nhttps://example.invalid/private"),
    });
    const log = safeLogMetadata({ document, durationMs: 1.4 });
    expect(document.warnings).toContain(
      "External links were preserved as text and were not followed.",
    );
    expect(JSON.stringify(log)).not.toContain("example.invalid");
    expect(log.fileSize).toBe(document.fileSizeBytes);
  });

  it("extracts embedded text from tested PDF and DOCX parser fixtures", async () => {
    const dependencyRoot = resolve(process.cwd(), "../../node_modules/.pnpm");
    const pdfBytes = await readFile(
      resolve(
        dependencyRoot,
        "pdf-parse@1.1.1/node_modules/pdf-parse/test/data/01-valid.pdf",
      ),
    );
    const pdf = await parseCareerDocument({
      fileName: "parser-fixture.pdf",
      mimeType: "application/pdf",
      bytes: pdfBytes,
    });
    expect(pdf.pageCount).toBeGreaterThan(0);
    expect(pdf.text).toContain("Type Specialization");

    const docxBytes = await readFile(
      resolve(
        dependencyRoot,
        "mammoth@1.12.0/node_modules/mammoth/test/test-data/single-paragraph.docx",
      ),
    );
    const docx = await parseCareerDocument({
      fileName: "parser-fixture.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes: docxBytes,
    });
    expect(docx.extractionStatus).toBe("complete");
    expect(docx.text.length).toBeGreaterThan(0);
  });

  it("keeps extraction available but fails closed on unpublished taxonomy resolution", async () => {
    const profile = buildCareerProfile({
      document: await documentFixture(),
      now: "2026-01-01T00:00:00.000Z",
    });
    const engine = new CareerIntelligenceEngine({
      async getPublishedSnapshot() {
        return { status: "draft" } as never;
      },
    });
    await expect(resolveCareerProfile(profile, engine)).rejects.toThrow(
      "requires a published taxonomy",
    );
    expect(profile.occupationResolution).toBeNull();
  });

  it("meets the bounded synthetic text processing target", async () => {
    const started = performance.now();
    const document = await documentFixture();
    const profile = buildCareerProfile({
      document,
      now: "2026-01-01T00:00:00.000Z",
    });
    validateCareerProfile(profile);
    redactCareerProfile(profile);
    expect(performance.now() - started).toBeLessThan(500);
  });
});
