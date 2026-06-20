import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";
import { requireAuth, signToken } from "./auth";

function responseDouble() {
  const response = {
    status: vi.fn(),
    json: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response;
}

describe("access-token security", () => {
  it("issues access tokens for approximately 15 minutes", () => {
    const before = Math.floor(Date.now() / 1000);
    const token = signToken({ userId: 7, email: "member@example.com", type: "access" });
    const payload = jwt.decode(token) as jwt.JwtPayload;

    expect(payload.exp).toBeDefined();
    expect(payload.iat).toBeDefined();
    expect(payload.exp! - payload.iat!).toBe(15 * 60);
    expect(payload.exp!).toBeGreaterThanOrEqual(before + 15 * 60);
  });

  it("accepts a valid access token", () => {
    const request = {
      cookies: {
        careerpath_session: signToken({ userId: 7, email: "member@example.com", type: "access" }),
      },
      headers: {},
    } as any;
    const response = responseDouble();
    const next = vi.fn();

    requireAuth(request, response as any, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(request.user).toMatchObject({ userId: 7, type: "access" });
  });

  it("rejects a token that is not an access token", () => {
    const request = {
      cookies: {
        careerpath_session: signToken({ userId: 7, email: "member@example.com", type: "refresh" } as any),
      },
      headers: {},
    } as any;
    const response = responseDouble();
    const next = vi.fn();

    requireAuth(request, response as any, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({ error: "Invalid or expired token" });
  });
});
