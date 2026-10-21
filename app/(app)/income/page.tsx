"use client";

import Link from "next/link";
import { useEffect, useState, ViewTransition } from "react";
import EmptyState from "@/components/EmptyState";
import FormDialog from "@/components/FormDialog";
import IncomeForm from "@/components/IncomeForm";
import PageHeader from "@/components/PageHeader";
import { SkeletonList } from "@/components/Skeleton";
import { useConfirm } from "@/components/ConfirmDialog";
import { useToast } from "@/components/Toaster";
import { apiFetch } from "@/lib/api";
import { splitIncome } from "@/lib/allocation";
import { monthLabel } from "@/lib/dates";
import { ArrowDownLeft, Plus, Tags, Trash2, Wallet } from "@/lib/icons";
import { formatCents } from "@/lib/money";
import type { CategoryDTO, IncomeDTO } from "@/lib/types";

/** "2026-10-01T00:00:00.000Z" → "Oct 1" (UTC parts — never shifts, D13). */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function IncomePage() {
  const [incomes, setIncomes] = useState<IncomeDTO[] | null>(null);
  const [categories, setCategories] = useState<CategoryDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const reload = () => setRefreshKey((key) => key + 1);

  const [formOpen, setFormOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [incomeData, categoryData] = await Promise.all([
          apiFetch<IncomeDTO[]>("/api/incomes"),
          apiFetch<CategoryDTO[]>("/api/categories"),
        ]);
        if (!cancelled) {
          setIncomes(incomeData);
          setCategories(categoryData);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setIncomes(null);
          setCategories(null);
          setLoadError(err instanceof Error ? err.message : "Failed to load income");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  async function handleDelete(income: IncomeDTO) {
    const label = `${formatCents(income.amountCents)} on ${income.date.slice(0, 10)}`;
    const confirmed = await confirm({
      title: "Delete income?",
      description: `This permanently removes ${label}. The category split for this entry will disappear too.`,
      confirmLabel: "Delete income",
    });
    if (!confirmed) return;

    setActionError(null);
    try {
      await apiFetch(`/api/incomes/${income.id}`, { method: "DELETE" });
      toast({ tone: "success", title: "Income deleted", description: label });
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete income";
      setActionError(message);
      toast({ tone: "error", title: "Could not delete income", description: message });
    }
  }

  // Group (already newest-first) incomes by month.
  const groups: { month: string; items: IncomeDTO[] }[] = [];
  for (const income of incomes ?? []) {
    const month = income.date.slice(0, 7);
    const last = groups[groups.length - 1];
    if (last && last.month === month) {
      last.items.push(income);
    } else {
      groups.push({ month, items: [income] });
    }
  }

  const hasCategories = (categories ?? []).length > 0;
  const totalCents = (incomes ?? []).reduce((sum, income) => sum + income.amountCents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income"
        description="Log each paycheck — it is split across your categories by their percentages."
        actions={
          <button type="button" onClick={() => setFormOpen(true)} className="btn-primary">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add income
          </button>
        }
      />

      {!hasCategories && categories !== null ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Income can only be split once you create categories (e.g., Bills, Needs, Debts, Savings)."
          actionHref="/categories"
          actionLabel="Create categories"
        />
      ) : null}

      {actionError ? <p className="alert-danger">{actionError}</p> : null}

      {incomes === null ? (
        loadError ? (
          <p className="alert-danger">{loadError}</p>
        ) : (
          <SkeletonList label="Loading income…" rows={4} />
        )
      ) : incomes.length === 0 ? (
        <EmptyState
          icon={ArrowDownLeft}
          title="No income yet"
          description="Add your first paycheck and you will see how it splits across your categories."
        />
      ) : (
        <>
          <section className="card flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-control bg-brand-soft text-brand">
                <Wallet aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
                  Total income logged
                </p>
                <p className="money text-xl font-semibold text-ink">{formatCents(totalCents)}</p>
              </div>
            </div>
            <span className="badge badge-neutral">
              {incomes.length === 1 ? "1 entry" : `${incomes.length} entries`}
            </span>
          </section>

          <div className="space-y-6">
            {groups.map((group) => {
              const groupTotal = group.items.reduce((sum, item) => sum + item.amountCents, 0);
              return (
                <section key={group.month}>
                  <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                    <h2 className="text-sm font-semibold text-ink-muted">
                      {monthLabel(group.month)}
                    </h2>
                    <span className="money text-xs text-ink-muted">
                      {formatCents(groupTotal)}
                    </span>
                  </div>
                  <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
                    {group.items.map((income) => {
                      const split = splitIncome(
                        income.amountCents,
                        (categories ?? []).map((category) => ({
                          id: category.id,
                          percentage: category.percentage,
                        })),
                      );
                      const categoryById = new Map(
                        (categories ?? []).map((category) => [category.id, category]),
                      );
                      const label = `${formatCents(income.amountCents)} on ${income.date.slice(0, 10)}`;
                      return (
                        <ViewTransition key={income.id} enter="auto" exit="auto">
                          <li className="p-4 transition-colors hover:bg-surface-muted/60">
                            <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
                              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                                <ArrowDownLeft aria-hidden="true" className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                  <span className="text-sm font-semibold text-ink">
                                    {income.source ?? "No source"}
                                  </span>
                                  <span className="text-xs text-ink-muted">
                                    {shortDate(income.date)}
                                  </span>
                                  {income.note ? (
                                    <span className="text-sm text-ink-muted">· {income.note}</span>
                                  ) : null}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {!hasCategories ? (
                                    <Link
                                      href="/categories"
                                      className="text-xs text-ink-muted underline underline-offset-2"
                                    >
                                      Create categories to see the split
                                    </Link>
                                  ) : (
                                    <>
                                      {split.allocations
                                        .filter((allocation) => allocation.amountCents > 0)
                                        .map((allocation) => {
                                          const category = categoryById.get(allocation.categoryId);
                                          return (
                                            <span
                                              key={allocation.categoryId}
                                              className="badge badge-neutral gap-1.5"
                                            >
                                              <span
                                                aria-hidden="true"
                                                className="h-2 w-2 rounded-full"
                                                style={{
                                                  backgroundColor:
                                                    category?.color ?? "var(--chart-other)",
                                                }}
                                              />
                                              {category?.name ?? "…"}
                                              <span className="money font-medium">
                                                {formatCents(allocation.amountCents)}
                                              </span>
                                            </span>
                                          );
                                        })}
                                      {split.unallocatedCents > 0 ? (
                                        <span className="badge bg-line text-ink-muted">
                                          Unallocated {formatCents(split.unallocatedCents)}
                                        </span>
                                      ) : null}
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="ml-auto flex items-center gap-1.5">
                                <span className="money text-sm font-semibold text-ink">
                                  {formatCents(income.amountCents)}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(income)}
                                  aria-label={`Delete income of ${label}`}
                                  title="Delete income"
                                  className="icon-button hover:bg-danger-soft hover:text-danger"
                                >
                                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </li>
                        </ViewTransition>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add income"
        description="Log a paycheck, refund or any money coming in."
      >
        <IncomeForm
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
