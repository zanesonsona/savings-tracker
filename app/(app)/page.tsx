"use client";

import { useEffect, useState } from "react";
import AllocationDonut from "@/components/AllocationDonut";
import CategoryMultiSelect from "@/components/CategoryMultiSelect";
import EmptyState from "@/components/EmptyState";
import MonthPicker from "@/components/MonthPicker";
import PageHeader from "@/components/PageHeader";
import ProgressBar from "@/components/ProgressBar";
import Skeleton from "@/components/Skeleton";
import StatCard, { type StatDelta } from "@/components/StatCard";
import TrendChart from "@/components/TrendChart";
import { apiFetch } from "@/lib/api";
import { monthLabel } from "@/lib/dates";
import { ArrowDownLeft, PiggyBank, Receipt, Wallet } from "@/lib/icons";
import { formatCents } from "@/lib/money";
import type { OverviewCategoryDTO, OverviewResponse, OverviewTrendPoint } from "@/lib/types";
import { useCurrentMonth } from "@/lib/use-current-month";

type TrendKey = "incomeTotalCents" | "spentCents" | "netSavedCents";

/**
 * Month-over-month delta from the trend payload. `invert` is used for spending,
 * where an increase is bad (red) rather than good (green).
 */
function monthDelta(
  trend: OverviewTrendPoint[],
  key: TrendKey,
  invert = false,
): StatDelta | undefined {
  if (trend.length < 2) return undefined;
  const current = trend[trend.length - 1][key];
  const previous = trend[trend.length - 2][key];
  const diff = current - previous;
  if (diff === 0) return { label: "No change vs last month", tone: "neutral" };
  const increased = diff > 0;
  return {
    label: `${increased ? "+" : "−"}${formatCents(Math.abs(diff))} vs last month`,
    tone: invert ? (increased ? "negative" : "positive") : increased ? "positive" : "negative",
  };
}

function statusFor(row: OverviewCategoryDTO): {
  label: string;
  className: string;
} {
  if (row.actualCents > row.allocatedCents || row.progress > 1) {
    return { label: "Over", className: "badge badge-danger" };
  }
  if (row.allocatedCents > 0 && row.progress >= 0.85) {
    return { label: "Near limit", className: "badge badge-warning" };
  }
  return { label: "On track", className: "badge badge-success" };
}

function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Loading dashboard" className="space-y-6">
      <Skeleton className="h-36 w-full rounded-panel" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-28 w-full rounded-panel" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-64 w-full rounded-panel lg:col-span-2" />
        <Skeleton className="h-64 w-full rounded-panel lg:col-span-3" />
      </div>
      <span className="sr-only">Loading dashboard…</span>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Month picker: client-only default ("" until hydrated), prev/next via MonthPicker.
  const [monthState, setMonthState] = useState<string | null>(null);
  const clientMonth = useCurrentMonth();
  const month = monthState ?? clientMonth;
  // Row filter (T29): [] = show every category; cards/donut/trend ignore it.
  const [categoryFilterIds, setCategoryFilterIds] = useState<number[]>([]);

  useEffect(() => {
    if (!month) return; // wait for the client-only month value
    let cancelled = false;
    (async () => {
      try {
        const overview = await apiFetch<OverviewResponse>(
          `/api/overview?month=${month}&trend=6`,
        );
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

  const rows = data?.categories ?? [];
  const visibleRows =
    categoryFilterIds.length > 0
      ? rows.filter((row) => categoryFilterIds.includes(row.id))
      : rows;
  const trend = data?.trend ?? [];
  const walletNegative = data !== null && data.walletBalanceCents < 0;
  const netSavedTone =
    data && data.totals.netSavedCents < 0
      ? "negative"
      : data && data.totals.netSavedCents > 0
        ? "positive"
        : "default";
  const savingsTone = data && data.savingsBalanceCents < 0 ? "negative" : "default";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Plan vs actual for the selected month, recalculated from your current percentages."
      />

      <div className="card flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <MonthPicker month={month} onChange={setMonthState} />
        <CategoryMultiSelect
          options={rows.map((row) => ({
            id: row.id,
            name: row.name,
            kind: row.kind,
            color: row.color,
          }))}
          selected={categoryFilterIds}
          onChange={setCategoryFilterIds}
          hint="Filters category cards only — totals, donut and trend stay account-wide."
        />
      </div>

      {data === null ? (
        loadError ? (
          <p className="alert-danger">{loadError}</p>
        ) : (
          <DashboardSkeleton />
        )
      ) : (
        <>
          <section
            aria-labelledby="wallet-heading"
            className={`overflow-hidden rounded-panel border p-5 sm:p-6 ${
              walletNegative
                ? "border-danger bg-gradient-to-br from-hero-danger-from to-hero-danger-to text-on-hero-danger"
                : "border-transparent bg-gradient-to-br from-hero-from to-hero-to text-on-hero"
            }`}
            style={{ boxShadow: "var(--shadow-raised)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p
                  id="wallet-heading"
                  className="text-xs font-medium tracking-wide uppercase opacity-80"
                >
                  Wallet balance
                </p>
                <p className="money mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {formatCents(data.walletBalanceCents)}
                </p>
                <p className="mt-1.5 text-sm opacity-80">
                  All-time cash not spent or saved — your income minus expenses and savings net.
                </p>
              </div>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-on-hero/10">
                <Wallet aria-hidden="true" className="h-5 w-5" />
              </span>
            </div>
            {walletNegative ? (
              <p className="mt-4 inline-flex rounded-control bg-on-hero-danger/15 px-3 py-1.5 text-xs font-medium">
                Your spending has moved ahead of your income and savings.
              </p>
            ) : null}
          </section>

          <section aria-label="Monthly summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Income"
              value={formatCents(data.incomeTotalCents)}
              icon={ArrowDownLeft}
              delta={monthDelta(trend, "incomeTotalCents")}
              sub={
                data.unallocatedCents > 0
                  ? `Unallocated ${formatCents(data.unallocatedCents)}`
                  : undefined
              }
            />
            <StatCard
              label="Spent"
              value={formatCents(data.totals.spentCents)}
              icon={Receipt}
              delta={monthDelta(trend, "spentCents", true)}
            />
            <StatCard
              label="Net saved"
              value={formatCents(data.totals.netSavedCents)}
              icon={PiggyBank}
              tone={netSavedTone}
              delta={monthDelta(trend, "netSavedCents")}
            />
            <StatCard
              label="Savings balance"
              value={formatCents(data.savingsBalanceCents)}
              icon={Wallet}
              tone={savingsTone}
              sub="All-time net across savings categories"
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-5">
            <section aria-labelledby="allocation-heading" className="card p-4 sm:p-5 lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <h2 id="allocation-heading" className="text-sm font-semibold text-ink">
                  Allocation
                </h2>
                <span className="badge badge-neutral">{rows.length} categories</span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                This month&apos;s split from your current percentages.
              </p>
              <div className="mt-4">
                <AllocationDonut
                  slices={rows.map((row) => ({
                    id: row.id,
                    name: row.name,
                    amountCents: row.allocatedCents,
                    color: row.color,
                  }))}
                  unallocatedCents={data.unallocatedCents}
                />
              </div>
            </section>

            <section aria-labelledby="trend-heading" className="card p-4 sm:p-5 lg:col-span-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="trend-heading" className="text-sm font-semibold text-ink">
                  6-month trend
                </h2>
                <span className="text-xs text-ink-muted">Ending {monthLabel(data.month)}</span>
              </div>
              <p className="mt-1 text-xs text-ink-muted">
                Income against spending, month by month.
              </p>
              <div className="mt-4">
                <TrendChart trend={trend} />
              </div>
            </section>
          </div>

          <section aria-labelledby="categories-heading" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="categories-heading" className="text-sm font-semibold text-ink">
                Categories
              </h2>
              <span className="text-xs text-ink-muted">
                {visibleRows.length} of {rows.length} shown
              </span>
            </div>

            {rows.length === 0 ? (
              <EmptyState
                title="No categories yet"
                description="Create your own buckets (e.g., Bills, Needs, Debts, Savings) to split income and track spending."
                actionHref="/categories"
                actionLabel="Create categories"
              />
            ) : (
              <>
                {data.incomeTotalCents === 0 ? (
                  <EmptyState
                    title={`No income in ${monthLabel(data.month)}`}
                    description="Allocations appear once you log income — it is split across your categories by their percentages."
                    actionHref="/income"
                    actionLabel="Add income"
                  />
                ) : null}

                {visibleRows.length === 0 ? (
                  <p className="text-sm text-ink-muted">
                    No categories match the current filter.
                  </p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {visibleRows.map((row) => {
                      const status = statusFor(row);
                      const usedPercent = Math.round(Math.max(0, row.progress) * 100);
                      return (
                        <li key={row.id} className="card p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                                  style={{ backgroundColor: row.color ?? "var(--chart-other)" }}
                                />
                                <h3 className="truncate text-sm font-semibold text-ink">
                                  {row.name}
                                </h3>
                              </div>
                              <p className="mt-1 text-xs text-ink-muted">
                                {row.kind === "SAVINGS" ? "Savings" : "Expense"} ·{" "}
                                {row.percentage}% plan
                              </p>
                            </div>
                            <span className={`${status.className} shrink-0`}>{status.label}</span>
                          </div>

                          <p className="money mt-3 text-lg font-semibold text-ink">
                            {formatCents(row.actualCents)}
                            <span className="ml-1 text-xs font-normal text-ink-muted">
                              of {formatCents(row.allocatedCents)}
                            </span>
                          </p>
                          <div className="mt-2">
                            <ProgressBar
                              progress={row.progress}
                              label={`${row.name} budget used`}
                            />
                          </div>
                          <div className="mt-2 flex items-baseline justify-between gap-2 text-xs">
                            <span
                              className={
                                row.remainingCents < 0
                                  ? "font-medium text-danger"
                                  : "text-ink-muted"
                              }
                            >
                              {row.remainingCents < 0
                                ? `over by ${formatCents(-row.remainingCents)}`
                                : `remaining ${formatCents(row.remainingCents)}`}
                            </span>
                            <span className="text-ink-muted">{usedPercent}% used</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
