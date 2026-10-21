"use client";

import { useEffect, useState, ViewTransition } from "react";
import CategoryMultiSelect from "@/components/CategoryMultiSelect";
import { useConfirm } from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import ExpenseForm from "@/components/ExpenseForm";
import FormDialog from "@/components/FormDialog";
import MonthPicker from "@/components/MonthPicker";
import PageHeader from "@/components/PageHeader";
import { SkeletonList } from "@/components/Skeleton";
import { useToast } from "@/components/Toaster";
import { apiFetch } from "@/lib/api";
import { monthLabel } from "@/lib/dates";
import { Plus, Receipt, SearchX, Tags, Trash2 } from "@/lib/icons";
import { formatCents } from "@/lib/money";
import type { CategoryDTO, ExpenseDTO } from "@/lib/types";
import { useCurrentMonth } from "@/lib/use-current-month";

/** "2026-10-05T00:00:00.000Z" → "Mon, Oct 5" (UTC parts — never shifts, D13). */
function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseDTO[] | null>(null);
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
        const [expenseData, categoryData] = await Promise.all([
          apiFetch<ExpenseDTO[]>(`/api/expenses?${params.toString()}`),
          apiFetch<CategoryDTO[]>("/api/categories"),
        ]);
        if (!cancelled) {
          setExpenses(expenseData);
          setCategories(categoryData);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setExpenses(null);
          setCategories(null);
          setLoadError(err instanceof Error ? err.message : "Failed to load expenses");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, month, categoryFilterIds]);

  async function handleDelete(expense: ExpenseDTO) {
    const label = `${expense.category.name} ${formatCents(expense.amountCents)} on ${expense.date.slice(0, 10)}`;
    const confirmed = await confirm({
      title: "Delete expense?",
      description: `This permanently removes ${label}.`,
      confirmLabel: "Delete expense",
    });
    if (!confirmed) return;

    setActionError(null);
    try {
      await apiFetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
      toast({ tone: "success", title: "Expense deleted", description: label });
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete expense";
      setActionError(message);
      toast({ tone: "error", title: "Could not delete expense", description: message });
    }
  }

  const expenseCategories = (categories ?? []).filter((category) => category.kind === "EXPENSE");
  const hasExpenseCategories = expenseCategories.length > 0;

  // Group (already newest-first) expenses by date (day).
  const groups: { date: string; items: ExpenseDTO[] }[] = [];
  for (const expense of expenses ?? []) {
    const last = groups[groups.length - 1];
    if (last && last.date === expense.date) {
      last.items.push(expense);
    } else {
      groups.push({ date: expense.date, items: [expense] });
    }
  }

  const listTotalCents = (expenses ?? []).reduce((sum, expense) => sum + expense.amountCents, 0);

  const emptyListState =
    categories !== null && !hasExpenseCategories ? (
      <EmptyState
        icon={Tags}
        title="No expense categories yet"
        description="Create at least one expense category (e.g., Bills, Needs) before logging expenses."
        actionHref="/categories"
        actionLabel="Create categories"
      />
    ) : categoryFilterIds.length > 0 ? (
      <EmptyState
        icon={SearchX}
        title="No matching expenses"
        description="Nothing matches this month + category filter. Try another category or month."
      />
    ) : (
      <EmptyState
        icon={Receipt}
        title="No expenses in this month"
        description={
          month
            ? `Nothing logged for ${monthLabel(month)} yet. Add your first expense.`
            : "Add your first expense."
        }
      />
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Log spending against your expense categories, filtered by month and categories."
        actions={
          <button type="button" onClick={() => setFormOpen(true)} className="btn-primary">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add expense
          </button>
        }
      />

      <section className="card flex flex-col gap-3 p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <MonthPicker month={month} onChange={setMonthState} />
          <CategoryMultiSelect
            options={expenseCategories}
            selected={categoryFilterIds}
            onChange={setCategoryFilterIds}
            hint="Filters the list and its total."
          />
        </div>
      </section>

      {actionError ? <p className="alert-danger">{actionError}</p> : null}

      {expenses === null ? (
        loadError ? (
          <p className="alert-danger">{loadError}</p>
        ) : (
          <SkeletonList label="Loading expenses…" rows={5} />
        )
      ) : expenses.length === 0 ? (
        emptyListState
      ) : (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <p className="text-sm text-ink-muted">
              {expenses.length === 1 ? "1 expense" : `${expenses.length} expenses`} ·{" "}
              <span className="font-medium text-ink">{month ? monthLabel(month) : ""}</span>
            </p>
            <p className="text-sm text-ink-muted">
              Total{" "}
              <span className="money font-semibold text-ink">{formatCents(listTotalCents)}</span>
            </p>
          </div>

          {groups.map((group) => {
            const dayTotal = group.items.reduce((sum, item) => sum + item.amountCents, 0);
            return (
              <section key={group.date}>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
                    {shortDate(group.date)}
                  </h3>
                  <span className="money text-xs text-ink-muted">{formatCents(dayTotal)}</span>
                </div>
                <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
                  {group.items.map((expense) => (
                    <ViewTransition key={expense.id} enter="auto" exit="auto">
                      <li className="flex flex-wrap items-center gap-x-3 gap-y-2 p-4 transition-colors hover:bg-surface-muted/60">
                        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 rounded-full"
                            style={{
                              backgroundColor: expense.category.color ?? "var(--chart-other)",
                            }}
                          />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink">
                            {expense.category.name}
                          </p>
                          {expense.note ? (
                            <p className="mt-0.5 text-sm text-ink-muted">{expense.note}</p>
                          ) : null}
                        </div>
                        <span className="money text-sm font-semibold text-ink">
                          {formatCents(expense.amountCents)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(expense)}
                          aria-label={`Delete ${expense.category.name} expense of ${formatCents(
                            expense.amountCents,
                          )}`}
                          title="Delete expense"
                          className="icon-button hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      </li>
                    </ViewTransition>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <FormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Add expense"
        description="Log spending against one of your expense categories."
      >
        <ExpenseForm
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
