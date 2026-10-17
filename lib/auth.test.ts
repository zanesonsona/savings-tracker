// Unit tests for the auth core (T22): scrypt password hashing + signed session
// tokens. Cookie helpers are exercised end-to-end by the API checks in T23.

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  getSessionSecret,
  hashPassword,
  SESSION_TTL_SECONDS,
  verifyPassword,
  verifySessionToken,
} from "./auth";

const originalSecret = process.env.SESSION_SECRET;
const originalNodeEnv = process.env.NODE_ENV;

/** `process.env.NODE_ENV` is typed read-only; tests still need to flip it. */
function setNodeEnv(value: string | undefined) {
  const env = process.env as Record<string, string | undefined>;
  if (value === undefined) delete env.NODE_ENV;
  else env.NODE_ENV = value;
}

beforeEach(() => {
  process.env.SESSION_SECRET = "unit-test-secret";
  setNodeEnv(originalNodeEnv);
});

afterAll(() => {
  if (originalSecret === undefined) delete process.env.SESSION_SECRET;
  else process.env.SESSION_SECRET = originalSecret;
  setNodeEnv(originalNodeEnv);
});

describe("hashPassword / verifyPassword", () => {
  it("never stores the raw password and uses the scrypt$salt$hash format", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toContain("correct horse battery staple");
    const parts = hash.split("$");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe("scrypt");
    expect(parts[1].length).toBeGreaterThan(0);
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it("verifies the correct password and rejects wrong ones", async () => {
    const hash = await hashPassword("hunter2222");
    await expect(verifyPassword("hunter2222", hash)).resolves.toBe(true);
    await expect(verifyPassword("hunter2223", hash)).resolves.toBe(false);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
    await expect(verifyPassword("HUNTER2222", hash)).resolves.toBe(false);
  });

  it("salts each hash: the same password twice → different hashes, both valid", async () => {
    const a = await hashPassword("same-password");
    const b = await hashPassword("same-password");
    expect(a).not.toBe(b);
    await expect(verifyPassword("same-password", a)).resolves.toBe(true);
    await expect(verifyPassword("same-password", b)).resolves.toBe(true);
  });

  it("rejects malformed stored hashes instead of throwing", async () => {
    for (const stored of ["", "not-a-hash", "scrypt$only-two-parts", "scrypt$$", "bcrypt$aa$bb"]) {
      await expect(verifyPassword("anything", stored)).resolves.toBe(false);
    }
  });
});

describe("session tokens", () => {
  it("round-trips a valid token to the user id", () => {
    const token = createSessionToken(42);
    expect(token.split(".")).toHaveLength(2);
    expect(verifySessionToken(token)).toEqual({ uid: 42 });
  });

  it("rejects a tampered signature", () => {
    const token = createSessionToken(1);
    // Flip the last character of the signature.
    const last = token.at(-1);
    const flipped = last === "A" ? "B" : "A";
    const tampered = token.slice(0, -1) + flipped;
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("rejects a tampered payload even with a well-formed signature", () => {
    const token = createSessionToken(1);
    const [encoded, signature] = token.split(".");
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as {
      uid: number;
      exp: number;
    };
    payload.uid = 999999;
    const forgedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
    expect(verifySessionToken(`${forgedPayload}.${signature}`)).toBeNull();
  });

  it("rejects expired tokens (and accepts until the last second)", () => {
    const now = Date.now();
    const token = createSessionToken(7, now);
    expect(verifySessionToken(token, now + (SESSION_TTL_SECONDS - 1) * 1000)).toEqual({ uid: 7 });
    // At the exact expiry second (unix seconds) the token is no longer valid.
    expect(verifySessionToken(token, now + SESSION_TTL_SECONDS * 1000 + 1000)).toBeNull();
    // A token created 31 days ago is long expired.
    const old = createSessionToken(7, now - (SESSION_TTL_SECONDS + 24 * 60 * 60) * 1000);
    expect(verifySessionToken(old, now)).toBeNull();
  });

  it("rejects tokens signed with a different secret", () => {
    process.env.SESSION_SECRET = "secret-one";
    const token = createSessionToken(5);
    process.env.SESSION_SECRET = "secret-two";
    expect(verifySessionToken(token)).toBeNull();
  });

  it("rejects malformed tokens instead of throwing", () => {
    for (const token of ["", "abc", "abc.", ".def", "no-dot-at-all", "%%%.%%%", "a.b.c"]) {
      expect(verifySessionToken(token)).toBeNull();
    }
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken(undefined)).toBeNull();
  });
});

describe("getSessionSecret", () => {
  it("uses SESSION_SECRET when set", () => {
    process.env.SESSION_SECRET = "explicit-secret";
    expect(getSessionSecret()).toBe("explicit-secret");
  });

  it("falls back to the fixed DEV-ONLY secret outside production (with a warning)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    delete process.env.SESSION_SECRET;
    const secret = getSessionSecret();
    expect(secret.length).toBeGreaterThan(0);
    // Tokens created with the fallback still round-trip.
    expect(verifySessionToken(createSessionToken(3))).toEqual({ uid: 3 });
    warn.mockRestore();
  });

  it("fails fast in production without a secret", () => {
    setNodeEnv("production");
    delete process.env.SESSION_SECRET;
    expect(() => getSessionSecret()).toThrow(/SESSION_SECRET/);
    process.env.SESSION_SECRET = "prod-secret";
    expect(getSessionSecret()).toBe("prod-secret");
  });
});
