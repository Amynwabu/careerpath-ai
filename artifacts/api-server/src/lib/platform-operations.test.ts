import { describe, expect, it } from "vitest";
import { assertSafeJobPayload } from "./platform-operations";

describe("durable platform operations", () => {
  it("accepts reference-only job payloads", () => {
    expect(() => assertSafeJobPayload({ documentId: "doc_fixture", ownerId: 1, operation: "scan" })).not.toThrow();
  });
  it("rejects sensitive queue metadata and oversized strings", () => {
    for (const payload of [
      { cvText: "private" }, { interview_response: "private" },
      { accessToken: "private" }, { payload: "x".repeat(513) },
    ]) expect(() => assertSafeJobPayload(payload)).toThrow("unsafe_job_payload");
  });
});
