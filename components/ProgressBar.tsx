/** Thin progress bar (0…1). Over 100% renders red and clamps at full width. */
export default function ProgressBar({ progress }: { progress: number }) {
  const over = progress > 1;
  const width = Math.max(0, Math.min(progress, 1)) * 100;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
      <div
        className={`h-full rounded-full ${over ? "bg-danger" : "bg-accent"}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
