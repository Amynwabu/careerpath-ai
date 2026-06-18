import { Router, type IRouter, type Response } from "express";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import {
  authRefreshTokensTable,
  db,
  profilesTable,
  usersTable,
} from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import {
  ACCESS_TOKEN_TTL_MS,
  AUTH_COOKIE_NAME,
  signToken,
  requireAuth,
} from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const GOOGLE_STATE_COOKIE = "careerpath_google_oauth_state";
const REFRESH_COOKIE_NAME = "careerpath_refresh";
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const GOOGLE_SCOPES = ["openid", "email", "profile"].join(" ");

function cleanEnv(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1).trim() || null;
  }
  return trimmed;
}

function appOrigin(): string {
  return (cleanEnv(process.env.APP_ORIGIN) ?? cleanEnv(process.env.API_BASE_URL) ?? "http://localhost:21588")
    .replace(/\/+$/, "");
}

function googleOAuthConfig() {
  const clientId = cleanEnv(process.env.GOOGLE_CLIENT_ID);
  const clientSecret = cleanEnv(process.env.GOOGLE_CLIENT_SECRET);
  const apiOrigin = (cleanEnv(process.env.API_BASE_URL) ?? "http://localhost:8080").replace(/\/+$/, "");
  const redirectUri = cleanEnv(process.env.GOOGLE_REDIRECT_URI) ?? `${apiOrigin}/api/auth/google/callback`;
  const invalidClientId = !clientId || clientId === "..." || !clientId.endsWith(".apps.googleusercontent.com");
  const invalidClientSecret = !clientSecret || clientSecret === "...";

  if (invalidClientId || invalidClientSecret) return null;
  return { clientId, clientSecret, redirectUri };
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

function refreshCookieOptions(maxAge: number) {
  return {
    ...cookieOptions(maxAge),
    path: "/api/auth",
  };
}

function refreshTokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function createRefreshToken() {
  const token = randomBytes(48).toString("base64url");
  return { token, hash: refreshTokenHash(token) };
}

function setAccessCookie(res: Response, user: typeof usersTable.$inferSelect) {
  const token = signToken({ userId: user.id, email: user.email, type: "access" });
  res.cookie(AUTH_COOKIE_NAME, token, cookieOptions(ACCESS_TOKEN_TTL_MS));
}

async function startSession(res: Response, user: typeof usersTable.$inferSelect) {
  const refresh = createRefreshToken();
  const familyId = randomBytes(24).toString("base64url");

  await db.insert(authRefreshTokensTable).values({
    userId: user.id,
    tokenHash: refresh.hash,
    familyId,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
  });

  setAccessCookie(res, user);
  res.cookie(
    REFRESH_COOKIE_NAME,
    refresh.token,
    refreshCookieOptions(REFRESH_TOKEN_TTL_MS),
  );
}

function clearSessionCookies(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, cookieOptions(0));
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions(0));
}

async function revokeRefreshFamily(rawToken: string | undefined) {
  if (!rawToken) return;

  const [stored] = await db
    .select()
    .from(authRefreshTokensTable)
    .where(eq(authRefreshTokensTable.tokenHash, refreshTokenHash(rawToken)));
  if (!stored) return;

  await db
    .update(authRefreshTokensTable)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(authRefreshTokensTable.familyId, stored.familyId),
        isNull(authRefreshTokensTable.revokedAt),
      ),
    );
}

function publicUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get("/auth/google", (_req, res): void => {
  const config = googleOAuthConfig();
  if (!config) {
    res.redirect(`${appOrigin()}/login?google=not-configured`);
    return;
  }

  const state = randomBytes(32).toString("base64url");
  res.cookie(GOOGLE_STATE_COOKIE, state, cookieOptions(10 * 60 * 1000));

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  res.redirect(url.toString());
});

router.get("/auth/google/callback", async (req, res): Promise<void> => {
  const config = googleOAuthConfig();
  if (!config) {
    res.redirect(`${appOrigin()}/login?google=not-configured`);
    return;
  }

  const error = typeof req.query.error === "string" ? req.query.error : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const expectedState = req.cookies?.[GOOGLE_STATE_COOKIE];
  res.clearCookie(GOOGLE_STATE_COOKIE, cookieOptions(0));

  if (error) {
    res.redirect(`${appOrigin()}/login?google=cancelled`);
    return;
  }
  if (!code || !state || !expectedState || state !== expectedState) {
    res.redirect(`${appOrigin()}/login?google=invalid-state`);
    return;
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        grant_type: "authorization_code",
        redirect_uri: config.redirectUri,
      }),
    });
    if (!tokenResponse.ok) throw new Error(`Google token exchange failed with ${tokenResponse.status}`);

    const tokenPayload = await tokenResponse.json() as { access_token?: string };
    if (!tokenPayload.access_token) throw new Error("Google did not return an access token");

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    });
    if (!profileResponse.ok) throw new Error(`Google profile lookup failed with ${profileResponse.status}`);

    const googleProfile = await profileResponse.json() as {
      email?: string;
      email_verified?: boolean;
      name?: string;
    };
    if (!googleProfile.email || googleProfile.email_verified !== true) {
      res.redirect(`${appOrigin()}/login?google=unverified`);
      return;
    }

    const email = googleProfile.email.toLowerCase();
    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    let user = existingUser;

    if (!user) {
      const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 10);
      [user] = await db
        .insert(usersTable)
        .values({
          name: googleProfile.name?.trim() || email.split("@")[0],
          email,
          emailVerified: true,
          passwordHash,
        })
        .returning();
      await db.insert(profilesTable).values({ userId: user.id });
    } else if (!user.emailVerified) {
      [user] = await db
        .update(usersTable)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(usersTable.id, user.id))
        .returning();
    }

    await startSession(res, user);
    res.redirect(`${appOrigin()}/start`);
  } catch (oauthError) {
    logger.error({ err: oauthError }, "Google sign-in failed");
    res.redirect(`${appOrigin()}/login?google=failed`);
  }
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db.insert(usersTable).values({ name, email, passwordHash }).returning();

  await db.insert(profilesTable).values({ userId: user.id });

  await startSession(res, user);

  res.status(201).json({
    user: publicUser(user),
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  await startSession(res, user);

  res.json({
    user: publicUser(user),
  });
});

router.post("/auth/refresh", async (req, res): Promise<void> => {
  const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;
  if (!rawToken) {
    clearSessionCookies(res);
    res.status(401).json({ error: "Refresh session is missing or expired" });
    return;
  }

  const tokenHash = refreshTokenHash(rawToken);
  const [stored] = await db
    .select()
    .from(authRefreshTokensTable)
    .where(eq(authRefreshTokensTable.tokenHash, tokenHash));

  if (!stored || stored.revokedAt || stored.expiresAt.getTime() <= Date.now()) {
    if (stored) await revokeRefreshFamily(rawToken);
    clearSessionCookies(res);
    res.status(401).json({ error: "Refresh session is invalid or expired" });
    return;
  }

  const replacement = createRefreshToken();
  const rotated = await db.transaction(async (tx) => {
    const [consumed] = await tx
      .update(authRefreshTokensTable)
      .set({
        revokedAt: new Date(),
        lastUsedAt: new Date(),
        replacedByTokenHash: replacement.hash,
      })
      .where(
        and(
          eq(authRefreshTokensTable.tokenHash, tokenHash),
          isNull(authRefreshTokensTable.revokedAt),
        ),
      )
      .returning();

    if (!consumed) {
      await tx
        .update(authRefreshTokensTable)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(authRefreshTokensTable.familyId, stored.familyId),
            isNull(authRefreshTokensTable.revokedAt),
          ),
        );
      return false;
    }

    await tx.insert(authRefreshTokensTable).values({
      userId: stored.userId,
      tokenHash: replacement.hash,
      familyId: stored.familyId,
      expiresAt: stored.expiresAt,
    });
    return true;
  });

  if (!rotated) {
    clearSessionCookies(res);
    res.status(401).json({ error: "Refresh session was already used" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, stored.userId));
  if (!user) {
    await revokeRefreshFamily(replacement.token);
    clearSessionCookies(res);
    res.status(401).json({ error: "User not found" });
    return;
  }

  setAccessCookie(res, user);
  res.cookie(
    REFRESH_COOKIE_NAME,
    replacement.token,
    refreshCookieOptions(Math.max(0, stored.expiresAt.getTime() - Date.now())),
  );
  res.json({ user: publicUser(user) });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  await revokeRefreshFamily(req.cookies?.[REFRESH_COOKIE_NAME]);
  clearSessionCookies(res);
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json(publicUser(user));
});

export default router;
