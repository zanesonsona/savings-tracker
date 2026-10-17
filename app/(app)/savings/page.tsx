"use client";

import { useEffect, useState, type FormEvent } from "react";
import EmptyState from "@/components/EmptyState";
import CategoryMultiSelect from "@/components/CategoryMultiSelect";
import { apiFetch } from "@/lib/api";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { formatCents, toCents } from "@/lib/money";
import type { CategoryDTO, SavingsListResponse } from "@/lib/types";
import { useCurrentMonth } from "@/lib/use-current-month";
import { useToday } from "@/lib/use-today";

const INPUT_CLASS = "field";

const BUTTON_PRIMARY = "btn-primary";

const BUTTON_SECONDARY = "btn-secondary";

const BUTTON_DANGER = "btn-danger";

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
  const [categoryFilterIds, setCategoryFilterIds] = useState<number[]>([]); // [] = all categories

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
      ? "font-medium text-danger"
      : monthNetCents > 0
        ? "font-medium text-success"
        : "font-medium text-ink";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Savings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Track deposits and withdrawals across your savings categories, filtered by month
          and categories.
        </p>
      </header>

      <section className="rounded-panel border border-line bg-surface p-6">
        <h2 className="text-sm font-medium text-ink-muted">Savings balance (all-time)</h2>
        <p
          className={`mt-1 text-3xl font-semibold ${
            balanceCents < 0 ? "text-danger" : "text-ink"
          }`}
        >
          {data ? formatCents(balanceCents) : "—"}
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Net in {month ? monthLabel(month) : "…"}:{" "}
          {data ? <span className={netClass}>{formatCents(monthNetCents)}</span> : "—"}
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-3 rounded-panel border border-line bg-surface p-4">
        <button
          type="button"
          onClick={() => setMonthState(shiftMonth(month, -1))}
          disabled={!month}
          aria-label="Previous month"
          className={BUTTON_SECONDARY}
        >
          ← Prev
        </button>
        <span className="min-w-40 text-center text-sm font-medium text-ink">
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
          options={savingsCategories}
          selected={categoryFilterIds}
          onChange={setCategoryFilterIds}
          hint="Filters the list and the month's net — the balance stays all-time."
        />
      </div>

      <form onSubmit={handleCreate} className="rounded-panel border border-line bg-surface p-4">
        <h2 className="text-sm font-medium text-ink">Add savings entry</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div
            role="group"
            aria-label="Direction"
            className="inline-flex overflow-hidden rounded-control border border-line"
          >
            <button
              type="button"
              onClick={() => setDirection("DEPOSIT")}
              aria-pressed={direction === "DEPOSIT"}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                direction === "DEPOSIT"
                  ? "bg-accent text-on-accent"
                  : "bg-surface text-ink hover:bg-surface-muted"
              }`}
            >
              Deposit
            </button>
            <button
              type="button"
              onClick={() => setDirection("WITHDRAWAL")}
              aria-pressed={direction === "WITHDRAWAL"}
              className={`border-l border-line px-3 py-2 text-sm font-medium transition-colors ${
                direction === "WITHDRAWAL"
                  ? "bg-accent text-on-accent"
                  : "bg-surface text-ink hover:bg-surface-muted"
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
        {formError ? <p className="mt-2 alert-danger">{formError}</p> : null}
      </form>

      {actionError ? <p className="alert-danger">{actionError}</p> : null}

      {data === null ? (
        loadError ? (
          <p className="alert-danger">{loadError}</p>
        ) : (
          <p className="text-sm text-ink-muted">Loading…</p>
        )
      ) : data.entries.length === 0 ? (
        categories !== null && !hasSavingsCategories ? (
          <EmptyState
            title="No savings categories yet"
            description="Create a category with kind = Savings (e.g., an emergency fund) before logging deposits or withdrawals."
            actionHref="/categories"
            actionLabel="Create categories"
          />
        ) : categoryFilterIds.length > 0 ? (
          <EmptyState
            title="No matching entries"
            description="Nothing matches this month + category filter. Try another category or month."
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
        <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
          {data.entries.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-4">
              <span className="text-sm text-ink-muted">{shortDate(entry.date)}</span>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: entry.category.color ?? "#94a3b8" }}
                />
                {entry.category.name}
              </span>
              {entry.note ? <span className="text-sm text-ink-muted">{entry.note}</span> : null}
              <span
                className={`ml-auto font-medium ${
                  entry.direction === "DEPOSIT" ? "text-success" : "text-danger"
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
