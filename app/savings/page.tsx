import type { Metadata } from "next";
import EmptyState from "@/components/EmptyState";

export const metadata: Metadata = { title: "Savings · Savings Tracker" };

export default function SavingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Savings</h1>
      <EmptyState
        title="Savings tracking is coming soon"
        description="This page will show your all-time savings balance and let you log deposits and withdrawals against your savings categories."
        actionHref="/categories"
        actionLabel="Set up categories"
      />
    </div>
  );
}
