import { describe, expect, it, vi } from "vitest";
import { respondPlanning } from "./career-planning";

function responseFixture() {
  const response = { status: vi.fn(), json: vi.fn() };
  response.status.mockReturnValue(response);
  return response;
}

describe("career planning API policy", () => {
  it("maps unpublished taxonomy to a fail-closed response", async () => {
    const response = responseFixture();
    await respondPlanning(response as never, async () => {
      throw new Error("Career Intelligence requires a published taxonomy snapshot.");
    });
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      error: "Career planning is unavailable until a taxonomy is published.",
      code: "taxonomy_unavailable",
      taxonomyStatus: "unpublished_candidate",
      persistenceStatus: "stateless",
    });
  });

  it("returns structured unresolved-target errors without stack traces", async () => {
    const response = responseFixture();
    await respondPlanning(response as never, async () => {
      throw Object.assign(new Error("internal detail"), {
        code: "target_occupation_unresolved",
      });
    });
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      error: "Target occupation must be resolved before assessment.",
      code: "target_occupation_unresolved",
      persistenceStatus: "stateless",
    });
  });
});
