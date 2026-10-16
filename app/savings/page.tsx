"use client";

import { useEffect, useState, type FormEvent } from "react";
import EmptyState from "@/components/EmptyState";
import { apiFetch } from "@/lib/api";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { formatCents, toCents } from "@/lib/money";
import type { CategoryDTO, SavingsListResponse } from "@/lib/types";
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

type Direction = "DEPOSIT" | "WITHDRAWAL";

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

  // Month filter: client-only default ("" until hydrated), prev/next via shiftMonth.
  const [monthState, setMonthState] = useState<string | null>(null);
  const clientMonth = useCurrentMonth();
  const month = monthState ?? clientMonth;

  const today = useToday();
  const [direction, setDirection] = useState<Direction>("DEPOSIT");
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
        const [savingsData, categoryData] = await Promise.all([
          apiFetch<SavingsListResponse>(`/api/savings?month=${month}`),
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
  }, [refreshKey, month]);

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
      setFormError("Pick a savings category.");
      return;
    }
    if (!dateValue) {
      setFormError("Pick a date.");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/savings", {
        method: "POST",
        body: JSON.stringify({
          amountCents,
          direction,
          categoryId: Number(categoryId),
          date: dateValue,
          note: note.trim() || undefined,
        }),
      });
      setAmount("");
      setNote("");
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number, label: string) {
    if (!window.confirm(`Delete ${label}?`)) return;
    setActionError(null);
    try {
      await apiFetch(`/api/savings/${id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete entry");
    }
  }

  const savingsCategories = (categories ?? []).filter((c) => c.kind === "SAVINGS");
  const hasSavingsCategories = savingsCategories.length > 0;

  const balanceCents = data?.balanceCents ?? 0;
  const monthNetCents = data?.monthNetCents ?? 0;
  const netClass =
    monthNetCents < 0
      ? "font-medium text-red-600"
      : monthNetCents > 0
        ? "font-medium text-green-600"
        : "font-medium text-slate-900";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Savings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track deposits and withdrawals across your savings categories.
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-sm font-medium text-slate-500">Savings balance (all-time)</h2>
        <p
          className={`mt-1 text-3xl font-semibold ${
            balanceCents < 0 ? "text-red-600" : "text-slate-900"
          }`}
        >
          {data ? formatCents(balanceCents) : "—"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Net in {month ? monthLabel(month) : "…"}:{" "}
          {data ? <span className={netClass}>{formatCents(monthNetCents)}</span> : "—"}
        </p>
      </section>

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
      </div>

      <form onSubmit={handleCreate} className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-medium text-slate-900">Add savings entry</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Direction"
            className="inline-flex overflow-hidden rounded-md border border-slate-300"
          >
            <button
              type="button"
              onClick={() => setDirection("DEPOSIT")}
              aria-pressed={direction === "DEPOSIT"}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                direction === "DEPOSIT"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Deposit
            </button>
            <button
              type="button"
              onClick={() => setDirection("WITHDRAWAL")}
              aria-pressed={direction === "WITHDRAWAL"}
              className={`border-l border-slate-300 px-3 py-2 text-sm font-medium transition-colors ${
                direction === "WITHDRAWAL"
                  ? "bg-slate-900 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Withdrawal
            </button>
          </div>
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
            aria-label="Savings category"
            className={INPUT_CLASS}
          >
            <option value="" disabled>
              {hasSavingsCategories ? "Select savings category" : "No savings categories"}
            </option>
            {savingsCategories.map((category) => (
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
            disabled={saving || !hasSavingsCategories}
            className={BUTTON_PRIMARY}
          >
            {saving ? "Saving…" : "Add entry"}
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

      {data === null ? (
        loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : (
          <p className="text-sm text-slate-500">Loading…</p>
        )
      ) : data.entries.length === 0 ? (
        categories !== null && !hasSavingsCategories ? (
          <EmptyState
            title="No savings categories yet"
            description="Create a category with kind = Savings (e.g., an emergency fund) before logging deposits or withdrawals."
            actionHref="/categories"
            actionLabel="Create categories"
          />
        ) : (
          <EmptyState
            title="No activity in this month"
            description={
              month
                ? `No deposits or withdrawals logged for ${monthLabel(month)} yet. Add an entry above.`
                : "Add your first deposit above."
            }
          />
        )
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {data.entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-4">
              <span className="text-sm text-slate-500">{shortDate(entry.date)}</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.category.color ?? "#94a3b8" }}
                />
                {entry.category.name}
              </span>
              {entry.note ? <span className="text-sm text-slate-400">{entry.note}</span> : null}
              <span
                className={`ml-auto font-medium ${
                  entry.direction === "DEPOSIT" ? "text-green-600" : "text-red-600"
                }`}
              >
                {entry.direction === "DEPOSIT" ? "+" : "-"}
                {formatCents(entry.amountCents)}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleDelete(
                    entry.id,
                    `${entry.direction === "DEPOSIT" ? "deposit" : "withdrawal"} of ${formatCents(
                      entry.amountCents,
                    )} (${entry.category.name})`,
                  )
                }
                className={BUTTON_DANGER}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
