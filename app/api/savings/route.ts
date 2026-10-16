import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { currentMonth, parseDate, parseMonth } from "@/lib/dates";
import { toSavingsEntryDTO, type SavingsListResponse } from "@/lib/types";
import {
  emptyToNull,
  monthSchema,
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

// GET /api/savings?month=YYYY-MM → entries of the month (category included, newest first)
// plus all-time balance (D7) and the month's net. `month` defaults to the current UTC month.
export async function GET(request: Request) {
  const monthParam = new URL(request.url).searchParams.get("month") ?? currentMonth();

  const parsed = monthSchema.safeParse(monthParam);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }
  const { start, end } = parseMonth(parsed.data);
  const monthWhere: Prisma.SavingsEntryWhereInput = { date: { gte: start, lt: end } };

  const [entries, monthNetCents, balanceCents] = await Promise.all([
    prisma.savingsEntry.findMany({
      where: monthWhere,
      orderBy: [{ date: "desc" }, { id: "desc" }],
      include: { category: true },
    }),
    netCents(monthWhere),
    netCents(),
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

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
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
    },
    include: { category: true },
  });

  return NextResponse.json(toSavingsEntryDTO(created), { status: 201 });
}
