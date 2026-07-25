import { describe, expect, it, vi } from "vitest";
import { respondProfile } from "./career-profile";

function responseFixture() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

describe("career profile API response policy", () => {
  it("returns unpublished taxonomy as a fail-closed service response", async () => {
    const response = responseFixture();
    await respondProfile(response as never, async () => {
      throw new Error("Career Intelligence requires a published taxonomy snapshot.");
    });
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      error: "Career intelligence is unavailable until a taxonomy is published.",
      taxonomyStatus: "unpublished_candidate",
    });
  });

  it("maps safe validation codes without returning stack traces", async () => {
    const response = responseFixture();
    await respondProfile(response as never, async () => {
      throw Object.assign(new Error("File exceeds limit."), {
        code: "file_too_large",
      });
    });
    expect(response.status).toHaveBeenCalledWith(413);
    expect(response.json).toHaveBeenCalledWith({
      error: "File exceeds limit.",
      code: "file_too_large",
    });
  });
});
