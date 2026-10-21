// T26 — per-account data scoping regression tests (fake Prisma, two accounts).
//
// Drives the real route handlers with a fake in-memory Prisma that serves TWO
// accounts (alice = 1, bob = 2) and a real signed `st_session` cookie per
// request, then asserts that neither account can see or touch the other's rows:
//   - list endpoints return only the session account's rows
//   - cross-account ids (categories, entries) behave like missing → 404
//   - the same category name is allowed in two accounts
//   - /api/overview totals are isolated
//   - no session → 401 `Authentication required`
// T29 adds `?categoryIds=` multi-select coverage (OR within the list, empty →
// all, malformed → 400, another account's ids match nothing).

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
}

interface FakeIncome {
  id: number;
  amountCents: number;
  source: string | null;
  date: Date;
  note: string | null;
  createdAt: Date;
  userId: number;
}

interface FakeExpense {
  id: number;
  amountCents: number;
  date: Date;
  note: string | null;
  createdAt: Date;
  userId: number;
  categoryId: number;
}

interface FakeSavings {
  id: number;
  amountCents: number;
  direction: string;
  date: Date;
  note: string | null;
  createdAt: Date;
  userId: number;
  categoryId: number;
}

interface State {
  users: FakeUser[];
  categories: FakeCategory[];
  incomes: FakeIncome[];
  expenses: FakeExpense[];
  savings: FakeSavings[];
  nextId: number;
}

type Where = Record<string, unknown>;
type Args = { where?: Where; include?: unknown };

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
  const state: State = {
    users: [],
    categories: [],
    incomes: [],
    expenses: [],
    savings: [],
    nextId: 1,
  };

  const matches = (row: object, where?: Where): boolean => {
    if (!where) return true;
    const record = row as Record<string, unknown>;
    return Object.entries(where).every(([key, cond]) => {
      const value = record[key];
      if (cond !== null && typeof cond === "object") {
        const c = cond as { gte?: Date; lt?: Date; not?: unknown; in?: unknown[] };
        if (c.gte !== undefined && !(value instanceof Date && value >= c.gte)) return false;
        if (c.lt !== undefined && !(value instanceof Date && value < c.lt)) return false;
        if ("not" in c && value === c.not) return false;
        if ("in" in c && Array.isArray(c.in) && !c.in.includes(value)) return false;
        return true;
      }
      return value === cond;
    });
  };

  const withCategory = <T extends { categoryId: number }>(row: T, include?: unknown) =>
    include
      ? { ...row, category: state.categories.find((c) => c.id === row.categoryId) ?? null }
      : row;

  const withCounts = <T extends { id: number }>(row: T, include?: unknown) =>
    include
      ? {
          ...row,
          _count: {
            expenses: state.expenses.filter((e) => e.categoryId === row.id).length,
            savingsEntries: state.savings.filter((s) => s.categoryId === row.id).length,
          },
        }
      : row;

  function resource<TRow extends { id: number }>(
    table: () => TRow[],
    decorate?: (row: TRow, include?: unknown) => object,
  ) {
    return {
      findMany: vi.fn(async (args?: Args) =>
        table()
          .filter((row) => matches(row, args?.where))
          .map((row) => (decorate ? decorate(row, args?.include) : row)),
      ),
      findFirst: vi.fn(async (args: Args) => {
        const found = table().find((row) => matches(row, args.where));
        return found ? (decorate ? decorate(found, args.include) : found) : null;
      }),
      create: vi.fn(async (args: { data: Record<string, unknown>; include?: unknown }) => {
        const created = {
          id: state.nextId++,
          createdAt: new Date("2026-10-17T00:00:00.000Z"),
          ...args.data,
        } as unknown as TRow;
        table().push(created);
        return decorate ? decorate(created, args.include) : created;
      }),
      aggregate: vi.fn(async (args?: Args) => ({
        _sum: {
          amountCents: table()
            .filter((row) => matches(row, args?.where))
            .reduce(
              (sum, row) =>
                sum + ((row as unknown as { amountCents?: number }).amountCents ?? 0),
              0,
            ),
        },
      })),
      delete: vi.fn(async (args: { where: { id: number } }) => {
        const rows = table();
        const index = rows.findIndex((row) => row.id === args.where.id);
        const [removed] = rows.splice(index, 1);
        return removed;
      }),
    };
  }

  const prisma = {
    __state: state,
    user: {
      findUnique: vi.fn(
        async (args: { where: { id: number } }) =>
          state.users.find((u) => u.id === args.where.id) ?? null,
      ),
    },
    category: {
      ...resource(() => state.categories, withCounts),
      update: vi.fn(
        async (args: { where: { id: number }; data: Record<string, unknown> }) => {
          const target = state.categories.find((c) => c.id === args.where.id);
          if (!target) throw new Error("Category not found");
          Object.assign(target, args.data);
          return withCounts(target, true);
        },
      ),
    },
    income: resource(() => state.incomes),
    expense: resource(() => state.expenses, withCategory),
    savingsEntry: {
      ...resource(() => state.savings, withCategory),
      groupBy: vi.fn(async (args: { by: string[]; where?: Where }) => {
        const key = args.by[0];
        const rows = state.savings.filter((row) => matches(row, args.where));
        const record = (row: object) => row as Record<string, unknown>;
        const keys = [...new Set(rows.map((row) => record(row)[key]))];
        return keys.map((k) => ({
          [key]: k,
          _sum: {
            amountCents: rows
              .filter((row) => record(row)[key] === k)
              .reduce((sum, row) => sum + row.amountCents, 0),
          },
        }));
      }),
    },
  };

  return { prisma };
});

import * as headersModule from "next/headers";
import { createSessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DELETE as deleteCategory, PATCH as patchCategory } from "./categories/[id]/route";
import { GET as listCategories, POST as postCategory } from "./categories/route";
import { GET as listExpenses, POST as postExpense } from "./expenses/route";
import { DELETE as deleteExpense } from "./expenses/[id]/route";
import { GET as listIncomes } from "./incomes/route";
import { DELETE as deleteIncome } from "./incomes/[id]/route";
import { GET as getOverview } from "./overview/route";
import { GET as listSavings, POST as postSavings } from "./savings/route";
import { DELETE as deleteSavings } from "./savings/[id]/route";

const state = (prisma as unknown as { __state: State }).__state;
const jar = (headersModule as unknown as { __jar: { token: string | null } }).__jar;

const CT = { "Content-Type": "application/json" };
const MONTH = "2026-10";
const day = (n: number) => new Date(Date.UTC(2026, 9, n));

function loginAs(userId: number): void {
  jar.token = createSessionToken(userId);
}

function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: CT,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const params = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

function seedTwoAccounts(): void {
  state.nextId = 100;
  state.users = [
    { id: 1, username: "alice", role: "USER", status: "APPROVED" },
    { id: 2, username: "bob", role: "USER", status: "APPROVED" },
  ];
  state.categories = [
    { id: 11, name: "A-Bills", percentage: 100, kind: "EXPENSE", color: null, createdAt: day(1), userId: 1 },
    { id: 12, name: "A-Save", percentage: 0, kind: "SAVINGS", color: null, createdAt: day(1), userId: 1 },
    { id: 13, name: "A-Fun", percentage: 0, kind: "EXPENSE", color: null, createdAt: day(1), userId: 1 },
    { id: 21, name: "B-Bills", percentage: 100, kind: "EXPENSE", color: null, createdAt: day(1), userId: 2 },
    { id: 22, name: "B-Save", percentage: 0, kind: "SAVINGS", color: null, createdAt: day(1), userId: 2 },
  ];
  state.incomes = [
    { id: 31, amountCents: 10000, source: "A pay", date: day(5), note: null, createdAt: day(5), userId: 1 },
    { id: 41, amountCents: 20000, source: "B pay", date: day(5), note: null, createdAt: day(5), userId: 2 },
  ];
  state.expenses = [
    { id: 51, amountCents: 3000, date: day(6), note: "A spend", createdAt: day(6), userId: 1, categoryId: 11 },
    { id: 52, amountCents: 500, date: day(6), note: "A fun", createdAt: day(6), userId: 1, categoryId: 13 },
    { id: 61, amountCents: 7000, date: day(6), note: "B spend", createdAt: day(6), userId: 2, categoryId: 21 },
  ];
  state.savings = [
    { id: 71, amountCents: 5000, direction: "DEPOSIT", date: day(7), note: null, createdAt: day(7), userId: 1, categoryId: 12 },
    { id: 81, amountCents: 2000, direction: "DEPOSIT", date: day(7), note: null, createdAt: day(7), userId: 2, categoryId: 22 },
  ];
}

beforeEach(() => {
  process.env.SESSION_SECRET = "unit-test-secret";
  seedTwoAccounts();
  loginAs(1);
});

describe("session guard", () => {
  it("list endpoints without a session → 401 Authentication required", async () => {
    jar.token = null;
    for (const handler of [listIncomes, listExpenses, listSavings, listCategories, getOverview]) {
      const res = await handler(jsonRequest("/api/x", "GET"));
      expect(res.status).toBe(401);
      await expect(res.json()).resolves.toEqual({ error: "Authentication required" });
    }
  });
});

describe("list endpoints are scoped to the session account", () => {
  it("incomes", async () => {
    const res = await listIncomes(jsonRequest("/api/incomes", "GET"));
    const body = (await res.json()) as { id: number; amountCents: number }[];
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(31);
  });

  it("expenses (category included)", async () => {
    const res = await listExpenses(jsonRequest("/api/expenses", "GET"));
    const body = (await res.json()) as { id: number; category: { id: number } }[];
    expect(body.map((e) => e.id)).toEqual([51, 52]);
    expect(body[0].category.id).toBe(11);

    loginAs(2);
    const resB = await listExpenses(jsonRequest("/api/expenses", "GET"));
    const bodyB = (await resB.json()) as { id: number }[];
    expect(bodyB.map((e) => e.id)).toEqual([61]);
  });

  it("savings list + all-time balance", async () => {
    const resA = await listSavings(jsonRequest("/api/savings", "GET"));
    const bodyA = (await resA.json()) as { entries: { id: number }[]; balanceCents: number };
    expect(bodyA.entries.map((e) => e.id)).toEqual([71]);
    expect(bodyA.balanceCents).toBe(5000);

    loginAs(2);
    const resB = await listSavings(jsonRequest(`/api/savings?month=${MONTH}`, "GET"));
    const bodyB = (await resB.json()) as { entries: { id: number }[]; balanceCents: number };
    expect(bodyB.entries.map((e) => e.id)).toEqual([81]);
    expect(bodyB.balanceCents).toBe(2000);
  });

  it("categories (usage counts included)", async () => {
    const res = await listCategories();
    const body = (await res.json()) as { id: number; expenseCount: number }[];
    expect(body.map((c) => c.id)).toEqual([11, 12, 13]);
    expect(body.find((c) => c.id === 11)?.expenseCount).toBe(1);
  });
});

describe("cross-account ids behave like missing (404)", () => {
  it("entries: another account's rows cannot be deleted", async () => {
    const income = await deleteIncome(
      jsonRequest("/api/incomes/41", "DELETE"),
      params(41) as RouteContext<"/api/incomes/[id]">,
    );
    expect(income.status).toBe(404);
    await expect(income.json()).resolves.toEqual({ error: "Income not found" });

    const expense = await deleteExpense(
      jsonRequest("/api/expenses/61", "DELETE"),
      params(61) as RouteContext<"/api/expenses/[id]">,
    );
    expect(expense.status).toBe(404);

    const savings = await deleteSavings(
      jsonRequest("/api/savings/81", "DELETE"),
      params(81) as RouteContext<"/api/savings/[id]">,
    );
    expect(savings.status).toBe(404);

    expect(state.incomes).toHaveLength(2);
    expect(state.expenses).toHaveLength(3);
    expect(state.savings).toHaveLength(2);
  });

  it("categories: another account's row cannot be patched or deleted", async () => {
    const patched = await patchCategory(
      jsonRequest("/api/categories/21", "PATCH", { percentage: 10 }),
      params(21) as RouteContext<"/api/categories/[id]">,
    );
    expect(patched.status).toBe(404);

    const deleted = await deleteCategory(
      jsonRequest("/api/categories/21", "DELETE"),
      params(21) as RouteContext<"/api/categories/[id]">,
    );
    expect(deleted.status).toBe(404);
    expect(state.categories.find((c) => c.id === 21)?.percentage).toBe(100);
  });

  it("entries: another account's categoryId is rejected on create", async () => {
    const expense = await postExpense(
      jsonRequest("/api/expenses", "POST", { amountCents: 1000, date: `${MONTH}-10`, categoryId: 21 }),
    );
    expect(expense.status).toBe(404);
    await expect(expense.json()).resolves.toEqual({ error: "Category not found" });

    const savings = await postSavings(
      jsonRequest("/api/savings", "POST", { amountCents: 1000, direction: "DEPOSIT", date: `${MONTH}-10`, categoryId: 22 }),
    );
    expect(savings.status).toBe(404);
  });

  it("own rows still work (control)", async () => {
    const expense = await postExpense(
      jsonRequest("/api/expenses", "POST", { amountCents: 1000, date: `${MONTH}-10`, categoryId: 11 }),
    );
    expect(expense.status).toBe(201);
    const created = (await expense.json()) as { userId?: number };
    expect(created.userId).toBeUndefined(); // DTO never leaks ownership
    expect(state.expenses.at(-1)?.userId).toBe(1);
  });
});

describe("?categoryIds= multi-select filter (T29)", () => {
  it("expenses: OR within the list; empty → all; unknown → none; malformed → 400", async () => {
    const both = await listExpenses(jsonRequest("/api/expenses?categoryIds=11,13", "GET"));
    const bothBody = (await both.json()) as { id: number }[];
    expect(bothBody.map((e) => e.id)).toEqual([51, 52]);

    const one = await listExpenses(jsonRequest("/api/expenses?categoryIds=13", "GET"));
    const oneBody = (await one.json()) as { id: number }[];
    expect(oneBody.map((e) => e.id)).toEqual([52]);

    const empty = await listExpenses(jsonRequest("/api/expenses?categoryIds=", "GET"));
    expect(((await empty.json()) as unknown[]).length).toBe(2);

    const unknown = await listExpenses(jsonRequest("/api/expenses?categoryIds=999", "GET"));
    expect(((await unknown.json()) as unknown[]).length).toBe(0);

    const malformed = await listExpenses(jsonRequest("/api/expenses?categoryIds=abc", "GET"));
    expect(malformed.status).toBe(400);
    await expect(malformed.json()).resolves.toEqual({
      error: "categoryIds must be a comma-separated list of positive integers",
    });
  });

  it("expenses: another account's id matches nothing (no cross-account peek)", async () => {
    const res = await listExpenses(jsonRequest("/api/expenses?categoryIds=21", "GET"));
    expect(res.status).toBe(200);
    expect(((await res.json()) as unknown[]).length).toBe(0);
  });

  it("savings: the filter narrows entries and the month net; the balance stays account-wide", async () => {
    const created = await postCategory(
      jsonRequest("/api/categories", "POST", { name: "A-Trip", percentage: 0, kind: "SAVINGS" }),
    );
    const category = (await created.json()) as { id: number };
    const posted = await postSavings(
      jsonRequest("/api/savings", "POST", {
        amountCents: 3000,
        direction: "DEPOSIT",
        date: `${MONTH}-08`,
        categoryId: category.id,
      }),
    );
    expect(posted.status).toBe(201);
    const tripEntryId = state.savings.at(-1)?.id;

    const filtered = await listSavings(
      jsonRequest(`/api/savings?month=${MONTH}&categoryIds=${category.id}`, "GET"),
    );
    const body = (await filtered.json()) as {
      entries: { id: number }[];
      monthNetCents: number;
      balanceCents: number;
    };
    expect(body.entries.map((e) => e.id)).toEqual([tripEntryId]);
    expect(body.monthNetCents).toBe(3000);
    expect(body.balanceCents).toBe(8000); // account-wide: 5000 + 3000

    const malformed = await listSavings(
      jsonRequest(`/api/savings?month=${MONTH}&categoryIds=1,,2`, "GET"),
    );
    expect(malformed.status).toBe(400);
  });
});

describe("category names may repeat across accounts, never within one", () => {
  it("the same name is creatable in both accounts", async () => {
    loginAs(1);
    const a = await postCategory(jsonRequest("/api/categories", "POST", { name: "Shared", percentage: 0 }));
    expect(a.status).toBe(201);

    loginAs(2);
    const b = await postCategory(jsonRequest("/api/categories", "POST", { name: "Shared", percentage: 0 }));
    expect(b.status).toBe(201);

    loginAs(1);
    const aAgain = await postCategory(jsonRequest("/api/categories", "POST", { name: "Shared", percentage: 0 }));
    expect(aAgain.status).toBe(409);
  });
});

describe("/api/overview is isolated per account", () => {
  it("alice sees only her totals", async () => {
    const res = await getOverview(jsonRequest(`/api/overview?month=${MONTH}`, "GET"));
    const body = (await res.json()) as {
      incomeTotalCents: number;
      totals: { spentCents: number; netSavedCents: number };
      walletBalanceCents: number;
      savingsBalanceCents: number;
      categories: { id: number }[];
    };
    expect(body.incomeTotalCents).toBe(10000);
    expect(body.totals.spentCents).toBe(3500);
    expect(body.totals.netSavedCents).toBe(5000);
    expect(body.walletBalanceCents).toBe(1500); // 10000 − 3500 − 5000 (T28, per account)
    expect(body.savingsBalanceCents).toBe(5000);
    expect(body.categories.map((c) => c.id).sort()).toEqual([11, 12, 13]);
  });

  it("bob sees only his totals", async () => {
    loginAs(2);
    const res = await getOverview(jsonRequest(`/api/overview?month=${MONTH}`, "GET"));
    const body = (await res.json()) as {
      incomeTotalCents: number;
      totals: { spentCents: number; netSavedCents: number };
      walletBalanceCents: number;
      savingsBalanceCents: number;
    };
    expect(body.incomeTotalCents).toBe(20000);
    expect(body.totals.spentCents).toBe(7000);
    expect(body.totals.netSavedCents).toBe(2000);
    expect(body.walletBalanceCents).toBe(11000); // 20000 − 7000 − 2000
    expect(body.savingsBalanceCents).toBe(2000);
  });
});

describe("/api/overview?trend=N (T36/D25)", () => {
  const at = (year: number, monthIndex: number, dayOfMonth: number) =>
    new Date(Date.UTC(year, monthIndex, dayOfMonth));

  function seedTrendData(): void {
    state.incomes = [
      { id: 101, amountCents: 1000, source: null, date: at(2025, 11, 15), note: null, createdAt: at(2025, 11, 15), userId: 1 },
      { id: 102, amountCents: 2000, source: null, date: at(2026, 0, 15), note: null, createdAt: at(2026, 0, 15), userId: 1 },
      { id: 103, amountCents: 3000, source: null, date: at(2026, 1, 15), note: null, createdAt: at(2026, 1, 15), userId: 1 },
      // Bob's January income must never leak into Alice's trend.
      { id: 104, amountCents: 9999, source: null, date: at(2026, 0, 15), note: null, createdAt: at(2026, 0, 15), userId: 2 },
    ];
    state.expenses = [
      { id: 111, amountCents: 100, date: at(2025, 11, 20), note: null, createdAt: at(2025, 11, 20), userId: 1, categoryId: 11 },
      { id: 112, amountCents: 500, date: at(2026, 1, 20), note: null, createdAt: at(2026, 1, 20), userId: 1, categoryId: 11 },
      { id: 113, amountCents: 777, date: at(2026, 0, 20), note: null, createdAt: at(2026, 0, 20), userId: 2, categoryId: 21 },
    ];
    state.savings = [
      { id: 121, amountCents: 300, direction: "DEPOSIT", date: at(2025, 11, 21), note: null, createdAt: at(2025, 11, 21), userId: 1, categoryId: 12 },
      { id: 122, amountCents: 100, direction: "WITHDRAWAL", date: at(2026, 0, 21), note: null, createdAt: at(2026, 0, 21), userId: 1, categoryId: 12 },
      { id: 123, amountCents: 700, direction: "DEPOSIT", date: at(2026, 1, 21), note: null, createdAt: at(2026, 1, 21), userId: 1, categoryId: 12 },
      { id: 124, amountCents: 888, direction: "DEPOSIT", date: at(2026, 0, 21), note: null, createdAt: at(2026, 0, 21), userId: 2, categoryId: 22 },
    ];
  }

  it("returns N buckets ending at the selected month, oldest first, zero-filled", async () => {
    seedTrendData();
    const res = await getOverview(jsonRequest("/api/overview?month=2026-02&trend=3", "GET"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      month: string;
      incomeTotalCents: number;
      totals: { spentCents: number; netSavedCents: number };
      trend?: { month: string; incomeTotalCents: number; spentCents: number; netSavedCents: number }[];
    };

    expect(body.month).toBe("2026-02");
    expect(body.trend).toEqual([
      { month: "2025-12", incomeTotalCents: 1000, spentCents: 100, netSavedCents: 300 },
      { month: "2026-01", incomeTotalCents: 2000, spentCents: 0, netSavedCents: -100 },
      { month: "2026-02", incomeTotalCents: 3000, spentCents: 500, netSavedCents: 700 },
    ]);
    // Existing month payload still reconciles with the last trend bucket.
    expect(body.incomeTotalCents).toBe(3000);
    expect(body.totals).toEqual({ spentCents: 500, netSavedCents: 700 });
  });

  it("trend=1 returns just the selected month; another account stays isolated", async () => {
    seedTrendData();
    const own = await getOverview(jsonRequest("/api/overview?month=2026-01&trend=1", "GET"));
    const ownBody = (await own.json()) as {
      trend?: { month: string; incomeTotalCents: number; spentCents: number; netSavedCents: number }[];
    };
    expect(ownBody.trend).toEqual([
      { month: "2026-01", incomeTotalCents: 2000, spentCents: 0, netSavedCents: -100 },
    ]);

    loginAs(2);
    const other = await getOverview(jsonRequest("/api/overview?month=2026-01&trend=1", "GET"));
    const otherBody = (await other.json()) as {
      trend?: { month: string; incomeTotalCents: number; spentCents: number; netSavedCents: number }[];
    };
    expect(otherBody.trend).toEqual([
      { month: "2026-01", incomeTotalCents: 9999, spentCents: 777, netSavedCents: 888 },
    ]);
  });

  it("rejects malformed or out-of-range N with 400", async () => {
    for (const bad of ["0", "13", "abc", "1.5", "-1", ""]) {
      const res = await getOverview(jsonRequest(`/api/overview?month=${MONTH}&trend=${bad}`, "GET"));
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        error: "trend must be an integer between 1 and 12",
      });
    }
  });

  it("omits `trend` entirely when the parameter is absent (backward compatible)", async () => {
    const res = await getOverview(jsonRequest(`/api/overview?month=${MONTH}`, "GET"));
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).not.toHaveProperty("trend");
  });
});
