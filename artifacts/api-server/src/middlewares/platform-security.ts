import type { NextFunction, Request, Response } from "express";
import { runtimeConfig } from "../lib/runtime-config";

export function platformSecurityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("Content-Security-Policy",
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; form-action 'self'; img-src 'self' data: https:; connect-src 'self' https:; script-src 'self'; style-src 'self' 'unsafe-inline'");
  if (runtimeConfig.cookieSecure) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (_req.path.startsWith("/api/")) res.setHeader("Cache-Control", "no-store");
  next();
}

export function csrfOriginGuard(req: Request, res: Response, next: NextFunction) {
  if (!["POST","PUT","PATCH","DELETE"].includes(req.method)) return next();
  const origin = req.headers.origin;
  if (origin && !runtimeConfig.allowedOrigins.includes(origin)) {
    res.status(403).json({ code: "origin_not_allowed", error: "Request origin is not allowed." });
    return;
  }
  if (["/api/auth/login","/api/auth/register"].includes(req.path)) return next();
  if (req.header("authorization")?.startsWith("Bearer ")) return next();
  const cookieToken = req.cookies?.careerpath_csrf;
  const headerToken = req.header("x-csrf-token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    res.status(403).json({ code: "csrf_token_invalid", error: "CSRF token is missing or invalid." });
    return;
  }
  next();
}
