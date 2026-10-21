"use client";

import { useState, type FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { Plus, Save } from "@/lib/icons";
import type { CategoryDTO, CategoryKind } from "@/lib/types";

/** Trim trailing zeros from a percentage for display (35 → "35", 33.33 → "33.33"). */
const pct = (value: number) => Number(value.toFixed(2)).toString();

/**
 * T37 — inline category create/edit. Categories stay on the page (no modal,
 * per D26), but share one styled, accessible form component.
 */
export default function CategoryEditor({
  category,
  onSaved,
  onCancel,
}: {
  category?: CategoryDTO;
  onSaved: (category: CategoryDTO, mode: "create" | "update") => void;
  onCancel?: () => void;
}) {
  const isEdit = category !== undefined;
  const [name, setName] = useState(category?.name ?? "");
  const [kind, setKind] = useState<CategoryKind>(category?.kind ?? "EXPENSE");
  const [percentage, setPercentage] = useState(
    category ? pct(category.percentage) : "",
  );
  const [color, setColor] = useState(category?.color ?? "#64748b");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    const parsedPct = Number(percentage);
    if (!Number.isFinite(parsedPct) || parsedPct < 0 || parsedPct > 100) {
      setFormError("Enter a percentage between 0 and 100.");
      return;
    }

    setSaving(true);
    try {
      const saved = await apiFetch<CategoryDTO>(
        category ? `/api/categories/${category.id}` : "/api/categories",
        {
          method: category ? "PATCH" : "POST",
          body: JSON.stringify({
            name: name.trim(),
            percentage: parsedPct,
            kind,
            color,
          }),
        },
      );
      if (isEdit) {
        onSaved(saved, "update");
      } else {
        setName("");
        setPercentage("");
        setKind("EXPENSE");
        setColor("#64748b");
        onSaved(saved, "create");
      }
    } catch (err) {
      setFormError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Failed to update category"
            : "Failed to create category",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 sm:grid-cols-[1fr_9rem_9rem_4rem_auto]"
      noValidate
    >
      <div>
        <label htmlFor={category ? `category-name-${category.id}` : "category-name"} className="sr-only">
          Category name
        </label>
        <input
          id={category ? `category-name-${category.id}` : "category-name"}
          data-autofocus
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          maxLength={40}
          placeholder="Name (e.g. Bills)"
          className="field w-full"
        />
      </div>

      <div>
        <label htmlFor={category ? `category-kind-${category.id}` : "category-kind"} className="sr-only">
          Category kind
        </label>
        <select
          id={category ? `category-kind-${category.id}` : "category-kind"}
          value={kind}
          onChange={(event) => setKind(event.target.value as CategoryKind)}
          className="field w-full"
        >
          <option value="EXPENSE">Expense</option>
          <option value="SAVINGS">Savings</option>
        </select>
      </div>

      <div>
        <label
          htmlFor={category ? `category-percentage-${category.id}` : "category-percentage"}
          className="sr-only"
        >
          Percentage
        </label>
        <input
          id={category ? `category-percentage-${category.id}` : "category-percentage"}
          type="number"
          min={0}
          max={100}
          step={0.01}
          value={percentage}
          onChange={(event) => setPercentage(event.target.value)}
          required
          placeholder="%"
          className="field w-full"
        />
      </div>

      <div>
        <label htmlFor={category ? `category-color-${category.id}` : "category-color"} className="sr-only">
          Color
        </label>
        <input
          id={category ? `category-color-${category.id}` : "category-color"}
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="h-10 w-full cursor-pointer rounded-control border border-line bg-surface p-1"
        />
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary flex-1 sm:flex-none">
          {isEdit ? (
            <Save aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Plus aria-hidden="true" className="h-4 w-4" />
          )}
          {saving ? "Saving…" : isEdit ? "Save" : "Add category"}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
        ) : null}
      </div>

      {formError ? (
        <p role="alert" className="alert-danger sm:col-span-5">
          {formError}
        </p>
      ) : null}
    </form>
  );
}
