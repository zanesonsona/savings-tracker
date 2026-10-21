"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "@/lib/icons";
import { monthLabel, shiftMonth } from "@/lib/dates";
import { useCurrentMonth } from "@/lib/use-current-month";

/**
 * Month navigation shared by Dashboard/Expenses/Savings (T34). The label is
 * announced politely when the month changes; "Today" is only enabled once the
 * client knows the current UTC month (avoids SSR/hydration drift).
 */
export default function MonthPicker({
  month,
  onChange,
  disabled = false,
  className = "",
}: {
  month: string;
  onChange: (month: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const current = useCurrentMonth();
  const isCurrent = current !== "" && month === current;
  const unavailable = disabled || !month;

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-control border border-line bg-surface p-1 ${className}`}
    >
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        disabled={unavailable}
        aria-label="Previous month"
        className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </button>
      <span
        aria-live="polite"
        className="inline-flex min-w-28 items-center justify-center gap-1.5 px-1 text-sm font-medium whitespace-nowrap text-ink tabular-nums"
      >
        <CalendarDays aria-hidden="true" className="h-4 w-4 text-brand" />
        {month ? monthLabel(month) : "…"}
      </span>
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        disabled={unavailable}
        aria-label="Next month"
        className="inline-flex h-9 w-9 items-center justify-center rounded-control text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange(current)}
        disabled={unavailable || isCurrent || current === ""}
        className="ml-1 rounded-control px-2 py-1 text-xs font-medium text-brand transition-colors hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40"
      >
        Today
      </button>
    </div>
  );
}
