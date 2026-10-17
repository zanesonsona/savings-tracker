"use client";

import { useEffect, useState } from "react";
import EmptyState from "@/components/EmptyState";
import CategoryMultiSelect from "@/components/CategoryMultiSelect";
import ProgressBar from "@/components/ProgressBar";
import { apiFetch } from "@/lib/api";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import type { OverviewResponse } from "@/lib/types";
import { useCurrentMonth } from "@/lib/use-current-month";

const BUTTON_SECONDARY =
  "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

function SummaryCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "positive" | "negative";
}) {
  const toneClass =
    tone === "negative"
      ? "text-red-600"
      : tone === "positive"
        ? "text-green-600"
        : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Month picker: client-only default ("" until hydrated), prev/next via shiftMonth.
  const [monthState, setMonthState] = useState<string | null>(null);
  const clientMonth = useCurrentMonth();
  const month = monthState ?? clientMonth;
  // Row filter (T29): [] = show every category; the summary cards ignore it.
  const [categoryFilterIds, setCategoryFilterIds] = useState<number[]>([]);

  useEffect(() => {
    if (!month) return; // wait for the client-only month value
    let cancelled = false;
    (async () => {
      try {
        const overview = await apiFetch<OverviewResponse>(`/api/overview?month=${month}`);
        if (!cancelled) {
          setData(overview);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setLoadError(err instanceof Error ? err.message : "Failed to load overview");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [month]);

  const netSavedTone =
    data && data.totals.netSavedCents < 0
      ? "negative"
      : data && data.totals.netSavedCents > 0
        ? "positive"
        : "default";
  const balanceTone = data && data.savingsBalanceCents < 0 ? "negative" : "default";
  const walletTone = data && data.walletBalanceCents < 0 ? "negative" : "default";

  const rows = data?.categories ?? [];
  const visibleRows =
    categoryFilterIds.length > 0
      ? rows.filter((row) => categoryFilterIds.includes(row.id))
      : rows;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Plan vs actual for the selected month, recalculated from your current percentages.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <button
          type="button"
          onClick={() => setMonthState(shiftMonth(month, -1))}
          disabled={!month}
          aria-label="Previous month"
          className={BUTTON_SECONDARY}
        >
          ← Prev
        </button>
        <span className="min-w-40 text-center text-sm font-medium text-slate-900">
          {month ? monthLabel(month) : "…"}
        </span>
        <button
          type="button"
          onClick={() => setMonthState(shiftMonth(month, 1))}
          disabled={!month}
          aria-label="Next month"
          className={BUTTON_SECONDARY}
        >
          Next →
        </button>
        <CategoryMultiSelect
          options={rows.map((row) => ({
            id: row.id,
            name: row.name,
            kind: row.kind,
            color: row.color,
          }))}
          selected={categoryFilterIds}
          onChange={setCategoryFilterIds}
          hint="Filters the rows below — cards stay unchanged."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <SummaryCard
          label="Income"
          value={data ? formatCents(data.incomeTotalCents) : "—"}
          sub={
            data && data.unallocatedCents > 0
              ? `Unallocated ${formatCents(data.unallocatedCents)}`
              : undefined
          }
        />
        <SummaryCard
          label="Spent"
          value={data ? formatCents(data.totals.spentCents) : "—"}
        />
        <SummaryCard
          label="Net saved"
          value={data ? formatCents(data.totals.netSavedCents) : "—"}
          tone={netSavedTone}
        />
        <SummaryCard
          label="Wallet balance"
          value={data ? formatCents(data.walletBalanceCents) : "—"}
          sub="All-time · cash not spent or saved"
          tone={walletTone}
        />
        <SummaryCard
          label="Savings balance"
          value={data ? formatCents(data.savingsBalanceCents) : "—"}
          sub="All-time net across categories"
          tone={balanceTone}
        />
      </div>

      {data === null ? (
        loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : (
          <p className="text-sm text-slate-500">Loading…</p>
        )
      ) : data.categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create your own buckets (e.g., Bills, Needs, Debts, Savings) to split income and track spending."
          actionHref="/categories"
          actionLabel="Create categories"
        />
      ) : (
        <div className="space-y-4">
          {data.incomeTotalCents === 0 ? (
            <EmptyState
              title={`No income in ${monthLabel(data.month)}`}
              description="Allocations appear once you log income — it is split across your categories by their percentages."
              actionHref="/income"
              actionLabel="Add income"
            />
          ) : null}
          {visibleRows.length === 0 ? (
            <p className="text-sm text-slate-500">No categories match the current filter.</p>
          ) : (
            <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
              {visibleRows.map((row) => (
              <li key={row.id} className="p-4">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: row.color ?? "#94a3b8" }}
                    />
                    {row.name}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                    {row.kind === "SAVINGS" ? "Savings" : "Expense"} · {row.percentage}%
                  </span>
                  <span className="ml-auto text-sm text-slate-500">
                    <span className="font-medium text-slate-900">
                      {formatCents(row.actualCents)}
                    </span>{" "}
                    of {formatCents(row.allocatedCents)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <ProgressBar progress={row.progress} />
                  </div>
                  <span
                    className={`shrink-0 text-xs ${
                      row.remainingCents < 0 ? "font-medium text-red-600" : "text-slate-500"
                    }`}
                  >
                    {row.remainingCents < 0
                      ? `over by ${formatCents(-row.remainingCents)}`
                      : `remaining ${formatCents(row.remainingCents)}`}
                  </span>
                </div>
              </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
