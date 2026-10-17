// T27 — admin approvals API regression tests (fake Prisma + real signed tokens).
//
// Covers the guard matrix required by the task: ADMIN only (401/403), the
// PENDING-only decide rule (409 `Registration already decided`), the
// self-decide block, `Admin accounts cannot be rejected`, unknown ids (404)
// and that responses never leak `passwordHash`.

import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeUser {
  id: number;
  username: string;
  passwordHash: string;
  role: string;
  status: string;
  createdAt: Date;
  decidedAt: Date | null;
}

vi.mock("next/headers", () => {
  const jar: { token: string | null } = { token: null };
  return {
    __jar: jar,
    cookies: async () => ({
      get: (name: string) =>
        name === "st_session" && jar.token ? { name, value: jar.token } : undefined,
      set: () => {},
      delete: () => {},
    }),
  };
});

vi.mock("@/lib/prisma", () => {
  const state: { users: FakeUser[] } = { users: [] };

  const prisma = {
    __state: state,
    user: {
      findMany: vi.fn(async (args?: { where?: { status?: string } }) =>
        state.users.filter(
          (user) => args?.where?.status === undefined || user.status === args.where.status,
        ),
      ),
      findUnique: vi.fn(
        async (args: { where: { id: number } }) =>
          state.users.find((user) => user.id === args.where.id) ?? null,
      ),
      update: vi.fn(
        async (args: { where: { id: number }; data: Partial<FakeUser> }) => {
          const target = state.users.find((user) => user.id === args.where.id);
          if (!target) throw new Error("User not found");
          Object.assign(target, args.data);
          return target;
        },
      ),
    },
  };

  return { prisma };
});

import * as headersModule from "next/headers";
import { createSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { POST as approve } from "./users/[id]/approve/route";
import { POST as reject } from "./users/[id]/reject/route";
import { GET as listUsers } from "./users/route";

const state = (prisma as unknown as { __state: { users: FakeUser[] } }).__state;
const jar = (headersModule as unknown as { __jar: { token: string | null } }).__jar;

const day = (n: number) => new Date(Date.UTC(2026, 9, n));

function loginAs(userId: number): void {
  jar.token = createSessionToken(userId);
}

const params = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

const approveReq = (id: number) =>
  approve(new Request("http://localhost/api/admin/users/1/approve", { method: "POST" }), params(id) as RouteContext<"/api/admin/users/[id]/approve">);

const rejectReq = (id: number) =>
  reject(new Request("http://localhost/api/admin/users/1/reject", { method: "POST" }), params(id) as RouteContext<"/api/admin/users/[id]/reject">);

beforeEach(() => {
  process.env.SESSION_SECRET = "unit-test-secret";
  state.users = [
    {
      id: 1,
      username: "alice",
      passwordHash: "scrypt$salt$hash",
      role: "ADMIN",
      status: "APPROVED",
      createdAt: day(1),
      decidedAt: day(1),
    },
    {
      id: 2,
      username: "bob",
      passwordHash: "scrypt$salt$hash",
      role: "USER",
      status: "PENDING",
      createdAt: day(2),
      decidedAt: null,
    },
    {
      id: 3,
      username: "carol",
      passwordHash: "scrypt$salt$hash",
      role: "USER",
      status: "REJECTED",
      createdAt: day(3),
      decidedAt: day(4),
    },
    {
      id: 4,
      username: "dave",
      passwordHash: "scrypt$salt$hash",
      role: "ADMIN",
      status: "APPROVED",
      createdAt: day(5),
      decidedAt: day(5),
    },
  ];
  loginAs(1);
});

describe("GET /api/admin/users — access control", () => {
  it("signed out → 401", async () => {
    jar.token = null;
    const res = await listUsers(new Request("http://localhost/api/admin/users"));
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Authentication required" });
  });

  it("pending account → 403 pending message", async () => {
    loginAs(2);
    const res = await listUsers(new Request("http://localhost/api/admin/users"));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Account pending admin approval" });
  });

  it("approved non-admin → 403 Admin access required", async () => {
    state.users[1].status = "APPROVED";
    loginAs(2);
    const res = await listUsers(new Request("http://localhost/api/admin/users"));
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Admin access required" });
  });
});

describe("GET /api/admin/users — listing + filter", () => {
  it("returns all users by default, never the password hash", async () => {
    const res = await listUsers(new Request("http://localhost/api/admin/users"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: number }[];
    expect(body.map((u) => u.id)).toEqual([1, 2, 3, 4]);
    expect(JSON.stringify(body)).not.toContain("passwordHash");
    expect(JSON.stringify(body)).not.toContain("scrypt");
  });

  it("filters by status", async () => {
    const pendingRes = await listUsers(new Request("http://localhost/api/admin/users?status=PENDING"));
    const pending = (await pendingRes.json()) as { id: number }[];
    expect(pending.map((u) => u.id)).toEqual([2]);

    const approvedRes = await listUsers(new Request("http://localhost/api/admin/users?status=APPROVED"));
    const approved = (await approvedRes.json()) as { id: number }[];
    expect(approved.map((u) => u.id)).toEqual([1, 4]);

    const rejectedRes = await listUsers(new Request("http://localhost/api/admin/users?status=REJECTED"));
    const rejected = (await rejectedRes.json()) as { id: number }[];
    expect(rejected.map((u) => u.id)).toEqual([3]);
  });

  it("rejects an unknown status → 400", async () => {
    const res = await listUsers(new Request("http://localhost/api/admin/users?status=BOGUS"));
    expect(res.status).toBe(400);
  });
});

describe("POST approve / reject — decide rule", () => {
  it("approve a PENDING registration → 200 with decidedAt set", async () => {
    const res = await approveReq(2);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { status: string; decidedAt: string | null } };
    expect(body.user.status).toBe("APPROVED");
    expect(body.user.decidedAt).not.toBeNull();
    expect(state.users[1].status).toBe("APPROVED");
  });

  it("reject a PENDING registration → 200 REJECTED", async () => {
    const res = await rejectReq(2);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { status: string } };
    expect(body.user.status).toBe("REJECTED");
    expect(state.users[1].status).toBe("REJECTED");
  });

  it("double-decide → 409 Registration already decided", async () => {
    await approveReq(2);
    const again = await approveReq(2);
    expect(again.status).toBe(409);
    await expect(again.json()).resolves.toEqual({ error: "Registration already decided" });

    const rejectDeclined = await rejectReq(3);
    expect(rejectDeclined.status).toBe(409);
  });

  it("unknown id → 404 User not found", async () => {
    const res = await approveReq(999);
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "User not found" });
  });

  it("invalid id → 400 Invalid user id", async () => {
    const res = await approve(
      new Request("http://localhost/api/admin/users/abc/approve", { method: "POST" }),
      { params: Promise.resolve({ id: "abc" }) } as RouteContext<"/api/admin/users/[id]/approve">,
    );
    expect(res.status).toBe(400);
  });

  it("an admin cannot decide their own account → 400", async () => {
    const res = await approveReq(1);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "You cannot decide your own account" });
  });

  it("an ADMIN account can never be rejected → 400", async () => {
    const res = await rejectReq(4);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Admin accounts cannot be rejected" });
    expect(state.users[3].status).toBe("APPROVED");
  });

  it("non-admin cannot approve → 403", async () => {
    state.users[1].status = "APPROVED";
    loginAs(2);
    const res = await approveReq(1);
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({ error: "Admin access required" });
  });
});
