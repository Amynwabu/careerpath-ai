import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api-request";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiRequest", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses cookie credentials for API requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/dashboard");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dashboard",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("refreshes once and retries after an expired access cookie", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: "expired" }))
      .mockResolvedValueOnce(jsonResponse(200, { user: { id: 1 } }))
      .mockResolvedValueOnce(jsonResponse(200, { status: "ready" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/onboarding/status")).resolves.toEqual({ status: "ready" });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/onboarding/status",
      "/api/auth/refresh",
      "/api/onboarding/status",
    ]);
  });

  it("surfaces the original error when refresh fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: "Unauthorized" }))
      .mockResolvedValueOnce(jsonResponse(401, { error: "No refresh session" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/dashboard")).rejects.toThrow("Unauthorized");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
