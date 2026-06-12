import crypto from "node:crypto";
import type { CookieOptions, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { logActivity } from "../lib/audit";
import { requireJwtSecret } from "../lib/env";

const DEFAULT_COOKIE_PREFIX = "careerpath";
const COOKIE_PREFIX = sanitizeCookiePrefix(process.env.COOKIE_PREFIX) ?? DEFAULT_COOKIE_PREFIX;
export const CSRF_COOKIE = appCookieName("csrf");
const CSRF_HEADER = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const JWT_SECRET = requireJwtSecret();

function sanitizeCookiePrefix(value?: string): string | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  return normalized.replace(/[^A-Za-z0-9_-]/g, "_");
}

export function appCookieName(name: string): string {
  return `${COOKIE_PREFIX}_${name}`;
}

function isHttpsRequest(req?: Request): boolean {
  const forwardedProto = req?.header("x-forwarded-proto")?.split(",")[0]?.trim();
  return req?.secure === true || forwardedProto === "https";
}

function isSecureCookieEnabled(req?: Request) {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.COOKIE_SECURE === "true" ||
    isHttpsRequest(req)
  );
}

export function cookieOptions(httpOnly: boolean, req?: Request): CookieOptions {
  return {
    httpOnly,
    secure: isSecureCookieEnabled(req),
    sameSite: "strict",
    path: "/",
  };
}

export function createCsrfToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function setCsrfCookie(req: Request, res: Response, token = createCsrfToken()): string {
  res.cookie(CSRF_COOKIE, token, cookieOptions(false, req));
  return token;
}

export function clearCsrfCookie(req: Request, res: Response): void {
  res.clearCookie(CSRF_COOKIE, cookieOptions(false, req));
}

function userIdFromSessionCookie(req: Request): number | null {
  const token = req.cookies?.[appCookieName("session")];
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId?: unknown };
    return typeof payload.userId === "number" ? payload.userId : null;
  } catch {
    return null;
  }
}

export async function csrfProtection(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (SAFE_METHODS.has(req.method) || req.path === "/api/auth/csrf") {
    next();
    return;
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.header(CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    await logActivity({
      userId: userIdFromSessionCookie(req),
      type: "security.csrf_failed",
      description: `Rejected ${req.method} ${req.path} because the CSRF token was missing or invalid`,
    });
    res.status(403).json({ error: "Invalid CSRF token" });
    return;
  }

  next();
}
