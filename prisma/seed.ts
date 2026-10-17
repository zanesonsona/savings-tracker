// DEV-ONLY demo data seeder (T15, updated in T26 for accounts).
//
// Wipes all tables (users included) and inserts a demo ADMIN account plus a
// small dataset owned by it, so the app can be explored without manual entry.
// The app itself always starts empty (D3) — seeding is opt-in via
// `npm run db:seed`. Idempotent: run it again to reset.
//
// Demo login: demo / demo12345 (role ADMIN, status APPROVED)
//
// Usage: npm run db:seed

import { PrismaClient } from "@prisma/client";
import { currentMonth, parseDate, shiftMonth } from "../lib/dates";
import { hashPassword } from "../lib/auth";

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
  await prisma.savingsEntry.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.income.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // The demo account owns everything below; every row must carry a userId (T26).
  const demo = await prisma.user.create({
    data: {
      username: "demo",
      passwordHash: await hashPassword("demo12345"),
      role: "ADMIN",
      status: "APPROVED",
    },
  });

  // 35 / 25 / 20 / 20 across the classic buckets.
  const bills = await prisma.category.create({
    data: { name: "Bills", percentage: 35, kind: "EXPENSE", color: "#ef4444", userId: demo.id },
  });
  const needs = await prisma.category.create({
    data: { name: "Needs", percentage: 25, kind: "EXPENSE", color: "#3b82f6", userId: demo.id },
  });
  const debts = await prisma.category.create({
    data: { name: "Debts", percentage: 20, kind: "EXPENSE", color: "#f59e0b", userId: demo.id },
  });
  const savings = await prisma.category.create({
    data: { name: "Savings", percentage: 20, kind: "SAVINGS", color: "#22c55e", userId: demo.id },
  });

  // 2 incomes (one this month, one last month).
  await prisma.income.create({
    data: {
      amountCents: 500000, // 5000.00
      source: "Salary",
      date: parseDate(`${month}-01`),
      note: "Monthly salary",
      userId: demo.id,
    },
  });
  await prisma.income.create({
    data: {
      amountCents: 120000, // 1200.00
      source: "Freelance",
      date: parseDate(`${prevMonth}-15`),
      note: "Side project",
      userId: demo.id,
    },
  });

  // A few expenses (current month + one in the previous month).
  await prisma.expense.create({
    data: {
      amountCents: 20000,
      date: parseDate(`${month}-05`),
      categoryId: bills.id,
      note: "Electricity",
      userId: demo.id,
    },
  });
  await prisma.expense.create({
    data: {
      amountCents: 8000,
      date: parseDate(`${month}-08`),
      categoryId: needs.id,
      note: "Groceries",
      userId: demo.id,
    },
  });
  await prisma.expense.create({
    data: {
      amountCents: 15000,
      date: parseDate(`${month}-12`),
      categoryId: debts.id,
      note: "Loan payment",
      userId: demo.id,
    },
  });
  await prisma.expense.create({
    data: {
      amountCents: 6000,
      date: parseDate(`${prevMonth}-20`),
      categoryId: needs.id,
      note: "Groceries",
      userId: demo.id,
    },
  });

  // 1 savings deposit.
  await prisma.savingsEntry.create({
    data: {
      amountCents: 100000, // 1000.00
      direction: "DEPOSIT",
      date: parseDate(`${month}-02`),
      categoryId: savings.id,
      note: "Emergency fund",
      userId: demo.id,
    },
  });

  const counts = {
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    incomes: await prisma.income.count(),
    expenses: await prisma.expense.count(),
    savingsEntries: await prisma.savingsEntry.count(),
  };
  console.log("Seed complete:", counts);
  console.log("Demo login: demo / demo12345 (admin). Open / to see the dashboard.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
