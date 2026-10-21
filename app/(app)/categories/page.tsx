"use client";

import { useEffect, useState, ViewTransition } from "react";
import CategoryEditor from "@/components/CategoryEditor";
import { useConfirm } from "@/components/ConfirmDialog";
import EmptyState from "@/components/EmptyState";
import PageHeader from "@/components/PageHeader";
import ProgressBar from "@/components/ProgressBar";
import { SkeletonList } from "@/components/Skeleton";
import { useToast } from "@/components/Toaster";
import { apiFetch } from "@/lib/api";
import { Pencil, Tags, Trash2 } from "@/lib/icons";
import type { CategoryDTO, CategoryKind } from "@/lib/types";

const KIND_BADGE: Record<CategoryKind, string> = {
  EXPENSE: "badge-warning",
  SAVINGS: "badge-success",
};

/** Trim trailing zeros from a percentage for display (35 → "35", 33.33 → "33.33"). */
const pct = (value: number) => Number(value.toFixed(2)).toString();

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const reload = () => setRefreshKey((key) => key + 1);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { toast } = useToast();
  const { confirm, dialog } = useConfirm();

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

  async function handleDelete(category: CategoryDTO) {
    const confirmed = await confirm({
      title: "Delete category?",
      description: `This permanently removes "${category.name}" and its ${pct(
        category.percentage,
      )}% split rule. Categories with logged entries cannot be deleted.`,
      confirmLabel: "Delete category",
    });
    if (!confirmed) return;

    setActionError(null);
    try {
      await apiFetch(`/api/categories/${category.id}`, { method: "DELETE" });
      toast({ tone: "success", title: "Category deleted", description: category.name });
      if (editingId === category.id) setEditingId(null);
      reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete category";
      setActionError(message);
      toast({ tone: "error", title: "Could not delete category", description: message });
    }
  }

  function handleSaved(category: CategoryDTO, mode: "create" | "update") {
    if (mode === "update") setEditingId(null);
    toast({
      tone: "success",
      title: mode === "create" ? "Category added" : "Category updated",
      description: `${category.name} · ${pct(category.percentage)}%`,
    });
    reload();
  }

  const totalPct = categories?.reduce((sum, category) => sum + category.percentage, 0) ?? 0;
  const unallocatedPct = Math.max(0, 100 - totalPct);
  const fullyAllocated = totalPct >= 100;
  const editingCategory = categories?.find((category) => category.id === editingId) ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categories"
        description="Your own buckets — income is split across them by percentage. Nothing is preset for you."
        actions={
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
        }
      />

      <section className="card p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">Income allocation</h2>
          <span className="text-xs text-ink-muted">
            {fullyAllocated ? "Fully allocated" : `${pct(unallocatedPct)}% left to assign`}
          </span>
        </div>
        <div className="mt-3">
          <ProgressBar progress={totalPct / 100} label="Allocation assigned" />
        </div>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2 text-xs text-ink-muted">
          <span>{pct(totalPct)}% of every income entry is assigned.</span>
          <span>Savings categories only receive their share when you log a savings entry.</span>
        </div>
      </section>

      <section className="card p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink">Add a category</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          Pick a name, kind, percentage and color. Percentages can total up to 100%.
        </p>
        <div className="mt-4">
          <CategoryEditor onSaved={handleSaved} />
        </div>
      </section>

      {actionError ? <p className="alert-danger">{actionError}</p> : null}

      {categories === null ? (
        loadError ? (
          <p className="alert-danger">{loadError}</p>
        ) : (
          <SkeletonList label="Loading categories…" rows={4} />
        )
      ) : categories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Create your own buckets (e.g., Bills, Needs, Debts, Savings) — nothing is preset for you."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-panel border border-line bg-surface">
          {categories.map((category) => (
            <ViewTransition key={category.id} enter="auto" exit="auto">
              <li className="p-4">
                {editingId === category.id ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-ink">Edit {category.name}</p>
                    <CategoryEditor
                      category={category}
                      onSaved={handleSaved}
                      onCancel={() => setEditingId(null)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color ?? "var(--chart-other)" }}
                    />
                    <span className="text-sm font-semibold text-ink">{category.name}</span>
                    <span className={`badge ${KIND_BADGE[category.kind]}`}>
                      {category.kind === "EXPENSE" ? "Expense" : "Savings"}
                    </span>
                    <span className="money text-sm text-ink-muted">
                      {pct(category.percentage)}%
                    </span>
                    <span className="text-sm text-ink-muted">
                      {category.expenseCount} expense(s) · {category.savingsCount} savings entr(ies)
                    </span>
                    <span className="ml-auto flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setActionError(null);
                          setEditingId(category.id);
                        }}
                        className="btn-secondary"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        aria-label={`Delete ${category.name}`}
                        title="Delete category"
                        className="icon-button hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 aria-hidden="true" className="h-4 w-4" />
                      </button>
                    </span>
                  </div>
                )}
              </li>
            </ViewTransition>
          ))}
        </ul>
      )}

      {editingId !== null && !editingCategory ? (
        <p className="alert-warning">That category changed. Close the editor and try again.</p>
      ) : null}

      {dialog}
    </div>
  );
}
