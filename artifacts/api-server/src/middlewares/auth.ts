import { Request, Response, NextFunction } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { db, eq, usersTable } from "@workspace/db";
import { appCookieName, cookieOptions } from "./csrf";
import { requireJwtSecret } from "../lib/env";

const JWT_SECRET = requireJwtSecret();
const AUTH_COOKIE = appCookieName("session");

export interface AuthPayload {
  userId: number;
  email: string;
  tokenVersion: number;
}

type ActionTokenPurpose = "password-reset" | "email-verification";

type ActionTokenPayload = {
  purpose: ActionTokenPurpose;
  userId: number;
  email: string;
  tokenVersion: number;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.[AUTH_COOKIE];
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const token = cookieToken ?? bearerToken;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as unknown as AuthPayload;
    const [user] = await db
      .select({ id: usersTable.id, email: usersTable.email, tokenVersion: usersTable.tokenVersion })
      .from(usersTable)
      .where(eq(usersTable.id, payload.userId))
      .limit(1);

    if (!user || user.email !== payload.email || user.tokenVersion !== payload.tokenVersion) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function signActionToken(payload: ActionTokenPayload, expiresIn: SignOptions["expiresIn"]): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyActionToken(token: string, purpose: ActionTokenPurpose): ActionTokenPayload {
  const payload = jwt.verify(token, JWT_SECRET) as unknown as ActionTokenPayload;
  if (payload.purpose !== purpose) {
    throw new Error("Invalid token purpose");
  }
  return payload;
}

export function setAuthCookie(req: Request, res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    ...cookieOptions(true, req),
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookie(req: Request, res: Response): void {
  res.clearCookie(AUTH_COOKIE, cookieOptions(true, req));
}
