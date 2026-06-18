import { describe, expect, it } from "vitest";
import { fileToBase64, MAX_CV_BYTES, validateCvFile } from "./cv-file";

describe("CV file handling", () => {
  it("accepts supported MIME types", () => {
    const file = new File(["career"], "resume.pdf", { type: "application/pdf" });
    expect(validateCvFile(file)).toBe("application/pdf");
  });

  it("infers the MIME type when a browser omits it", () => {
    const file = new File(["career"], "resume.DOCX");
    expect(validateCvFile(file)).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  });

  it("rejects unsupported file formats", () => {
    const file = new File(["career"], "resume.pages", { type: "application/octet-stream" });
    expect(() => validateCvFile(file)).toThrow("PDF, DOCX, or TXT");
  });

  it("rejects empty and oversized files", () => {
    expect(() => validateCvFile(new File([], "resume.txt", { type: "text/plain" }))).toThrow("between 1 byte and 5 MB");
    const oversized = new File([new Uint8Array(MAX_CV_BYTES + 1)], "resume.txt", { type: "text/plain" });
    expect(() => validateCvFile(oversized)).toThrow("between 1 byte and 5 MB");
  });

  it("encodes a CV for JSON transport", async () => {
    const file = new File(["Data analyst"], "resume.txt", { type: "text/plain" });
    expect(await fileToBase64(file)).toBe("RGF0YSBhbmFseXN0");
  });
});
