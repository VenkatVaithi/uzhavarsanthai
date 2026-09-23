import * as oidc from "openid-client";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetCurrentAuthUserResponse,
  RegisterLocalAccountBody,
  LoginLocalAccountBody,
  ExchangeMobileAuthorizationCodeBody,
  ExchangeMobileAuthorizationCodeResponse,
  LogoutMobileSessionResponse,
} from "@workspace/api-zod";
import { authRateLimitsTable, db, localCredentialsTable, usersTable } from "@workspace/db";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  getSession,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth";

const OIDC_COOKIE_TTL = 10 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_IP_LOGIN_ATTEMPTS = 50;
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000;
const MAX_REGISTRATIONS_PER_IP = 10;
const scryptAsync = promisify(scrypt);

const router: IRouter = Router();

function getOrigin(): string {
  if (process.env.NODE_ENV === "production") {
    return process.env.PUBLIC_APP_ORIGIN ?? "https://web-build--venkatesanvaith.replit.app";
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "http://localhost:19504";
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
  });
}

function getSafeReturnTo(value: unknown): string {
  if (value === "/") return "/";
  if (value === "/farmer/portal") return "/farmer/portal";
  return "/";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("hex")}$${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [algorithm, saltHex, hashHex] = storedHash.split("$");
  if (algorithm !== "scrypt" || !saltHex || !hashHex) return false;

  try {
    const expected = Buffer.from(hashHex, "hex");
    const actual = (await scryptAsync(
      password,
      Buffer.from(saltHex, "hex"),
      expected.length,
    )) as Buffer;
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

const dummyPasswordHash = hashPassword(randomBytes(32).toString("hex"));

function getRateLimitKey(...parts: string[]): string {
  return createHash("sha256").update(parts.join(":")).digest("hex");
}

function getRequestIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

async function isRateLimited(key: string, maximum: number): Promise<boolean> {
  const [entry] = await db
    .select({ attempts: authRateLimitsTable.attempts })
    .from(authRateLimitsTable)
    .where(
      and(
        eq(authRateLimitsTable.key, key),
        gt(authRateLimitsTable.resetAt, new Date()),
      ),
    )
    .limit(1);
  return (entry?.attempts ?? 0) >= maximum;
}

async function recordRateLimitAttempt(key: string, windowMs: number): Promise<number> {
  await db
    .delete(authRateLimitsTable)
    .where(lt(authRateLimitsTable.resetAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

  const resetAt = new Date(Date.now() + windowMs);
  const [entry] = await db
    .insert(authRateLimitsTable)
    .values({ key, attempts: 1, resetAt })
    .onConflictDoUpdate({
      target: authRateLimitsTable.key,
      set: {
        attempts: sql`CASE WHEN ${authRateLimitsTable.resetAt} <= now() THEN 1 ELSE ${authRateLimitsTable.attempts} + 1 END`,
        resetAt: sql`CASE WHEN ${authRateLimitsTable.resetAt} <= now() THEN ${resetAt} ELSE ${authRateLimitsTable.resetAt} END`,
        updatedAt: new Date(),
      },
    })
    .returning({ attempts: authRateLimitsTable.attempts });
  return entry.attempts;
}

async function clearRateLimit(key: string): Promise<void> {
  await db.delete(authRateLimitsTable).where(eq(authRateLimitsTable.key, key));
}

function toAuthUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
  };
}

async function startLocalSession(
  req: Request,
  res: Response,
  user: typeof usersTable.$inferSelect,
) {
  const authUser = toAuthUser(user);
  const currentSid = getSessionId(req);
  if (currentSid) await clearSession(res, currentSid);
  const sid = await createSession({
    provider: "local",
    user: authUser,
  });
  setSessionCookie(res, sid);
  return authUser;
}

async function upsertUser(claims: Record<string, unknown>) {
  const normalizedEmail =
    typeof claims.email === "string" ? normalizeEmail(claims.email) : null;
  const userData = {
    id: claims.sub as string,
    email: normalizedEmail,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as
      | string
      | null,
  };

  if (normalizedEmail) {
    const [emailOwner] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(sql`lower(${usersTable.email}) = ${normalizedEmail}`)
      .limit(1);
    if (emailOwner && emailOwner.id !== userData.id) return null;
  }

  try {
    const [user] = await db
      .insert(usersTable)
      .values(userData)
      .onConflictDoUpdate({
        target: usersTable.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      return null;
    }
    throw error;
  }
}

router.get("/auth/user", (req: Request, res: Response) => {
  res.json(
    GetCurrentAuthUserResponse.parse({
      user: req.isAuthenticated() ? req.user : null,
    }),
  );
});

router.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
  const parsed = RegisterLocalAccountBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.firstName.trim()) {
    res.status(400).json({ error: "Please provide valid registration details." });
    return;
  }

  const email = normalizeEmail(parsed.data.email);
  const registrationKey = getRateLimitKey("register", getRequestIp(req));
  const registrationAttempts = await recordRateLimitAttempt(
    registrationKey,
    REGISTRATION_WINDOW_MS,
  );
  if (registrationAttempts > MAX_REGISTRATIONS_PER_IP) {
    res.status(429).json({ error: "Too many registration attempts. Please try again later." });
    return;
  }

  const [existingUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = ${email}`)
    .limit(1);

  if (existingUser) {
    res.status(409).json({ error: "An account with this email already exists." });
    return;
  }

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const user = await db.transaction(async (tx) => {
      const [createdUser] = await tx
        .insert(usersTable)
        .values({
          email,
          firstName: parsed.data.firstName.trim(),
          lastName: parsed.data.lastName?.trim() || null,
          profileImageUrl: null,
        })
        .returning();

      await tx.insert(localCredentialsTable).values({
        userId: createdUser.id,
        email,
        passwordHash,
      });

      return createdUser;
    });

    const authUser = await startLocalSession(req, res, user);
    res.status(201).json(GetCurrentAuthUserResponse.parse({ user: authUser }));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505"
    ) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    throw error;
  }
});

router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const parsed = LoginLocalAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please provide a valid email and password." });
    return;
  }

  const email = normalizeEmail(parsed.data.email);
  const accountKey = getRateLimitKey("login-account", email);
  const ipKey = getRateLimitKey("login-ip", getRequestIp(req));
  if (
    (await isRateLimited(accountKey, MAX_LOGIN_ATTEMPTS)) ||
    (await isRateLimited(ipKey, MAX_IP_LOGIN_ATTEMPTS))
  ) {
    res.status(429).json({ error: "Too many attempts. Please try again in 15 minutes." });
    return;
  }

  const [credential] = await db
    .select({
      passwordHash: localCredentialsTable.passwordHash,
      user: usersTable,
    })
    .from(localCredentialsTable)
    .innerJoin(usersTable, eq(localCredentialsTable.userId, usersTable.id))
    .where(eq(localCredentialsTable.email, email))
    .limit(1);

  const passwordMatches = await verifyPassword(
    parsed.data.password,
    credential?.passwordHash ?? (await dummyPasswordHash),
  );

  if (!credential || !passwordMatches) {
    await Promise.all([
      recordRateLimitAttempt(accountKey, LOGIN_WINDOW_MS),
      recordRateLimitAttempt(ipKey, LOGIN_WINDOW_MS),
    ]);
    res.status(401).json({ error: "Email or password is incorrect." });
    return;
  }

  await clearRateLimit(accountKey);
  const authUser = await startLocalSession(req, res, credential.user);
  res.json(GetCurrentAuthUserResponse.parse({ user: authUser }));
});

router.get("/login", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin()}/api/callback`;

  const returnTo = getSafeReturnTo(req.query.returnTo);

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

// Query params are not validated because the OIDC provider may include
// parameters not expressed in the schema.
router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin()}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser(
    claims as unknown as Record<string, unknown>,
  );
  if (!dbUser) {
    res.redirect("/login?error=email_in_use");
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    provider: "replit",
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  const session = sid ? await getSession(sid) : null;
  await clearSession(res, sid);

  if (session?.provider === "local") {
    res.redirect(getSafeReturnTo(req.query.returnTo));
    return;
  }

  const config = await getOidcConfig();
  const origin = getOrigin();
  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  res.redirect(endSessionUrl.href);
});

router.post(
  "/mobile-auth/token-exchange",
  async (req: Request, res: Response) => {
    const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Missing or invalid required parameters" });
      return;
    }

    const { code, code_verifier, redirect_uri, state, nonce } = parsed.data;

    try {
      const config = await getOidcConfig();

      const callbackUrl = new URL(redirect_uri);
      callbackUrl.searchParams.set("code", code);
      callbackUrl.searchParams.set("state", state);
      callbackUrl.searchParams.set("iss", ISSUER_URL);

      const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
        pkceCodeVerifier: code_verifier,
        expectedNonce: nonce ?? undefined,
        expectedState: state,
        idTokenExpected: true,
      });

      const claims = tokens.claims();
      if (!claims) {
        res.status(401).json({ error: "No claims in ID token" });
        return;
      }

      const dbUser = await upsertUser(
        claims as unknown as Record<string, unknown>,
      );
      if (!dbUser) {
        res.status(409).json({
          error: "This email is already registered with another sign-in method",
        });
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const sessionData: SessionData = {
        provider: "replit",
        user: {
          id: dbUser.id,
          email: dbUser.email,
          firstName: dbUser.firstName,
          lastName: dbUser.lastName,
          profileImageUrl: dbUser.profileImageUrl,
        },
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
      };

      const sid = await createSession(sessionData);
      res.json(ExchangeMobileAuthorizationCodeResponse.parse({ token: sid }));
    } catch (err) {
      req.log.error({ err }, "Mobile token exchange error");
      res.status(500).json({ error: "Token exchange failed" });
    }
  },
);

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json(LogoutMobileSessionResponse.parse({ success: true }));
});

export default router;
