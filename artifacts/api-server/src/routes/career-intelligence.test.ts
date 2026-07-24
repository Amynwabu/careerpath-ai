import { describe, expect, it, vi } from "vitest";
import { respond } from "./career-intelligence";

describe("career intelligence API", () => {
  it("fails closed while the taxonomy is unpublished", async () => {
    const response = {
      status: vi.fn(),
      json: vi.fn(),
    };
    response.status.mockReturnValue(response);
    await respond(response as never, async () => {
      const error = new Error("missing published fixture") as NodeJS.ErrnoException;
      error.code = "ENOENT";
      throw error;
    });
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      error: "Career intelligence is unavailable until a taxonomy is published.",
      taxonomyStatus: "unpublished_candidate",
    });
  });
});
