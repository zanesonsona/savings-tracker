"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import EmptyState from "@/components/EmptyState";
import { apiFetch } from "@/lib/api";
import { splitIncome } from "@/lib/allocation";
import { monthLabel } from "@/lib/dates";
import { formatCents, toCents } from "@/lib/money";
import type { CategoryDTO, IncomeDTO } from "@/lib/types";
import { useToday } from "@/lib/use-today";

const INPUT_CLASS =
  "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none";

const BUTTON_PRIMARY =
  "rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_DANGER =
  "rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50";

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

  const today = useToday();
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  // `null` = untouched (falls back to local today); "" = cleared by the user.
  const [date, setDate] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const dateValue = date ?? today;
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    if (!dateValue) {
      setFormError("Pick a date.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch<IncomeDTO>("/api/incomes", {
        method: "POST",
        body: JSON.stringify({
          amountCents,
          source: source.trim() || undefined,
          date: dateValue,
          note: note.trim() || undefined,
        }),
      });
      setAmount("");
      setSource("");
      setNote("");
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save income");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(income: IncomeDTO) {
    const label = `${formatCents(income.amountCents)} on ${income.date.slice(0, 10)}`;
    if (!window.confirm(`Delete income of ${label}?`)) return;
    setActionError(null);
    try {
      await apiFetch(`/api/incomes/${income.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete income");
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

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Income</h1>
        <p className="mt-1 text-sm text-slate-500">
          Log each paycheck — it is split across your categories by their percentages.
        </p>
      </header>

      <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium text-slate-900">Add income</h2>
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
          <input
            value={source}
            onChange={(event) => setSource(event.target.value)}
            maxLength={60}
            placeholder="Source (e.g. Salary)"
            className={INPUT_CLASS}
            aria-label="Source"
          />
          <input
            type="date"
            value={dateValue}
            onChange={(event) => setDate(event.target.value)}
            required
            className={INPUT_CLASS}
            aria-label="Date"
          />
          <button type="submit" disabled={saving} className={BUTTON_PRIMARY}>
            {saving ? "Saving…" : "Add income"}
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

      {!hasCategories && categories !== null ? (
        <EmptyState
          title="No categories yet"
          description="Income can only be split once you create categories (e.g., Bills, Needs, Debts, Savings)."
          actionHref="/categories"
          actionLabel="Create categories"
        />
      ) : null}

      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

      {incomes === null ? (
        loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : (
          <p className="text-sm text-slate-500">Loading…</p>
        )
      ) : incomes.length === 0 ? (
        <EmptyState
          title="No income yet"
          description="Add your first paycheck above and you will see how it splits across your categories."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.month}>
              <h2 className="mb-2 text-sm font-medium text-slate-500">
                {monthLabel(group.month)}
              </h2>
              <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {group.items.map((income) => {
                  const split = splitIncome(
                    income.amountCents,
                    (categories ?? []).map((c) => ({ id: c.id, percentage: c.percentage })),
                  );
                  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
                  return (
                    <li key={income.id} className="p-4">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-sm font-medium text-slate-900">
                          {shortDate(income.date)}
                        </span>
                        <span className="text-sm text-slate-700">
                          {income.source ?? "No source"}
                        </span>
                        {income.note ? (
                          <span className="text-sm text-slate-400">{income.note}</span>
                        ) : null}
                        <span className="ml-auto font-medium text-slate-900">
                          {formatCents(income.amountCents)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(income)}
                          className={BUTTON_DANGER}
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {!hasCategories ? (
                          <Link href="/categories" className="text-xs text-slate-500 underline">
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
                                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
                                  >
                                    <span
                                      className="h-2 w-2 rounded-full"
                                      style={{ backgroundColor: category?.color ?? "#94a3b8" }}
                                    />
                                    {category?.name ?? "…"}
                                    <span className="font-medium">
                                      {formatCents(allocation.amountCents)}
                                    </span>
                                  </span>
                                );
                              })}
                            {split.unallocatedCents > 0 ? (
                              <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                                Unallocated {formatCents(split.unallocatedCents)}
                              </span>
                            ) : null}
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
