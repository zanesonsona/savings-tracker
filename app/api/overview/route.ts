import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentMonth, parseMonth } from "@/lib/dates";
import { splitIncome } from "@/lib/allocation";
import { monthSchema, zodErrorMessage } from "@/lib/validation";
import type { CategoryKind, OverviewCategoryDTO, OverviewResponse } from "@/lib/types";

// GET /api/overview?month=YYYY-MM (default: current UTC month) → dashboard payload (§7/T13).
//
// allocatedCents = Σ splitIncome over the month's incomes per category (D6: computed live);
// actualCents = Σ expenses (EXPENSE) or net deposits (SAVINGS) of the month;
// progress = actual / allocated (0 when allocated = 0); savings balance = all-time net (D7).
export async function GET(request: Request) {
  const monthParam = new URL(request.url).searchParams.get("month") ?? currentMonth();

  const parsed = monthSchema.safeParse(monthParam);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }
  const month = parsed.data;
  const { start, end } = parseMonth(month);
  const range = { gte: start, lt: end };

  const [categories, incomes, expenses, savingsEntries, allTimeRows] = await Promise.all([
    prisma.category.findMany({ orderBy: { id: "asc" } }),
    prisma.income.findMany({ where: { date: range } }),
    prisma.expense.findMany({ where: { date: range } }),
    prisma.savingsEntry.findMany({ where: { date: range } }),
    prisma.savingsEntry.groupBy({ by: ["direction"], _sum: { amountCents: true } }),
  ]);

  const incomeTotalCents = incomes.reduce((sum, income) => sum + income.amountCents, 0);

  // Allocations: run splitIncome for each month income against the current percentages.
  const allocationByCategory = new Map<number, number>();
  let unallocatedCents = 0;
  for (const income of incomes) {
    const split = splitIncome(
      income.amountCents,
      categories.map((c) => ({ id: c.id, percentage: c.percentage })),
    );
    for (const allocation of split.allocations) {
      allocationByCategory.set(
        allocation.categoryId,
        (allocationByCategory.get(allocation.categoryId) ?? 0) + allocation.amountCents,
      );
    }
    unallocatedCents += split.unallocatedCents;
  }

  const expenseByCategory = new Map<number, number>();
  for (const expense of expenses) {
    expenseByCategory.set(
      expense.categoryId,
      (expenseByCategory.get(expense.categoryId) ?? 0) + expense.amountCents,
    );
  }

  const savingsNetByCategory = new Map<number, number>();
  for (const entry of savingsEntries) {
    const delta = entry.direction === "DEPOSIT" ? entry.amountCents : -entry.amountCents;
    savingsNetByCategory.set(
      entry.categoryId,
      (savingsNetByCategory.get(entry.categoryId) ?? 0) + delta,
    );
  }

  const rows: OverviewCategoryDTO[] = categories.map((category) => {
    const allocatedCents = allocationByCategory.get(category.id) ?? 0;
    const actualCents =
      category.kind === "SAVINGS"
        ? (savingsNetByCategory.get(category.id) ?? 0)
        : (expenseByCategory.get(category.id) ?? 0);
    return {
      id: category.id,
      name: category.name,
      kind: category.kind as CategoryKind,
      color: category.color,
      percentage: category.percentage,
      allocatedCents,
      actualCents,
      remainingCents: allocatedCents - actualCents,
      progress: allocatedCents === 0 ? 0 : actualCents / allocatedCents,
    };
  });

  const spentCents = rows
    .filter((row) => row.kind === "EXPENSE")
    .reduce((sum, row) => sum + row.actualCents, 0);
  const netSavedCents = rows
    .filter((row) => row.kind === "SAVINGS")
    .reduce((sum, row) => sum + row.actualCents, 0);

  const savingsBalanceCents = allTimeRows.reduce((net, row) => {
    const sum = row._sum.amountCents ?? 0;
    return net + (row.direction === "DEPOSIT" ? sum : -sum);
  }, 0);

  const body: OverviewResponse = {
    month,
    incomeTotalCents,
    unallocatedCents,
    categories: rows,
    totals: { spentCents, netSavedCents },
    savingsBalanceCents,
  };
  return NextResponse.json(body);
}
