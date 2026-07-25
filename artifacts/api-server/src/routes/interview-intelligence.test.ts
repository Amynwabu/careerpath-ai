import { describe, expect, it, vi } from "vitest";
import { createInterviewSession } from "@workspace/interview-intelligence";
import {
  interviewTestStore,
  respondInterview,
} from "./interview-intelligence";

function responseFixture() {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
}

describe("interview API security", () => {
  it("sanitizes unsupported claim errors", async () => {
    const response = responseFixture();
    await respondInterview(response as never, async () => {
      throw Object.assign(new Error("private answer and CV text"), {
        code: "unsupported_claim_detected",
      });
    });
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      code: "unsupported_claim_detected",
      error: "The answer contains an unsupported claim.",
    });
  });

  it("fails cross-owner access without revealing record existence", () => {
    interviewTestStore.reset();
    const session = createInterviewSession({
      ownerUserId: "owner-a",
      profile: { profileId: "profile-a" } as never,
      vacancy: {
        jobId: "job-a",
        taxonomyVersion: "2026.1",
        expiryDate: null,
        description: "Synthetic role",
        requiredSkills: [],
        preferredSkills: [],
        unresolvedRequiredSkills: [],
        unresolvedPreferredSkills: [],
        qualifications: [],
        certifications: [],
        responsibilities: [],
      } as never,
      matchResult: { jobId: "job-a" } as never,
    });
    interviewTestStore.seed(session);
    expect(() => interviewTestStore.get(session.sessionId, "owner-b"))
      .toThrow("resource_not_found");
  });

  it("fails advisor review closed until a persistent scoped grant exists", async () => {
    const response = responseFixture();
    await respondInterview(response as never, async () => {
      throw Object.assign(new Error("no grant"), { code: "advisor_scope_required" });
    });
    expect(response.status).toHaveBeenCalledWith(403);
  });
});
