"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/Toaster";
import { apiFetch } from "@/lib/api";
import { Plus } from "@/lib/icons";
import { currencySymbol, formatCents, toCents } from "@/lib/money";
import type { CategoryDTO, ExpenseDTO } from "@/lib/types";
import { useToday } from "@/lib/use-today";

/**
 * T37 — add-expense form. Mirrors the previous inline form's validation,
 * error copy and POST payload.
 */
export default function ExpenseForm({
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
  const expenseCategories = categories.filter((category) => category.kind === "EXPENSE");
  const hasExpenseCategories = expenseCategories.length > 0;

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
      const category = expenseCategories.find((item) => item.id === Number(categoryId));
      toast({
        tone: "success",
        title: "Expense added",
        description: `${formatCents(amountCents)}${category ? ` · ${category.name}` : ""}.`,
      });
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save expense");
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

      {!hasExpenseCategories ? (
        <p className="alert-warning">
          Create at least one expense category before logging expenses.{" "}
          <Link href="/categories" className="font-medium underline underline-offset-2">
            Create categories
          </Link>
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="expense-amount" className="input-label">
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
              id="expense-amount"
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
          <label htmlFor="expense-date" className="input-label">
            Date
          </label>
          <input
            id="expense-date"
            type="date"
            value={dateValue}
            onChange={(event) => setDate(event.target.value)}
            required
            className="field mt-1 w-full"
          />
        </div>
      </div>

      <div>
        <label htmlFor="expense-category" className="input-label">
          Category
        </label>
        <select
          id="expense-category"
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          required
          className="field mt-1 w-full"
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
      </div>

      <div>
        <label htmlFor="expense-note" className="input-label">
          Note <span className="font-normal text-ink-muted">(optional)</span>
        </label>
        <input
          id="expense-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={200}
          placeholder="What was it for?"
          className="field mt-1 w-full"
        />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !hasExpenseCategories}
          className="btn-primary"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          {saving ? "Saving…" : "Add expense"}
        </button>
      </div>
    </form>
  );
}
