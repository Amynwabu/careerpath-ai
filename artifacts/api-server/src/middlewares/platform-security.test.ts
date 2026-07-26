import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { csrfOriginGuard, platformSecurityHeaders } from "./platform-security";

function response() {
  const headers = new Map<string, string>();
  const res = {
    setHeader: vi.fn((name: string, value: string) => headers.set(name.toLowerCase(), value)),
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  return { res: res as unknown as Response, headers };
}

function request(input: Partial<Request>) {
  const headers = input.headers ?? {};
  return {
    method: "POST",
    path: "/api/profile",
    cookies: {},
    headers,
    header: (name: string) => {
      const value = headers[name.toLowerCase() as keyof typeof headers];
      return Array.isArray(value) ? value[0] : value;
    },
    ...input,
  } as unknown as Request;
}

describe("platform browser security", () => {
  it("sets security and private-data cache headers", () => {
    const { res, headers } = response();
    const next = vi.fn();
    platformSecurityHeaders(request({ method: "GET", path: "/api/profile" }), res, next);
    expect(headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("x-frame-options")).toBe("DENY");
    expect(headers.get("cache-control")).toBe("no-store");
    expect(next).toHaveBeenCalledOnce();
  });

  it("denies missing, invalid and cross-origin CSRF requests", () => {
    for (const req of [
      request({}),
      request({
        cookies: { careerpath_csrf: "cookie" },
        headers: { "x-csrf-token": "different" },
      }),
      request({ headers: { origin: "https://cross-origin.invalid" } }),
    ]) {
      const { res } = response();
      const next = vi.fn() as NextFunction;
      csrfOriginGuard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    }
  });

  it("accepts a matching token and bearer API clients", () => {
    const matching = request({
      cookies: { careerpath_csrf: "fixture" },
      headers: { "x-csrf-token": "fixture" },
    });
    const bearer = request({ headers: { authorization: "Bearer fixture-token" } });
    for (const req of [matching, bearer]) {
      const { res } = response();
      const next = vi.fn();
      csrfOriginGuard(req, res, next);
      expect(next).toHaveBeenCalledOnce();
    }
  });
});
