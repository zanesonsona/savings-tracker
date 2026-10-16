import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseDate, parseMonth } from "@/lib/dates";
import { toExpenseDTO } from "@/lib/types";
import {
  emptyToNull,
  expenseCreateSchema,
  monthSchema,
  parseIdParam,
  zodErrorMessage,
} from "@/lib/validation";

// GET /api/expenses → ExpenseDTO[] (category included), newest first;
// optional ?month=YYYY-MM and ?categoryId= filters (they combine).
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const monthParam = params.get("month");
  const categoryIdParam = params.get("categoryId");
  const where: Prisma.ExpenseWhereInput = {};

  if (monthParam !== null) {
    const parsed = monthSchema.safeParse(monthParam);
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
    }
    const { start, end } = parseMonth(parsed.data);
    where.date = { gte: start, lt: end };
  }

  if (categoryIdParam !== null) {
    const categoryId = parseIdParam(categoryIdParam);
    if (categoryId === null) {
      return NextResponse.json({ error: "Invalid categoryId" }, { status: 400 });
    }
    where.categoryId = categoryId;
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: [{ date: "desc" }, { id: "desc" }],
    include: { category: true },
  });

  return NextResponse.json(expenses.map(toExpenseDTO));
}

// POST /api/expenses → 201 with the created ExpenseDTO.
// Only kind = "EXPENSE" categories may be used (savings → use savings entries).
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const parsed = expenseCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }
  const { amountCents, date, categoryId, note } = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) {
    return NextResponse.json({ error: "Category not found" }, { status: 404 });
  }
  if (category.kind !== "EXPENSE") {
    return NextResponse.json(
      { error: "Use Savings entries for savings categories" },
      { status: 400 },
    );
  }

  const created = await prisma.expense.create({
    data: {
      amountCents,
      // Stored as UTC midnight (§7 / D13).
      date: parseDate(date),
      note: emptyToNull(note),
      categoryId,
    },
    include: { category: true },
  });

  return NextResponse.json(toExpenseDTO(created), { status: 201 });
}
