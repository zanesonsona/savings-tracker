// Auth core for Phase 2: password hashing + signed session tokens (T22) and
// session lookup + API guards (T23).
//
// Decisions: D14 (username/password accounts), D17 (no new dependencies —
// `node:crypto` scrypt + HMAC-SHA256-signed httpOnly cookies).
//
// Passwords: scrypt with a random 16-byte salt per account, four-part format
// `scrypt$<salt b64url>$<hash b64url>`, timing-safe verification.
// Sessions:  `st_session` cookie holding `<payload b64url>.<hmac b64url>`,
// payload = JSON `{ uid, exp }` (expiry = unix seconds). Signature =
// HMAC-SHA256(secret, payload). Anything expired/tampered/unknown → signed out.

import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import type { User } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE_NAME = "st_session";
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days (D17)

const SCRYPT_KEYLEN = 64;
const SCRYPT_SALT_BYTES = 16;

// Fixed, publicly-known fallback so local development works without setup.
// Production refuses to start without a real SESSION_SECRET (D17).
const DEV_SESSION_SECRET = "dev-only-insecure-session-secret";

// ---------------------------------------------------------------------------
// Passwords (scrypt)
// ---------------------------------------------------------------------------

/** Hash a password with a fresh random salt. Format: `scrypt$<salt>$<hash>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SCRYPT_SALT_BYTES);
  const hash = (await scrypt(password, salt, SCRYPT_KEYLEN)) as Buffer;
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

/** Timing-safe verification of a password against a stored hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[1], "base64url");
    expected = Buffer.from(parts[2], "base64url");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------------------
// Session secret
// ---------------------------------------------------------------------------

let warnedAboutSecret = false;

/**
 * The HMAC secret for session tokens.
 * - `SESSION_SECRET` set → used as-is.
 * - production without it → throws (fail fast, D17).
 * - development/test → fixed DEV-ONLY fallback + a one-time console warning.
 */
export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length > 0) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is not set — refusing to run in production without a session secret (D17). Generate one with `openssl rand -base64 32` and pass it as an environment variable.",
    );
  }

  if (!warnedAboutSecret) {
    warnedAboutSecret = true;
    console.warn(
      "[auth] SESSION_SECRET is not set — using the fixed DEV-ONLY fallback secret. Set SESSION_SECRET before deploying (see .env.example).",
    );
  }
  return DEV_SESSION_SECRET;
}

// ---------------------------------------------------------------------------
// Session tokens
// ---------------------------------------------------------------------------

interface SessionPayload {
  uid: number; // user id
  exp: number; // unix seconds
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("base64url");
}

/** Create a signed session token for `userId` (30-day expiry). */
export function createSessionToken(userId: number, nowMs: number = Date.now()): string {
  const payload: SessionPayload = {
    uid: userId,
    exp: Math.floor(nowMs / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

/**
 * Verify a session token. Returns `{ uid }` when the signature is valid and the
 * token is not expired; `null` for missing/expired/tampered/malformed tokens.
 */
export function verifySessionToken(
  token: string | undefined | null,
  nowMs: number = Date.now(),
): { uid: number } | null {
  if (!token || typeof token !== "string") return null;

  const dot = token.indexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;

  const encoded = token.slice(0, dot);
  const signature = token.slice(dot + 1);

  const expected = sign(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof payload !== "object" || payload === null) return null;
  const { uid, exp } = payload as Record<string, unknown>;

  if (typeof uid !== "number" || !Number.isInteger(uid) || uid <= 0) return null;
  if (typeof exp !== "number" || !Number.isFinite(exp)) return null;
  if (Math.floor(nowMs / 1000) >= exp) return null;

  return { uid };
}

// ---------------------------------------------------------------------------
// Session cookie helpers (Route Handlers / Server Functions only — D17)
// ---------------------------------------------------------------------------

/** Set the signed session cookie for `userId` (httpOnly, SameSite=Lax). */
export async function setSessionCookie(userId: number): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS,
  });
}

/** Clear the session cookie (logout). */
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

// ---------------------------------------------------------------------------
// Session lookup + API guards (T23 — consumed by T25–T27)
// ---------------------------------------------------------------------------

/**
 * The session user re-read from the DB (any status), or `null` when signed
 * out. Expired / tampered / unknown-user sessions all yield `null` (D17).
 */
export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const session = verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.uid } });
}

/** Either the signed-in user or a ready-to-return error response. */
export type AuthResult = { user: User } | { response: NextResponse };

function authError(message: string, status: 401 | 403): { response: NextResponse } {
  return { response: NextResponse.json({ error: message }, { status }) };
}

/**
 * API guard: the signed-in `APPROVED` user, or an error response.
 *
 * ```ts
 * const auth = await requireUser();
 * if ("response" in auth) return auth.response;
 * const user = auth.user;
 * ```
 */
export async function requireUser(): Promise<AuthResult> {
  const user = await getSessionUser();
  if (!user) return authError("Authentication required", 401);
  if (user.status === "PENDING") return authError("Account pending admin approval", 403);
  if (user.status === "REJECTED") return authError("This account registration was declined", 403);
  if (user.status !== "APPROVED") return authError("Account is not approved", 403);
  return { user };
}

/** API guard: like `requireUser`, plus `role === "ADMIN"` (T27). */
export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireUser();
  if ("response" in result) return result;
  if (result.user.role !== "ADMIN") return authError("Admin access required", 403);
  return result;
}
