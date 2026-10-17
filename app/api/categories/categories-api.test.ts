// Regression tests for the two defects found by QA in T16:
//   BUG-QA-01 — Σ% guard accepted 100.01% (allocations > income; D5).
//   BUG-QA-02 — kind change on a used category silently dropped entries (D8).
//
// T26 update: the routes now require a session and scope everything to the
// session account, so the fake Prisma also serves `user.findUnique` and the
// mocked cookie jar below hands out a real signed `st_session` token (user 1).
//
// The route handlers are imported directly and driven with a fake in-memory
// Prisma so the HTTP boundary (status codes + error messages) is exercised
// without touching the real SQLite database.

import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeUser {
  id: number;
  username: string;
  role: string;
  status: string;
}

interface FakeCategory {
  id: number;
  name: string;
  percentage: number;
  kind: string;
  color: string | null;
  createdAt: Date;
  userId: number;
  _count: { expenses: number; savingsEntries: number };
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
  const state: { users: FakeUser[]; categories: FakeCategory[]; nextId: number } = {
    users: [],
    categories: [],
    nextId: 1,
  };

  const matches = (c: FakeCategory, where?: { userId?: number; id?: { not?: number } }) =>
    (where?.userId === undefined || c.userId === where.userId) &&
    (where?.id?.not === undefined || c.id !== where.id.not);

  const prisma = {
    __state: state,
    user: {
      findUnique: vi.fn(
        async (args: { where: { id: number } }) =>
          state.users.find((u) => u.id === args.where.id) ?? null,
      ),
    },
    category: {
      findMany: vi.fn(async (args?: { where?: { userId?: number; id?: { not?: number } } }) =>
        state.categories.filter((c) => matches(c, args?.where)),
      ),
      findFirst: vi.fn(
        async (args: { where: { id: number; userId?: number } }) =>
          state.categories.find(
            (c) =>
              c.id === args.where.id &&
              (args.where.userId === undefined || c.userId === args.where.userId),
          ) ?? null,
      ),
      create: vi.fn(
        async (args: {
          data: { name: string; percentage: number; kind: string; color?: string | null; userId: number };
        }) => {
          const created: FakeCategory = {
            id: state.nextId++,
            name: args.data.name,
            percentage: args.data.percentage,
            kind: args.data.kind,
            color: args.data.color ?? null,
            createdAt: new Date("2026-10-17T00:00:00.000Z"),
            userId: args.data.userId,
            _count: { expenses: 0, savingsEntries: 0 },
          };
          state.categories.push(created);
          return created;
        },
      ),
      update: vi.fn(
        async (args: { where: { id: number }; data: Partial<FakeCategory> }) => {
          const target = state.categories.find((c) => c.id === args.where.id);
          if (!target) throw new Error("Category not found");
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
import { PATCH } from "./[id]/route";
import { POST } from "./route";

const state = (
  prisma as unknown as {
    __state: { users: FakeUser[]; categories: FakeCategory[]; nextId: number };
  }
).__state;

const jar = (headersModule as unknown as { __jar: { token: string | null } }).__jar;

type Seed = Omit<FakeCategory, "color" | "createdAt" | "_count" | "userId"> & {
  counts?: { expenses?: number; savingsEntries?: number };
  userId?: number;
};

function seedCategories(entries: Seed[]): void {
  state.categories = entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    percentage: entry.percentage,
    kind: entry.kind,
    color: null,
    createdAt: new Date("2026-10-17T00:00:00.000Z"),
    userId: entry.userId ?? 1,
    _count: {
      expenses: entry.counts?.expenses ?? 0,
      savingsEntries: entry.counts?.savingsEntries ?? 0,
    },
  }));
}

function post(body: unknown): ReturnType<typeof POST> {
  return POST(
    new Request("http://localhost/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function patch(id: number, body: unknown): ReturnType<typeof PATCH> {
  return PATCH(
    new Request(`http://localhost/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: String(id) }) } as RouteContext<"/api/categories/[id]">,
  );
}

beforeEach(() => {
  process.env.SESSION_SECRET = "unit-test-secret";
  state.nextId = 100;
  state.categories = [];
  state.users = [{ id: 1, username: "alice", role: "USER", status: "APPROVED" }];
  jar.token = createSessionToken(1);
});

describe("session guard (T26)", () => {
  it("POST without a session → 401 Authentication required", async () => {
    jar.token = null;
    const res = await post({ name: "X", percentage: 10 });
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "Authentication required" });
  });

  it("PATCH without a session → 401 Authentication required", async () => {
    jar.token = null;
    seedCategories([{ id: 1, name: "Bills", percentage: 35, kind: "EXPENSE" }]);
    const res = await patch(1, { percentage: 30 });
    expect(res.status).toBe(401);
  });
});

describe("BUG-QA-01 regression — Σ% must stay ≤ 100.00", () => {
  it("POST 0.01% while Σ = 100% → 400 (would be 100.01%)", async () => {
    seedCategories([
      { id: 1, name: "Bills", percentage: 35, kind: "EXPENSE" },
      { id: 2, name: "Needs", percentage: 25, kind: "EXPENSE" },
      { id: 3, name: "Debts", percentage: 20, kind: "EXPENSE" },
      { id: 4, name: "Savings", percentage: 20, kind: "SAVINGS" },
    ]);

    const res = await post({ name: "Overflow", percentage: 0.01 });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Total allocation cannot exceed 100% (would be 100.01%)",
    });
    expect(state.categories).toHaveLength(4);
  });

  it("POST 0.01% while Σ = 99.99% → 201 (boundary still allowed)", async () => {
    seedCategories([{ id: 1, name: "Almost", percentage: 99.99, kind: "EXPENSE" }]);

    const res = await post({ name: "Last", percentage: 0.01 });

    expect(res.status).toBe(201);
    expect(state.categories).toHaveLength(2);
  });

  it("weighs only the session account's categories (another account's 100% is irrelevant)", async () => {
    seedCategories([
      { id: 1, name: "Theirs", percentage: 100, kind: "EXPENSE", userId: 2 },
      { id: 2, name: "Ours", percentage: 40, kind: "EXPENSE", userId: 1 },
    ]);

    const res = await post({ name: "Extra", percentage: 60 });

    expect(res.status).toBe(201); // 40 + 60 = 100 (user 2's row ignored)
  });

  it("PATCH to a 100.01% total → 400", async () => {
    seedCategories([
      { id: 1, name: "Bills", percentage: 80, kind: "EXPENSE" },
      { id: 2, name: "Needs", percentage: 20, kind: "EXPENSE" },
    ]);

    const res = await patch(2, { percentage: 20.01 });

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      error: "Total allocation cannot exceed 100% (would be 100.01%)",
    });
  });

  it("PATCH staying at exactly Σ = 100.00% → 200", async () => {
    seedCategories([
      { id: 1, name: "Bills", percentage: 80, kind: "EXPENSE" },
      { id: 2, name: "Needs", percentage: 20, kind: "EXPENSE" },
    ]);

    const res = await patch(2, { percentage: 20 });

    expect(res.status).toBe(200);
  });
});

describe("BUG-QA-02 regression — kind changes blocked while entries exist", () => {
  it("EXPENSE with an expense → kind SAVINGS → 409 and the entry stays EXPENSE", async () => {
    seedCategories([
      { id: 1, name: "Bills", percentage: 35, kind: "EXPENSE", counts: { expenses: 1 } },
    ]);

    const res = await patch(1, { kind: "SAVINGS" });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "Cannot change kind: this category has 1 expense(s) — delete them first",
    });
    expect(state.categories[0].kind).toBe("EXPENSE");
  });

  it("SAVINGS with savings entries → kind EXPENSE → 409", async () => {
    seedCategories([
      {
        id: 2,
        name: "Fund",
        percentage: 20,
        kind: "SAVINGS",
        counts: { savingsEntries: 2 },
      },
    ]);

    const res = await patch(2, { kind: "EXPENSE" });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "Cannot change kind: this category has 2 savings entry(ies) — delete them first",
    });
    expect(state.categories[0].kind).toBe("SAVINGS");
  });

  it("kind change with no entries → 200", async () => {
    seedCategories([{ id: 3, name: "Fun", percentage: 5, kind: "EXPENSE" }]);

    const res = await patch(3, { kind: "SAVINGS" });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { kind: string };
    expect(body.kind).toBe("SAVINGS");
    expect(state.categories[0].kind).toBe("SAVINGS");
  });

  it("name/percentage/color edits still work on a used category", async () => {
    seedCategories([
      { id: 4, name: "Bills", percentage: 35, kind: "EXPENSE", counts: { expenses: 3 } },
    ]);

    const res = await patch(4, { name: "Bills 2", percentage: 30, color: "#112233" });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string; percentage: number; color: string };
    expect(body.name).toBe("Bills 2");
    expect(body.percentage).toBe(30);
    expect(body.color).toBe("#112233");
  });
});

describe("ownership (T26)", () => {
  it("PATCH another account's category → 404 (indistinguishable from missing)", async () => {
    seedCategories([{ id: 9, name: "Theirs", percentage: 50, kind: "EXPENSE", userId: 2 }]);

    const res = await patch(9, { percentage: 10 });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Category not found" });
    expect(state.categories[0].percentage).toBe(50);
  });

  it("duplicate names are checked within the session account only", async () => {
    seedCategories([{ id: 5, name: "Shared", percentage: 10, kind: "EXPENSE", userId: 2 }]);

    // User 2's "Shared" must not block user 1 from using the same name.
    const res = await post({ name: "Shared", percentage: 10 });

    expect(res.status).toBe(201);
  });
});
