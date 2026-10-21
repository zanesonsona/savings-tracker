"use client";

import { Check } from "@/lib/icons";
import type { CategoryKind } from "@/lib/types";

export interface CategoryOption {
  id: number;
  name: string;
  kind: CategoryKind;
  color?: string | null;
}

/**
 * Toggle-chip multi-select for categories (T29, D19). An empty selection means
 * "all": the Clear button appears whenever a subset is active. Used by the
 * Expenses, Savings and Dashboard filters.
 */
export default function CategoryMultiSelect({
  label = "Categories",
  options,
  selected,
  onChange,
  hint,
}: {
  label?: string;
  options: CategoryOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
  hint?: string;
}) {
  if (options.length === 0) return null;

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      {selected.length > 0 ? (
        <button
          type="button"
          onClick={() => onChange([])}
          className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-muted"
        >
          Clear
        </button>
      ) : (
        <span className="inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-medium text-on-brand">
          <Check aria-hidden="true" className="h-3 w-3" />
          All
        </span>
      )}
      {options.map((option) => {
        const active = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => toggle(option.id)}
            aria-pressed={active}
            className={
              active
                ? "inline-flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-medium text-on-brand transition-colors"
                : "inline-flex items-center gap-1 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink transition-colors hover:bg-surface-muted"
            }
          >
            {active ? (
              <Check aria-hidden="true" className="h-3 w-3" />
            ) : option.color ? (
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: option.color }}
              />
            ) : null}
            {option.name}
          </button>
        );
      })}
      {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
    </div>
  );
}
