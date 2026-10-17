"use client";

import { useEffect, useState, type FormEvent } from "react";
import EmptyState from "@/components/EmptyState";
import { apiFetch } from "@/lib/api";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { formatCents, toCents } from "@/lib/money";
import type { CategoryDTO, ExpenseDTO } from "@/lib/types";
import { useCurrentMonth } from "@/lib/use-current-month";
import { useToday } from "@/lib/use-today";

const INPUT_CLASS =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none";

const BUTTON_PRIMARY =
  "rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_SECONDARY =
  "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_DANGER =
  "rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50";

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

  // Month filter: client-only default ("" until hydrated), prev/next via shiftMonth.
  const [monthState, setMonthState] = useState<string | null>(null);
  const clientMonth = useCurrentMonth();
  const month = monthState ?? clientMonth;
  const [categoryFilter, setCategoryFilter] = useState(""); // "" = all categories

  const today = useToday();
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  // `null` = untouched (falls back to local today); "" = cleared by the user.
  const [date, setDate] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const dateValue = date ?? today;
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!month) return; // wait for the client-only month value
    let cancelled = false;
    (async () => {
      try {
        const params = new URLSearchParams({ month });
        if (categoryFilter) params.set("categoryId", categoryFilter);
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
  }, [refreshKey, month, categoryFilter]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    let amountCents: number;
    try {
      amountCents = toCents(amount);
    } catch {
      setFormError("Enter a valid amount, e.g. 1234.56");
      return;
    }
    if (amountCents <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }
    if (!categoryId) {
      setFormError("Pick a category.");
      return;
    }
    if (!dateValue) {
      setFormError("Pick a date.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch<ExpenseDTO>("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          amountCents,
          categoryId: Number(categoryId),
          date: dateValue,
          note: note.trim() || undefined,
        }),
      });
      setAmount("");
      setNote("");
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(expense: ExpenseDTO) {
    const label = `${expense.category.name} ${formatCents(expense.amountCents)} on ${expense.date.slice(0, 10)}`;
    if (!window.confirm(`Delete expense ${label}?`)) return;
    setActionError(null);
    try {
      await apiFetch(`/api/expenses/${expense.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete expense");
    }
  }

  const expenseCategories = (categories ?? []).filter((c) => c.kind === "EXPENSE");
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

  const listTotalCents = (expenses ?? []).reduce((sum, e) => sum + e.amountCents, 0);

  const emptyListState =
    categories !== null && !hasExpenseCategories ? (
      <EmptyState
        title="No expense categories yet"
        description="Create at least one expense category (e.g., Bills, Needs) before logging expenses."
        actionHref="/categories"
        actionLabel="Create categories"
      />
    ) : categoryFilter ? (
      <EmptyState
        title="No matching expenses"
        description="Nothing matches this month + category filter. Try another category or month."
      />
    ) : (
      <EmptyState
        title="No expenses in this month"
        description={
          month
            ? `Nothing logged for ${monthLabel(month)} yet. Add your first expense above.`
            : "Add your first expense above."
        }
      />
    );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Expenses</h1>
        <p className="mt-1 text-sm text-slate-500">
          Log spending against your expense categories, filtered by month.
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
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Filter by category"
          className={`ml-auto ${INPUT_CLASS}`}
        >
          <option value="">All categories</option>
          {expenseCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium text-slate-900">Add expense</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[9rem_1fr_10rem_auto]">
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
            inputMode="decimal"
            placeholder="Amount (e.g. 5000.00)"
            className={INPUT_CLASS}
            aria-label="Amount"
          />
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            required
            aria-label="Category"
            className={INPUT_CLASS}
          >
            <option value="" disabled>
              {hasExpenseCategories ? "Select category" : "No expense categories"}
            </option>
            {expenseCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateValue}
            onChange={(event) => setDate(event.target.value)}
            required
            className={INPUT_CLASS}
            aria-label="Date"
          />
          <button
            type="submit"
            disabled={saving || !hasExpenseCategories}
            className={BUTTON_PRIMARY}
          >
            {saving ? "Saving…" : "Add expense"}
          </button>
        </div>
        <input
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={200}
          placeholder="Note (optional)"
          className={`${INPUT_CLASS} mt-3 w-full`}
          aria-label="Note"
        />
        {formError ? <p className="mt-2 text-sm text-red-600">{formError}</p> : null}
      </form>

      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

      {expenses === null ? (
        loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : (
          <p className="text-sm text-slate-500">Loading…</p>
        )
      ) : expenses.length === 0 ? (
        emptyListState
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {expenses.length === 1 ? "1 expense" : `${expenses.length} expenses`} · Total{" "}
            <span className="font-medium text-slate-900">{formatCents(listTotalCents)}</span>
          </p>
          {groups.map((group) => (
            <section key={group.date}>
              <h3 className="mb-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase">
                {shortDate(group.date)}
              </h3>
              <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {group.items.map((expense) => (
                  <li
                    key={expense.id}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-4"
                  >
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: expense.category.color ?? "#94a3b8" }}
                      />
                      {expense.category.name}
                    </span>
                    {expense.note ? (
                      <span className="text-sm text-slate-400">{expense.note}</span>
                    ) : null}
                    <span className="ml-auto font-medium text-slate-900">
                      {formatCents(expense.amountCents)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(expense)}
                      className={BUTTON_DANGER}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
