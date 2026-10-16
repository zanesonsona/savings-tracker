// DEV-ONLY demo data seeder (T15).
//
// Wipes all tables and inserts a small demo dataset so the app can be
// explored without manual entry. The app itself always starts empty (D3) —
// seeding is opt-in via `npm run db:seed`. Idempotent: run it again to reset.
//
// Usage: npm run db:seed

import { PrismaClient } from "@prisma/client";
import { currentMonth, parseDate, shiftMonth } from "../lib/dates";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("This seed script is DEV-ONLY and must not run in production. Aborting.");
    process.exit(1);
  }

  const month = currentMonth(); // e.g. "2026-10" (UTC, D13)
  const prevMonth = shiftMonth(month, -1);

  console.log(`Seeding demo data (current month ${month}, previous ${prevMonth})…`);

  // Idempotent: start from a clean slate (FK-safe order).
  await prisma.expense.deleteMany();
  await prisma.savingsEntry.deleteMany();
  await prisma.income.deleteMany();
  await prisma.category.deleteMany();

  // 35 / 25 / 20 / 20 across the classic buckets.
  const bills = await prisma.category.create({
    data: { name: "Bills", percentage: 35, kind: "EXPENSE", color: "#ef4444" },
  });
  const needs = await prisma.category.create({
    data: { name: "Needs", percentage: 25, kind: "EXPENSE", color: "#3b82f6" },
  });
  const debts = await prisma.category.create({
    data: { name: "Debts", percentage: 20, kind: "EXPENSE", color: "#f59e0b" },
  });
  const savings = await prisma.category.create({
    data: { name: "Savings", percentage: 20, kind: "SAVINGS", color: "#22c55e" },
  });

  // 2 incomes (one this month, one last month).
  await prisma.income.create({
    data: {
      amountCents: 500000, // 5000.00
      source: "Salary",
      date: parseDate(`${month}-01`),
      note: "Monthly salary",
    },
  });
  await prisma.income.create({
    data: {
      amountCents: 120000, // 1200.00
      source: "Freelance",
      date: parseDate(`${prevMonth}-15`),
      note: "Side project",
    },
  });

  // A few expenses (current month + one in the previous month).
  await prisma.expense.create({
    data: { amountCents: 20000, date: parseDate(`${month}-05`), categoryId: bills.id, note: "Electricity" },
  });
  await prisma.expense.create({
    data: { amountCents: 8000, date: parseDate(`${month}-08`), categoryId: needs.id, note: "Groceries" },
  });
  await prisma.expense.create({
    data: { amountCents: 15000, date: parseDate(`${month}-12`), categoryId: debts.id, note: "Loan payment" },
  });
  await prisma.expense.create({
    data: { amountCents: 6000, date: parseDate(`${prevMonth}-20`), categoryId: needs.id, note: "Groceries" },
  });

  // 1 savings deposit.
  await prisma.savingsEntry.create({
    data: {
      amountCents: 100000, // 1000.00
      direction: "DEPOSIT",
      date: parseDate(`${month}-02`),
      categoryId: savings.id,
      note: "Emergency fund",
    },
  });

  const counts = {
    categories: await prisma.category.count(),
    incomes: await prisma.income.count(),
    expenses: await prisma.expense.count(),
    savingsEntries: await prisma.savingsEntry.count(),
  };
  console.log("Seed complete:", counts);
  console.log("Tip: open / to see the dashboard with allocations for the current month.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
