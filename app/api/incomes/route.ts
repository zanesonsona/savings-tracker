import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDate, parseMonth } from "@/lib/dates";
import { toIncomeDTO } from "@/lib/types";
import {
  emptyToNull,
  incomeCreateSchema,
  monthSchema,
  zodErrorMessage,
} from "@/lib/validation";

// GET /api/incomes → IncomeDTO[], newest first; optional ?month=YYYY-MM filter (§7).
export async function GET(request: Request) {
  const monthParam = new URL(request.url).searchParams.get("month");
  const where: Prisma.IncomeWhereInput = {};

  if (monthParam !== null) {
    const parsed = monthSchema.safeParse(monthParam);
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
    }
    const { start, end } = parseMonth(parsed.data);
    where.date = { gte: start, lt: end };
  }

  const incomes = await prisma.income.findMany({
    where,
    orderBy: [{ date: "desc" }, { id: "desc" }],
  });

  return NextResponse.json(incomes.map(toIncomeDTO));
}

// POST /api/incomes → 201 with the created IncomeDTO.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = incomeCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }
  const { amountCents, source, date, note } = parsed.data;

  const created = await prisma.income.create({
    data: {
      amountCents,
      source: emptyToNull(source),
      // Stored as UTC midnight (§7 / D13).
      date: parseDate(date),
      note: emptyToNull(note),
    },
  });

  return NextResponse.json(toIncomeDTO(created), { status: 201 });
}
