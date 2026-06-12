import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db, eq, usersTable, profilesTable } from "@workspace/db";
import { ForgotPasswordBody, LoginBody, RegisterBody, ResetPasswordBody, VerifyEmailBody } from "@workspace/api-zod";
import {
  signActionToken,
  signToken,
  verifyActionToken,
  requireAuth,
  setAuthCookie,
  clearAuthCookie,
} from "../middlewares/auth";
import { appCookieName, clearCsrfCookie, cookieOptions, setCsrfCookie } from "../middlewares/csrf";
import {
  appBaseUrl,
  resetPasswordEmail,
  sendTransactionalEmail,
  verifyEmailMessage,
} from "../lib/email";
import { logActivity } from "../lib/audit";
import { logger } from "../lib/logger";

const router: IRouter = Router();
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("careerpath-invalid-user-password", 10);
const GOOGLE_OAUTH_STATE_COOKIE = appCookieName("google_oauth_state");
const GOOGLE_SCOPES = ["openid", "email", "profile"].join(" ");

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

function apiBaseUrl(): string {
  return (process.env.API_BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}

function googleOAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = (process.env.GOOGLE_REDIRECT_URI ?? `${apiBaseUrl()}/api/auth/google/callback`).trim();

  if (!clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return { clientId, clientSecret, redirectUri };
}

function clearGoogleState(req: Parameters<typeof cookieOptions>[1], res: Parameters<typeof setCsrfCookie>[1]) {
  res.clearCookie(GOOGLE_OAUTH_STATE_COOKIE, {
    ...cookieOptions(true, req),
    sameSite: "lax",
  });
}

function verificationLink(token: string) {
  return `${process.env.API_BASE_URL?.replace(/\/+$/, "") ?? appBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
}

function resetLink(token: string) {
  return `${appBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

async function sendVerificationEmail(user: typeof usersTable.$inferSelect): Promise<void> {
  const token = signActionToken({
    purpose: "email-verification",
    userId: user.id,
    email: user.email,
    tokenVersion: user.tokenVersion,
  }, "7d");

  await sendTransactionalEmail(verifyEmailMessage(user.email, verificationLink(token)));
}

router.get("/auth/csrf", (req, res): void => {
  const csrfToken = setCsrfCookie(req, res);
  res.json({ csrfToken });
});

router.get("/auth/google", (req, res): void => {
  const config = googleOAuthConfig();
  if (!config) {
    res.redirect(`${appBaseUrl()}/login?google=not-configured`);
    return;
  }

  const state = randomBytes(32).toString("base64url");
  res.cookie(GOOGLE_OAUTH_STATE_COOKIE, state, {
    ...cookieOptions(true, req),
    sameSite: "lax",
    maxAge: 10 * 60 * 1000,
  });

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
    res.redirect(`${appBaseUrl()}/login?google=not-configured`);
    return;
  }

  const error = typeof req.query.error === "string" ? req.query.error : "";
  if (error) {
    clearGoogleState(req, res);
    res.redirect(`${appBaseUrl()}/login?google=cancelled`);
    return;
  }

  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const expectedState = req.cookies?.[GOOGLE_OAUTH_STATE_COOKIE];
  clearGoogleState(req, res);

  if (!code || !state || !expectedState || state !== expectedState) {
    res.redirect(`${appBaseUrl()}/login?google=invalid-state`);
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

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text().catch(() => "");
      throw new Error(`Google token exchange failed (${tokenResponse.status}): ${body}`);
    }

    const tokenPayload = await tokenResponse.json() as { access_token?: string };
    if (!tokenPayload.access_token) {
      throw new Error("Google token response did not include an access token");
    }

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokenPayload.access_token}` },
    });

    if (!profileResponse.ok) {
      const body = await profileResponse.text().catch(() => "");
      throw new Error(`Google userinfo lookup failed (${profileResponse.status}): ${body}`);
    }

    const googleProfile = await profileResponse.json() as {
      email?: string;
      email_verified?: boolean;
      name?: string;
    };

    if (!googleProfile.email || googleProfile.email_verified !== true) {
      res.redirect(`${appBaseUrl()}/login?google=unverified`);
      return;
    }

    const email = googleProfile.email.toLowerCase();
    const [existingUser] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    let user = existingUser;

    if (!user) {
      const passwordHash = await bcrypt.hash(randomBytes(32).toString("base64url"), 10);
      [user] = await db.insert(usersTable).values({
        name: googleProfile.name?.trim() || email.split("@")[0],
        email,
        emailVerified: true,
        passwordHash,
      }).returning();
      await db.insert(profilesTable).values({ userId: user.id });
      await logActivity({
        userId: user.id,
        type: "auth.google_register",
        description: "Registered account with Google",
      });
    } else {
      if (!user.emailVerified) {
        const [updatedUser] = await db.update(usersTable)
          .set({ emailVerified: true, updatedAt: new Date() })
          .where(eq(usersTable.id, user.id))
          .returning();
        user = updatedUser;
      }

      await logActivity({
        userId: user.id,
        type: "auth.google_login",
        description: "Logged in with Google",
      });
    }

    const token = signToken({ userId: user.id, email: user.email, tokenVersion: user.tokenVersion });
    setAuthCookie(req, res, token);
    setCsrfCookie(req, res);
    res.redirect(`${appBaseUrl()}/dashboard`);
  } catch (error) {
    logger.error({ err: error }, "Google sign-in failed");
    res.redirect(`${appBaseUrl()}/login?google=failed`);
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
  await logActivity({
    userId: user.id,
    type: "auth.register",
    description: "Registered account",
  });
  await sendVerificationEmail(user).catch((error) => {
    logger.error({ err: error, userId: user.id }, "Failed to send verification email");
  });

  const token = signToken({ userId: user.id, email: user.email, tokenVersion: user.tokenVersion });
  setAuthCookie(req, res, token);
  const csrfToken = setCsrfCookie(req, res);

  res.status(201).json({
    user: publicUser(user),
    csrfToken,
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
  const passwordHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
  const valid = await bcrypt.compare(password, passwordHash);

  if (!user || !valid) {
    if (user) {
      await logActivity({
        userId: user.id,
        type: "auth.login_failed",
        description: "Failed login attempt",
      });
    }
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  await logActivity({
    userId: user.id,
    type: "auth.login",
    description: "Logged in",
  });

  const token = signToken({ userId: user.id, email: user.email, tokenVersion: user.tokenVersion });
  setAuthCookie(req, res, token);
  const csrfToken = setCsrfCookie(req, res);

  res.json({
    user: publicUser(user),
    csrfToken,
  });
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, parsed.data.email)).limit(1);
  if (user) {
    await logActivity({
      userId: user.id,
      type: "auth.password_reset_requested",
      description: "Requested password reset email",
    });
    const token = signActionToken({
      purpose: "password-reset",
      userId: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
    }, "1h");

    await sendTransactionalEmail(resetPasswordEmail(user.email, resetLink(token))).catch((error) => {
      logger.error({ err: error, userId: user.id }, "Failed to send password reset email");
    });
  }

  res.json({ message: "If an account exists for that email, a reset link has been sent." });
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const payload = verifyActionToken(parsed.data.token, "password-reset");
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user || user.email !== payload.email || user.tokenVersion !== payload.tokenVersion) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    await db.update(usersTable)
      .set({ passwordHash, tokenVersion: user.tokenVersion + 1, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));

    await logActivity({
      userId: user.id,
      type: "auth.password_reset",
      description: "Reset password and invalidated existing sessions",
    });
    clearAuthCookie(req, res);
    clearCsrfCookie(req, res);
    res.json({ message: "Password has been reset successfully." });
  } catch {
    res.status(400).json({ error: "Invalid or expired reset token" });
  }
});

router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifyEmailBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const payload = verifyActionToken(parsed.data.token, "email-verification");
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user || user.email !== payload.email || user.tokenVersion !== payload.tokenVersion) {
      res.status(400).json({ error: "Invalid or expired verification token" });
      return;
    }

    const [updated] = await db.update(usersTable)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id))
      .returning();

    await logActivity({
      userId: user.id,
      type: "auth.email_verified",
      description: "Verified email address",
    });
    res.json({ user: publicUser(updated) });
  } catch {
    res.status(400).json({ error: "Invalid or expired verification token" });
  }
});

router.get("/auth/verify-email", async (req, res): Promise<void> => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    res.redirect(`${appBaseUrl()}/login?verified=0`);
    return;
  }

  try {
    const payload = verifyActionToken(token, "email-verification");
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId)).limit(1);
    if (!user || user.email !== payload.email || user.tokenVersion !== payload.tokenVersion) {
      res.redirect(`${appBaseUrl()}/login?verified=0`);
      return;
    }

    await db.update(usersTable)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));
    await logActivity({
      userId: user.id,
      type: "auth.email_verified",
      description: "Verified email address",
    });
    res.redirect(`${appBaseUrl()}/login?verified=1`);
  } catch {
    res.redirect(`${appBaseUrl()}/login?verified=0`);
  }
});

router.post("/auth/logout", (req, res): void => {
  clearAuthCookie(req, res);
  clearCsrfCookie(req, res);
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
