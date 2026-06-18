import { afterEach, describe, expect, it, vi } from "vitest";
import { customFetch, setBaseUrl } from "@workspace/api-client-react";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("generated API transport", () => {
  afterEach(() => {
    setBaseUrl(null);
    vi.unstubAllGlobals();
  });

  it("refreshes and retries generated authenticated requests", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { error: "expired" }))
      .mockResolvedValueOnce(jsonResponse(200, { user: { id: 1 } }))
      .mockResolvedValueOnce(jsonResponse(200, { id: 1, email: "user@example.com" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(customFetch("/api/auth/me", { responseType: "json" })).resolves.toEqual({
      id: 1,
      email: "user@example.com",
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/auth/me",
      "/api/auth/refresh",
      "/api/auth/me",
    ]);
  });

  it("does not attempt refresh for invalid login credentials", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(401, { error: "Invalid email or password" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(customFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "user@example.com", password: "wrong" }),
      responseType: "json",
    })).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
