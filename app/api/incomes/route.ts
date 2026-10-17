import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseDate, parseMonth } from "@/lib/dates";
import { toIncomeDTO } from "@/lib/types";
import {
  emptyToNull,
  incomeCreateSchema,
  monthSchema,
  zodErrorMessage,
} from "@/lib/validation";

// GET /api/incomes → the session account's IncomeDTO[], newest first; optional ?month= filter (§7).
export async function GET(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const monthParam = new URL(request.url).searchParams.get("month");
  const where: Prisma.IncomeWhereInput = { userId: auth.user.id };

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
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

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
      userId: auth.user.id,
    },
  });

  return NextResponse.json(toIncomeDTO(created), { status: 201 });
}
