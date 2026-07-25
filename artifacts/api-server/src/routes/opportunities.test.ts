import { describe, expect, it, vi } from "vitest";
import { respondOpportunity } from "./opportunities";

function responseFixture() {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
}

describe("opportunity API policy", () => {
  it("fails closed without exposing unpublished taxonomy", async () => {
    const response = responseFixture();
    await respondOpportunity(response as never, async () => {
      throw new Error("Career intelligence requires a published taxonomy.");
    });
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      code: "taxonomy_unavailable",
      error: "Opportunity intelligence is unavailable until a taxonomy is published.",
      issues: undefined,
      taxonomyStatus: "unpublished_candidate",
    });
  });

  it("does not expose internal exception details", async () => {
    const response = responseFixture();
    await respondOpportunity(response as never, async () => {
      throw Object.assign(new Error("database host and private detail"), {
        code: "job_not_found",
      });
    });
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      code: "job_not_found",
      error: "Job not found.",
      issues: undefined,
    });
  });
});
