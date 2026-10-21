import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentMonth, parseMonth, shiftMonth } from "@/lib/dates";
import { splitIncome } from "@/lib/allocation";
import { walletBalanceCents } from "@/lib/wallet";
import { monthSchema, zodErrorMessage } from "@/lib/validation";
import type {
  CategoryKind,
  OverviewCategoryDTO,
  OverviewResponse,
  OverviewTrendPoint,
} from "@/lib/types";

// GET /api/overview?month=YYYY-MM (default: current UTC month) → dashboard payload (§7/T13).
//
// allocatedCents = Σ splitIncome over the month's incomes per category (D6: computed live);
// actualCents = Σ expenses (EXPENSE) or net deposits (SAVINGS) of the month;
// progress = actual / allocated (0 when allocated = 0); savings balance = all-time net (D7);
// walletBalanceCents = all-time cash on hand (income − expenses − savings net, D18/T28).
export async function GET(request: Request) {
  const auth = await requireUser();
  if ("response" in auth) return auth.response;

  const monthParam = new URL(request.url).searchParams.get("month") ?? currentMonth();

  const parsed = monthSchema.safeParse(monthParam);
  if (!parsed.success) {
    return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
  }
  const month = parsed.data;
  const { start, end } = parseMonth(month);
  const range = { gte: start, lt: end };
  const userId = auth.user.id;

  // T36/D25 — optional `?trend=N` (integer 1–12): N monthly buckets ending at
  // the selected month. Absent → the payload is exactly the pre-T36 shape.
  const trendParam = new URL(request.url).searchParams.get("trend");
  let trendMonths: number | null = null;
  if (trendParam !== null) {
    trendMonths = Number(trendParam);
    if (!/^\d+$/.test(trendParam) || trendMonths < 1 || trendMonths > 12) {
      return NextResponse.json(
        { error: "trend must be an integer between 1 and 12" },
        { status: 400 },
      );
    }
  }
  const trendRange =
    trendMonths === null
      ? null
      : { start: parseMonth(shiftMonth(month, -(trendMonths - 1))).start, end };

  // Everything below is scoped to the session account (D16). The last two
  // aggregates are all-time (the wallet is independent of `month` — T28).
  // Trend rows use ONE query per data table across the whole N-month range.
  const [
    categories,
    incomes,
    expenses,
    savingsEntries,
    allTimeRows,
    allTimeIncome,
    allTimeExpenses,
    trendIncomes,
    trendExpenses,
    trendSavings,
  ] = await Promise.all([
    prisma.category.findMany({ where: { userId }, orderBy: { id: "asc" } }),
    prisma.income.findMany({ where: { userId, date: range } }),
    prisma.expense.findMany({ where: { userId, date: range } }),
    prisma.savingsEntry.findMany({ where: { userId, date: range } }),
    prisma.savingsEntry.groupBy({ by: ["direction"], where: { userId }, _sum: { amountCents: true } }),
    prisma.income.aggregate({ where: { userId }, _sum: { amountCents: true } }),
    prisma.expense.aggregate({ where: { userId }, _sum: { amountCents: true } }),
    trendRange
      ? prisma.income.findMany({
          where: { userId, date: { gte: trendRange.start, lt: trendRange.end } },
        })
      : Promise.resolve([]),
    trendRange
      ? prisma.expense.findMany({
          where: { userId, date: { gte: trendRange.start, lt: trendRange.end } },
        })
      : Promise.resolve([]),
    trendRange
      ? prisma.savingsEntry.findMany({
          where: { userId, date: { gte: trendRange.start, lt: trendRange.end } },
        })
      : Promise.resolve([]),
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

  let depositSum = 0;
  let withdrawalSum = 0;
  for (const row of allTimeRows) {
    const sum = row._sum.amountCents ?? 0;
    if (row.direction === "DEPOSIT") depositSum += sum;
    else withdrawalSum += sum;
  }
  const savingsBalanceCents = depositSum - withdrawalSum;

  const wallet = walletBalanceCents({
    incomeCents: allTimeIncome._sum.amountCents ?? 0,
    expenseCents: allTimeExpenses._sum.amountCents ?? 0,
    depositCents: depositSum,
    withdrawalCents: withdrawalSum,
  });

  let trend: OverviewTrendPoint[] | undefined;
  if (trendMonths !== null) {
    trend = Array.from({ length: trendMonths }, (_, index) => ({
      month: shiftMonth(month, index - (trendMonths - 1)),
      incomeTotalCents: 0,
      spentCents: 0,
      netSavedCents: 0,
    }));
    const byMonth = new Map(trend.map((point) => [point.month, point]));

    for (const income of trendIncomes) {
      const point = byMonth.get(currentMonth(income.date));
      if (point) point.incomeTotalCents += income.amountCents;
    }
    for (const expense of trendExpenses) {
      const point = byMonth.get(currentMonth(expense.date));
      if (point) point.spentCents += expense.amountCents;
    }
    for (const entry of trendSavings) {
      const point = byMonth.get(currentMonth(entry.date));
      if (!point) continue;
      point.netSavedCents +=
        entry.direction === "DEPOSIT" ? entry.amountCents : -entry.amountCents;
    }
  }

  const body: OverviewResponse = {
    month,
    incomeTotalCents,
    unallocatedCents,
    categories: rows,
    totals: { spentCents, netSavedCents },
    walletBalanceCents: wallet,
    savingsBalanceCents,
  };
  if (trend) body.trend = trend;
  return NextResponse.json(body);
}
