"use client";

import { useState, type FormEvent } from "react";
import { useToast } from "@/components/Toaster";
import { apiFetch } from "@/lib/api";
import { Plus } from "@/lib/icons";
import { currencySymbol, formatCents, toCents } from "@/lib/money";
import type { IncomeDTO } from "@/lib/types";
import { useToday } from "@/lib/use-today";

/**
 * T37 — add-income form. Same validation, error copy and POST payload as the
 * inline T29 form; the page owns opening/closing the FormDialog.
 */
export default function IncomeForm({
  onSaved,
  onCancel,
}: {
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const today = useToday();
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
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
      toast({
        tone: "success",
        title: "Income added",
        description: `${formatCents(amountCents)}${source.trim() ? ` from ${source.trim()}` : ""}.`,
      });
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save income");
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="income-amount" className="input-label">
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
              id="income-amount"
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
          <label htmlFor="income-date" className="input-label">
            Date
          </label>
          <input
            id="income-date"
            type="date"
            value={dateValue}
            onChange={(event) => setDate(event.target.value)}
            required
            className="field mt-1 w-full"
          />
        </div>
      </div>

      <div>
        <label htmlFor="income-source" className="input-label">
          Source <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="income-source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
          maxLength={60}
          placeholder="Salary, freelance, refund…"
          className="field mt-1 w-full"
        />
      </div>

      <div>
        <label htmlFor="income-note" className="input-label">
          Note <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="income-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={200}
          placeholder="Anything worth remembering"
          className="field mt-1 w-full"
        />
      </div>

      <p className="field-hint">
        Income is split across your categories by their current percentages.
      </p>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          <Plus aria-hidden="true" className="h-4 w-4" />
          {saving ? "Saving…" : "Add income"}
        </button>
      </div>
    </form>
  );
}
