"use client";

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
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {selected.length > 0 ? (
        <button
          type="button"
          onClick={() => onChange([])}
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
        >
          Clear
        </button>
      ) : (
        <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white">
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
                ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white transition-colors"
                : "rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
            }
          >
            {option.color ? (
              <span
                aria-hidden
                className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
                style={{ backgroundColor: option.color }}
              />
            ) : null}
            {option.name}
          </button>
        );
      })}
      {hint ? <span className="text-xs text-slate-400">{hint}</span> : null}
    </div>
  );
}
