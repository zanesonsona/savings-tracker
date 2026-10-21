"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/Toaster";
import { apiFetch } from "@/lib/api";
import { ArrowDownLeft, ArrowUpRight, Plus } from "@/lib/icons";
import { currencySymbol, formatCents, toCents } from "@/lib/money";
import type { CategoryDTO } from "@/lib/types";
import { useToday } from "@/lib/use-today";

type Direction = "DEPOSIT" | "WITHDRAWAL";

/**
 * T37 — savings deposit/withdrawal form. Direction, validation and error copy
 * are unchanged from the inline form.
 */
export default function SavingsForm({
  categories,
  onSaved,
  onCancel,
}: {
  categories: CategoryDTO[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const today = useToday();
  const savingsCategories = categories.filter((category) => category.kind === "SAVINGS");
  const hasSavingsCategories = savingsCategories.length > 0;

  const [direction, setDirection] = useState<Direction>("DEPOSIT");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  // `null` = untouched (falls back to local today); "" = cleared by the user.
  const [date, setDate] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const dateValue = date ?? today;
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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
      const category = savingsCategories.find((item) => item.id === Number(categoryId));
      toast({
        tone: "success",
        title: direction === "DEPOSIT" ? "Deposit added" : "Withdrawal added",
        description: `${formatCents(amountCents)}${category ? ` · ${category.name}` : ""}.`,
      });
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError ? (
        <p role="alert" className="alert-danger">
          {formError}
        </p>
      ) : null}

      {!hasSavingsCategories ? (
        <p className="alert-warning">
          Create at least one savings category before logging deposits or withdrawals.{" "}
          <Link href="/categories" className="font-medium underline underline-offset-2">
            Create categories
          </Link>
        </p>
      ) : null}

      <div>
        <span className="input-label">Direction</span>
        <div
          role="group"
          aria-label="Direction"
          className="mt-1 inline-flex w-full overflow-hidden rounded-control border border-line sm:w-auto"
        >
          <button
            type="button"
            onClick={() => setDirection("DEPOSIT")}
            aria-pressed={direction === "DEPOSIT"}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
              direction === "DEPOSIT"
                ? "bg-brand text-on-brand"
                : "bg-surface text-ink hover:bg-surface-muted"
            }`}
          >
            <ArrowDownLeft aria-hidden="true" className="h-4 w-4" />
            Deposit
          </button>
          <button
            type="button"
            onClick={() => setDirection("WITHDRAWAL")}
            aria-pressed={direction === "WITHDRAWAL"}
            className={`inline-flex flex-1 items-center justify-center gap-1.5 border-l border-line px-3 py-2 text-sm font-medium transition-colors sm:flex-none ${
              direction === "WITHDRAWAL"
                ? "bg-brand text-on-brand"
                : "bg-surface text-ink hover:bg-surface-muted"
            }`}
          >
            <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            Withdrawal
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="savings-amount" className="input-label">
            Amount
          </label>
          <div className="relative mt-1">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-ink-muted"
            >
              {currencySymbol()}
            </span>
            <input
              id="savings-amount"
              data-autofocus
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              inputMode="decimal"
              placeholder="5000.00"
              className="field w-full pl-7"
            />
          </div>
        </div>
        <div>
          <label htmlFor="savings-date" className="input-label">
            Date
          </label>
          <input
            id="savings-date"
            type="date"
            value={dateValue}
            onChange={(event) => setDate(event.target.value)}
            required
            className="field mt-1 w-full"
          />
        </div>
      </div>

      <div>
        <label htmlFor="savings-category" className="input-label">
          Savings category
        </label>
        <select
          id="savings-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          required
          className="field mt-1 w-full"
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
      </div>

      <div>
        <label htmlFor="savings-note" className="input-label">
          Note <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="savings-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={200}
          placeholder="Anything worth remembering"
          className="field mt-1 w-full"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !hasSavingsCategories}
          className="btn-primary"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {saving ? "Saving…" : "Add entry"}
        </button>
      </div>
    </form>
  );
}
