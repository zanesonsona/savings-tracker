"use client";

import { useEffect, useState, type FormEvent } from "react";
import EmptyState from "@/components/EmptyState";
import { apiFetch } from "@/lib/api";
import type { CategoryDTO, CategoryKind } from "@/lib/types";

const KIND_BADGE: Record<CategoryKind, string> = {
  EXPENSE: "badge-warning",
  SAVINGS: "badge-success",
};

const INPUT_CLASS = "field";

const BUTTON_PRIMARY = "btn-primary";

const BUTTON_SECONDARY = "btn-secondary";

/** Trim trailing zeros from a percentage for display (35 → "35", 33.33 → "33.33"). */
const pct = (value: number) => Number(value.toFixed(2)).toString();

interface EditDraft {
  id: number;
  name: string;
  percentage: string;
  kind: CategoryKind;
  color: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const reload = () => setRefreshKey((key) => key + 1);

  // Create form.
  const [name, setName] = useState("");
  const [percentage, setPercentage] = useState("");
  const [kind, setKind] = useState<CategoryKind>("EXPENSE");
  const [color, setColor] = useState("#64748b");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inline edit + delete.
  const [editing, setEditing] = useState<EditDraft | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch<CategoryDTO[]>("/api/categories");
        if (!cancelled) {
          setCategories(data);
          setLoadError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setCategories(null);
          setLoadError(err instanceof Error ? err.message : "Failed to load categories");
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
    const parsedPct = Number(percentage);
    if (!Number.isFinite(parsedPct) || parsedPct < 0 || parsedPct > 100) {
      setFormError("Enter a percentage between 0 and 100.");
      return;
    }
    setCreating(true);
    try {
      await apiFetch<CategoryDTO>("/api/categories", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), percentage: parsedPct, kind, color }),
      });
      setName("");
      setPercentage("");
      setKind("EXPENSE");
      setColor("#64748b");
      reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(category: CategoryDTO) {
    setActionError(null);
    setEditError(null);
    setEditing({
      id: category.id,
      name: category.name,
      percentage: pct(category.percentage),
      kind: category.kind,
      color: category.color ?? "#64748b",
    });
  }

  async function handleSaveEdit() {
    if (!editing) return;
    setEditError(null);
    const parsedPct = Number(editing.percentage);
    if (!Number.isFinite(parsedPct) || parsedPct < 0 || parsedPct > 100) {
      setEditError("Enter a percentage between 0 and 100.");
      return;
    }
    setEditSaving(true);
    try {
      await apiFetch<CategoryDTO>(`/api/categories/${editing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: editing.name.trim(),
          percentage: parsedPct,
          kind: editing.kind,
          color: editing.color,
        }),
      });
      setEditing(null);
      reload();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update category");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(category: CategoryDTO) {
    if (!window.confirm(`Delete "${category.name}"?`)) return;
    setActionError(null);
    try {
      await apiFetch(`/api/categories/${category.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete category");
    }
  }

  const totalPct = categories?.reduce((sum, c) => sum + c.percentage, 0) ?? 0;
  const unallocatedPct = Math.max(0, 100 - totalPct);
  const fullyAllocated = totalPct >= 100;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Categories</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Your own buckets — income is split across them by percentage.
          </p>
        </div>
        <div
          className={`rounded-control border px-3 py-1.5 text-sm ${
            fullyAllocated
              ? "border-success-border bg-success-soft text-success"
              : "border-line bg-surface text-ink-muted"
          }`}
        >
          Total: <span className="font-medium">{pct(totalPct)}%</span> · Unallocated:{" "}
          <span className="font-medium">{pct(unallocatedPct)}%</span>
        </div>
      </header>

      <form onSubmit={handleCreate} className="rounded-panel border border-line bg-surface p-4">
        <h2 className="text-sm font-medium text-ink">Add a category</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_9rem_9rem_4rem_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={40}
            placeholder="Name (e.g. Bills)"
            className={INPUT_CLASS}
            aria-label="Category name"
          />
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as CategoryKind)}
            className={INPUT_CLASS}
            aria-label="Category kind"
          >
            <option value="EXPENSE">Expense</option>
            <option value="SAVINGS">Savings</option>
          </select>
          <input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={percentage}
            onChange={(event) => setPercentage(event.target.value)}
            required
            placeholder="%"
            className={INPUT_CLASS}
            aria-label="Percentage"
          />
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-10 w-full cursor-pointer rounded-control border border-line bg-surface p-1"
            aria-label="Color"
          />
          <button type="submit" disabled={creating} className={BUTTON_PRIMARY}>
            {creating ? "Adding…" : "Add category"}
          </button>
        </div>
        {formError ? <p className="mt-2 alert-danger">{formError}</p> : null}
      </form>

      {actionError ? <p className="alert-danger">{actionError}</p> : null}

      {categories === null ? (
        loadError ? (
          <p className="alert-danger">{loadError}</p>
        ) : (
          <p className="text-sm text-ink-muted">Loading…</p>
        )
      ) : categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Create your own buckets (e.g., Bills, Needs, Debts, Savings) — nothing is preset for you."
        />
      ) : (
        <ul className="divide-y divide-line rounded-panel border border-line bg-surface">
          {categories.map((category) =>
            editing?.id === category.id ? (
              <li key={category.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_9rem_9rem_4rem_auto]">
                <input
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                  maxLength={40}
                  className={INPUT_CLASS}
                  aria-label="Edit name"
                />
                <select
                  value={editing.kind}
                  onChange={(event) =>
                    setEditing({ ...editing, kind: event.target.value as CategoryKind })
                  }
                  className={INPUT_CLASS}
                  aria-label="Edit kind"
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="SAVINGS">Savings</option>
                </select>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={editing.percentage}
                  onChange={(event) => setEditing({ ...editing, percentage: event.target.value })}
                  className={INPUT_CLASS}
                  aria-label="Edit percentage"
                />
                <input
                  type="color"
                  value={editing.color}
                  onChange={(event) => setEditing({ ...editing, color: event.target.value })}
                  className="h-10 w-full cursor-pointer rounded-control border border-line bg-surface p-1"
                  aria-label="Edit color"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={editSaving}
                    className={BUTTON_PRIMARY}
                  >
                    {editSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setEditError(null);
                    }}
                    className={BUTTON_SECONDARY}
                  >
                    Cancel
                  </button>
                </div>
                {editError ? (
                  <p className="alert-danger sm:col-span-5">{editError}</p>
                ) : null}
              </li>
            ) : (
              <li key={category.id} className="flex flex-wrap items-center gap-3 p-4">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color ?? "#94a3b8" }}
                />
                <span className="font-medium text-ink">{category.name}</span>
                <span
                  className={`badge ${KIND_BADGE[category.kind]}`}
                >
                  {category.kind === "EXPENSE" ? "Expense" : "Savings"}
                </span>
                <span className="text-sm text-ink-muted">{pct(category.percentage)}%</span>
                <span className="text-sm text-ink-muted">
                  {category.expenseCount} expense(s) · {category.savingsCount} savings entr(ies)
                </span>
                <span className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(category)}
                    className={BUTTON_SECONDARY}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(category)}
                    className="btn-danger"
                  >
                    Delete
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}
