import { describe, expect, it } from "vitest";
import { sanitizeLogObject } from "./logger";

describe("structured log redaction", () => {
  it("redacts nested credentials, document content and signed URLs", () => {
    const safe = sanitizeLogObject({
      route: "/fixture", nested: {
        password: "private", token: "private", cvText: "private",
        interviewResponse: "private", evidence: "private", signedUrl: "private",
      },
    });
    expect(JSON.stringify(safe)).not.toContain("private");
    expect(safe).toMatchObject({ route: "/fixture", nested: { password: "[REDACTED]" } });
  });
});
