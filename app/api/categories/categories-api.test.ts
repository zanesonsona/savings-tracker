// Regression tests for the two defects found by QA in T16:
//   BUG-QA-01 — Σ% guard accepted 100.01% (allocations > income; D5).
//   BUG-QA-02 — kind change on a used category silently dropped entries (D8).
//
// The route handlers are imported directly and driven with a fake in-memory
// Prisma so the HTTP boundary (status codes + error messages) is exercised
// without touching the real SQLite database.

import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeCategory {
  id: number;
  name: string;
  percentage: number;
  kind: string;
  color: string | null;
  createdAt: Date;
  _count: { expenses: number; savingsEntries: number };
}

vi.mock("@/lib/prisma", () => {
  const state: { categories: FakeCategory[]; nextId: number } = { categories: [], nextId: 1 };

  const prisma = {
    __state: state,
    category: {
      findMany: vi.fn(async (args?: { where?: { id?: { not?: number } } }) =>
        state.categories.filter((c) => c.id !== args?.where?.id?.not),
      ),
      findUnique: vi.fn(
        async (args: { where: { id: number } }) =>
          state.categories.find((c) => c.id === args.where.id) ?? null,
      ),
      create: vi.fn(
        async (args: {
          data: { name: string; percentage: number; kind: string; color?: string | null };
        }) => {
          const created: FakeCategory = {
            id: state.nextId++,
            name: args.data.name,
            percentage: args.data.percentage,
            kind: args.data.kind,
            color: args.data.color ?? null,
            createdAt: new Date("2026-10-17T00:00:00.000Z"),
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

import { PATCH } from "./[id]/route";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";

const state = (prisma as unknown as { __state: { categories: FakeCategory[]; nextId: number } })
  .__state;

type Seed = Omit<FakeCategory, "color" | "createdAt" | "_count"> & {
  counts?: { expenses?: number; savingsEntries?: number };
};

function seedCategories(entries: Seed[]): void {
  state.categories = entries.map((entry) => ({
    id: entry.id,
    name: entry.name,
    percentage: entry.percentage,
    kind: entry.kind,
    color: null,
    createdAt: new Date("2026-10-17T00:00:00.000Z"),
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
  state.nextId = 100;
  state.categories = [];
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
