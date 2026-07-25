import { describe, expect, it, vi } from "vitest";
import { persistentResponse } from "./career-data";

vi.hoisted(() => {
  process.env.DATABASE_URL ??= "postgresql://localhost/careerpath_test";
});

function responseFixture() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
    setHeader: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

describe("persistent career-data API errors", () => {
  it("does not reveal whether a cross-user resource exists", async () => {
    const response = responseFixture();
    await persistentResponse(response as never, async () => {
      throw Object.assign(new Error("internal owner mismatch"), {
        code: "forbidden",
      });
    });
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      error: "Resource was not found.",
      code: "forbidden",
    });
  });

  it("returns concurrency conflicts without database details", async () => {
    const response = responseFixture();
    await persistentResponse(response as never, async () => {
      throw Object.assign(new Error("update career_data_profiles set ..."), {
        code: "record_version_conflict",
      });
    });
    expect(response.status).toHaveBeenCalledWith(409);
    expect(JSON.stringify(response.json.mock.calls)).not.toContain("career_data_profiles");
  });

  it("returns structured retry guidance for enforced rate limits", async () => {
    const response = responseFixture();
    await persistentResponse(response as never, async () => {
      throw Object.assign(new Error("limit"), {
        code: "rate_limit_exceeded",
        retryAfterSeconds: 37,
      });
    });
    expect(response.status).toHaveBeenCalledWith(429);
    expect(response.setHeader).toHaveBeenCalledWith("Retry-After", "37");
    expect(response.json).toHaveBeenCalledWith({
      error: "Too many requests; retry later.",
      code: "rate_limit_exceeded",
      retryAfterSeconds: 37,
    });
  });

  it("fails closed when private storage is unavailable", async () => {
    const response = responseFixture();
    await persistentResponse(response as never, async () => {
      throw Object.assign(new Error("private config"), {
        code: "storage_unavailable",
      });
    });
    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      error: "Private document storage is unavailable.",
      code: "storage_unavailable",
    });
  });
});
