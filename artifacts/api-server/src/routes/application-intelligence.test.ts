import { describe, expect, it, vi } from "vitest";
import {
  createOptimisationSession,
  standardApplicationEntitlements,
} from "@workspace/application-intelligence";
import {
  applicationIntelligenceTestStore,
  respondApplication,
} from "./application-intelligence";

function responseFixture() {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
}

describe("application-intelligence API security", () => {
  it("sanitizes unsupported-claim and concurrency responses", async () => {
    const response = responseFixture();
    await respondApplication(response as never, async () => {
      throw Object.assign(new Error("private CV text and database detail"), {
        code: "unsupported_claim_detected",
      });
    });
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      code: "unsupported_claim_detected",
      error: "The proposed content contains an unsupported or conflicting claim.",
      validation: undefined,
    });
  });

  it("fails cross-owner access without revealing record existence", () => {
    applicationIntelligenceTestStore.reset();
    const session = createOptimisationSession({
      ownerUserId: "owner-a",
      profile: {
        profileId: "profile-a",
        sourceDocumentIds: ["doc-a"],
      } as never,
      vacancy: {
        jobId: "job-a",
        taxonomyVersion: "2026.1",
      } as never,
      matchResult: { jobId: "job-a" } as never,
      sourceCv: {
        fileType: "text",
        text: "Synthetic CV",
        sectionHeadings: [],
      },
    });
    applicationIntelligenceTestStore.seed(session);
    expect(() =>
      applicationIntelligenceTestStore.getSession(session.sessionId, "owner-b"),
    ).toThrow("resource_not_found");
  });

  it("keeps generation, export and advisor capabilities outside Standard access", () => {
    expect(standardApplicationEntitlements).toMatchObject({
      canAnalyseCvAgainstJob: true,
      canGenerateTailoredCv: false,
      canExportDocx: false,
      canExportPdf: false,
      canRequestAdvisorReview: false,
    });
  });
});
