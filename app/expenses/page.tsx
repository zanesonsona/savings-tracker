import type { Metadata } from "next";
import EmptyState from "@/components/EmptyState";

export const metadata: Metadata = { title: "Expenses · Savings Tracker" };

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Expenses</h1>
      <EmptyState
        title="Expense tracking is coming soon"
        description="This page will let you log expenses against your own expense categories and compare them to the amount allocated."
      />
    </div>
  );
}
