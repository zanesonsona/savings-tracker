import type { LucideIcon } from "lucide-react";

export type StatTone = "default" | "positive" | "negative";

export interface StatDelta {
  label: string;
  tone: "positive" | "negative" | "neutral";
}

const VALUE_TONE: Record<StatTone, string> = {
  default: "text-ink",
  positive: "text-success",
  negative: "text-danger",
};

const DELTA_TONE: Record<StatDelta["tone"], string> = {
  positive: "text-success",
  negative: "text-danger",
  neutral: "text-ink-muted",
};

/** Compact KPI card used across the dashboard (T36). */
export default function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  delta,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  sub?: string;
  delta?: StatDelta;
  tone?: StatTone;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">{label}</p>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
      </div>
      <p className={`money mt-2 text-xl font-semibold sm:text-2xl ${VALUE_TONE[tone]}`}>{value}</p>
      {delta ? (
        <p className={`mt-1 text-xs ${DELTA_TONE[delta.tone]}`}>{delta.label}</p>
      ) : sub ? (
        <p className="mt-1 text-xs text-ink-muted">{sub}</p>
      ) : null}
    </div>
  );
}
