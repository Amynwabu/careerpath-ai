import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in production.");
}
const JWT_SECRET =
  process.env.JWT_SECRET ?? "development-only-careerpath-secret";
export const AUTH_COOKIE_NAME = "careerpath_session";
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;

export interface AuthPayload {
  userId: number;
  email: string;
  type: "access";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = req.cookies?.[AUTH_COOKIE_NAME] ?? bearerToken;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    if (payload.type !== "access") throw new Error("Invalid token type");
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}
