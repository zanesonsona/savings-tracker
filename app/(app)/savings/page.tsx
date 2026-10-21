"use client";

import { useEffect, useState, ViewTransition } from "react";
import CategoryMultiSelect from "@/components/CategoryMultiSelect";
import { useConfirm } from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import FormDialog from "@/components/FormDialog";
import MonthPicker from "@/components/MonthPicker";
import PageHeader from "@/components/PageHeader";
import SavingsForm from "@/components/SavingsForm";
import Skeleton, { SkeletonList } from "@/components/Skeleton";
import { useToast } from "@/components/Toaster";
import { apiFetch } from "@/lib/api";
import { monthLabel } from "@/lib/dates";
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Plus, SearchX, Tags, Trash2 } from "@/lib/icons";
import { formatCents } from "@/lib/money";
import type { CategoryDTO, SavingsListResponse } from "@/lib/types";
import { useCurrentMonth } from "@/lib/use-current-month";

/** "2026-10-02T00:00:00.000Z" → "Oct 2" (UTC parts — never shifts, D13). */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function SavingsPage() {
  const [data, setData] = useState<SavingsListResponse | null>(null);
  const [categories, setCategories] = useState<CategoryDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const reload = () => setRefreshKey((key) => key + 1);

  // Month filter: client-only default ("" until hydrated), prev/next via MonthPicker.
  const [monthState, setMonthState] = useState<string | null>(null);
  const clientMonth = useCurrentMonth();
  const month = monthState ?? clientMonth;
  const [categoryFilterIds, setCategoryFilterIds] = useState<number[]>([]); // [] = all categories

  const [formOpen, setFormOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    if (!month) return; // wait for the client-only month value
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ month });
        if (categoryFilterIds.length > 0) {
          params.set("categoryIds", categoryFilterIds.join(","));
        }
        const [savingsData, categoryData] = await Promise.all([
          apiFetch<SavingsListResponse>(`/api/savings?${params.toString()}`),
          apiFetch<CategoryDTO[]>("/api/categories"),
        ]);
        if (!cancelled) {
          setData(savingsData);
          setCategories(categoryData);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setData(null);
          setCategories(null);
          setLoadError(err instanceof Error ? err.message : "Failed to load savings");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, month, categoryFilterIds]);

  async function handleDelete(id: number, label: string) {
    const confirmed = await confirm({
      title: "Delete savings entry?",
      description: `This permanently removes the ${label}.`,
      confirmLabel: "Delete entry",
    });
    if (!confirmed) return;

    setActionError(null);
    try {
      await apiFetch(`/api/savings/${id}`, { method: "DELETE" });
      toast({ tone: "success", title: "Savings entry deleted", description: label });
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete entry";
      setActionError(message);
      toast({ tone: "error", title: "Could not delete entry", description: message });
    }
  }

  const savingsCategories = (categories ?? []).filter((category) => category.kind === "SAVINGS");
  const hasSavingsCategories = savingsCategories.length > 0;

  const balanceCents = data?.balanceCents ?? 0;
  const monthNetCents = data?.monthNetCents ?? 0;
  const balanceNegative = data !== null && balanceCents < 0;

  const emptyListState =
    categories !== null && !hasSavingsCategories ? (
      <EmptyState
        icon={Tags}
        title="No savings categories yet"
        description="Create a category with kind = Savings (e.g., an emergency fund) before logging deposits or withdrawals."
        actionHref="/categories"
        actionLabel="Create categories"
      />
    ) : categoryFilterIds.length > 0 ? (
      <EmptyState
        icon={SearchX}
        title="No matching entries"
        description="Nothing matches this month + category filter. Try another category or month."
      />
    ) : (
      <EmptyState
        icon={PiggyBank}
        title="No activity in this month"
        description={
          month
            ? `No deposits or withdrawals logged for ${monthLabel(month)} yet. Add an entry.`
            : "Add your first deposit."
        }
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Savings"
        description="Track deposits and withdrawals across your savings categories, filtered by month and categories."
        actions={
          <button type="button" onClick={() => setFormOpen(true)} className="btn-primary">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add entry
          </button>
        }
      />

      {actionError ? <p className="alert-danger">{actionError}</p> : null}

      {data === null ? (
        loadError ? (
          <p className="alert-danger">{loadError}</p>
        ) : (
          <div role="status" className="space-y-6">
            <Skeleton className="h-40 w-full rounded-panel" />
            <Skeleton className="h-16 w-full rounded-panel" />
            <SkeletonList label="Loading savings…" rows={4} />
          </div>
        )
      ) : (
        <>
          <section
            aria-labelledby="savings-balance-heading"
            className={`overflow-hidden rounded-panel border p-5 sm:p-6 ${
              balanceNegative
                ? "border-danger bg-gradient-to-br from-hero-danger-from to-hero-danger-to text-on-hero-danger"
                : "border-transparent bg-gradient-to-br from-hero-from to-hero-to text-on-hero"
            }`}
            style={{ boxShadow: "var(--shadow-raised)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p
                  id="savings-balance-heading"
                  className="text-xs font-medium tracking-wide uppercase opacity-80"
                >
                  Savings balance (all-time)
                </p>
                <p className="money mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {formatCents(balanceCents)}
                </p>
                <p className="mt-1.5 text-sm opacity-80">
                  Net in {month ? monthLabel(month) : "…"}:{" "}
                  <span className="money font-semibold">{formatCents(monthNetCents)}</span>
                </p>
              </div>
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-on-hero/10">
                <PiggyBank aria-hidden="true" className="h-5 w-5" />
              </span>
            </div>
          </section>

          <section className="card flex flex-col gap-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-center gap-3">
              <MonthPicker month={month} onChange={setMonthState} />
              <CategoryMultiSelect
                options={savingsCategories}
                selected={categoryFilterIds}
                onChange={setCategoryFilterIds}
                hint="Filters the list and the month's net — the balance stays all-time."
              />
            </div>
          </section>

          {data.entries.length === 0 ? (
            emptyListState
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
              {data.entries.map((entry) => {
                const label = `${entry.direction === "DEPOSIT" ? "deposit" : "withdrawal"} of ${formatCents(
                  entry.amountCents,
                )} (${entry.category.name})`;
                return (
                  <ViewTransition key={entry.id} enter="auto" exit="auto">
                    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4 transition-colors hover:bg-surface-muted/60">
                      <span
                        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                          entry.direction === "DEPOSIT"
                            ? "bg-success-soft text-success"
                            : "bg-danger-soft text-danger"
                        }`}
                      >
                        {entry.direction === "DEPOSIT" ? (
                          <ArrowDownLeft aria-hidden="true" className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
                        )}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <span className="text-sm font-semibold text-ink">
                            {entry.category.name}
                          </span>
                          <span className="text-xs text-ink-muted">{shortDate(entry.date)}</span>
                          <span className="badge badge-neutral">
                            {entry.direction === "DEPOSIT" ? "Deposit" : "Withdrawal"}
                          </span>
                        </div>
                        {entry.note ? (
                          <p className="mt-0.5 text-sm text-ink-muted">{entry.note}</p>
                        ) : null}
                      </div>
                      <span
                        className={`money text-sm font-semibold ${
                          entry.direction === "DEPOSIT" ? "text-success" : "text-danger"
                        }`}
                      >
                        {entry.direction === "DEPOSIT" ? "+" : "−"}
                        {formatCents(entry.amountCents)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id, label)}
                        aria-label={`Delete ${label}`}
                        title="Delete entry"
                        className="icon-button hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </li>
                  </ViewTransition>
                );
              })}
            </ul>
          )}
        </>
      )}

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add savings entry"
        description="Record a deposit into, or a withdrawal from, one of your savings categories."
      >
        <SavingsForm
          categories={categories ?? []}
          onCancel={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            reload();
          }}
        />
      </FormDialog>

      {dialog}
    </div>
  );
}
