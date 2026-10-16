import type { Metadata } from "next";
import EmptyState from "@/components/EmptyState";

export const metadata: Metadata = { title: "Income · Savings Tracker" };

export default function IncomePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Income</h1>
      <EmptyState
        title="Income logging is coming soon"
        description="This page will let you log income entries and see how each one splits across your categories."
        actionHref="/categories"
        actionLabel="Set up categories"
      />
    </div>
  );
}
