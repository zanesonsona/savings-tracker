/**
 * Loading placeholder (T34). Decorative by default so screen readers don't
 * announce empty boxes; callers pair it with a visible/aria-live loading text
 * where the state matters.
 */
export default function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-control bg-surface-muted motion-reduce:animate-none ${className}`}
    />
  );
}

/** Rows-shaped loading placeholder shared by the income/expense/savings lists. */
export function SkeletonList({
  rows = 4,
  label = "Loading…",
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <div role="status" className="divide-y divide-line rounded-panel border border-line bg-surface">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 p-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 shrink-0" />
        </div>
      ))}
      <span className="sr-only">{label}</span>
    </div>
  );
}
