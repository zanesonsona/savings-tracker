import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentMonth, parseDate, parseMonth } from "@/lib/dates";
import { toSavingsEntryDTO, type SavingsListResponse } from "@/lib/types";
import {
  emptyToNull,
  monthSchema,
  parseCategoryIdsParam,
  savingsCreateSchema,
  zodErrorMessage,
} from "@/lib/validation";

/** Net cents (deposits − withdrawals) for the given filter; negative allowed (D7). */
async function netCents(where: Prisma.SavingsEntryWhereInput = {}): Promise<number> {
  const rows = await prisma.savingsEntry.groupBy({
    by: ["direction"],
    where,
    _sum: { amountCents: true },
  });
  let net = 0;
  for (const row of rows) {
    const sum = row._sum.amountCents ?? 0;
    net += row.direction === "DEPOSIT" ? sum : -sum;
  }
  return net;
}

// GET /api/savings?month=YYYY-MM&categoryIds=1,2,3 → the session account's entries of the
// month (category included, newest first) plus all-time balance (D7) and the month's net.
// `month` defaults to the current UTC month; an optional categoryIds filter (T29, OR)
// narrows the entries AND the month net — the all-time balance stays account-wide.
export async function GET(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const params = new URL(request.url).searchParams;
  const monthParam = params.get("month") ?? currentMonth();
  const categoryIds = parseCategoryIdsParam(params.get("categoryIds"));

  const parsed = monthSchema.safeParse(monthParam);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }
  if (categoryIds === "invalid") {
    return NextResponse.json(
      { error: "categoryIds must be a comma-separated list of positive integers" },
      { status: 400 },
    );
  }
  const { start, end } = parseMonth(parsed.data);
  const monthWhere: Prisma.SavingsEntryWhereInput = {
    userId: auth.user.id,
    date: { gte: start, lt: end },
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
  };

  const [entries, monthNetCents, balanceCents] = await Promise.all([
    prisma.savingsEntry.findMany({
      where: monthWhere,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      include: { category: true },
    }),
    netCents(monthWhere),
    netCents({ userId: auth.user.id }),
  ]);

  const body: SavingsListResponse = {
    entries: entries.map(toSavingsEntryDTO),
    balanceCents,
    monthNetCents,
  };
  return NextResponse.json(body);
}

// POST /api/savings → 201 with the created SavingsEntryDTO.
// Only kind = "SAVINGS" categories may be used (D8); negative balances allowed (D7).
export async function POST(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = savingsCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }
  const { amountCents, direction, date, categoryId, note } = parsed.data;

  // Scoped: a category id from another account behaves like a missing one → 404 (D16).
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId: auth.user.id } });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  if (category.kind !== "SAVINGS") {
    return NextResponse.json(
      { error: "Savings entries need a SAVINGS-kind category (create one in Categories first)" },
      { status: 400 },
    );
  }

  const created = await prisma.savingsEntry.create({
    data: {
      amountCents,
      direction,
      // Stored as UTC midnight (§7 / D13).
      date: parseDate(date),
      note: emptyToNull(note),
      categoryId,
      userId: auth.user.id,
    },
    include: { category: true },
  });

  return NextResponse.json(toSavingsEntryDTO(created), { status: 201 });
}
