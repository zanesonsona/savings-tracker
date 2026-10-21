/** Thin progress bar (0…1). Over 100% renders red and clamps at full width. */
export default function ProgressBar({
  progress,
  label = "Budget usage",
}: {
  progress: number;
  label?: string;
}) {
  const over = progress > 1;
  const width = Math.max(0, Math.min(progress, 1)) * 100;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
      aria-valuetext={`${Math.round(Math.max(0, progress) * 100)}% used${over ? " (over budget)" : ""}`}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-muted"
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${
          over ? "bg-danger" : "bg-brand"
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
