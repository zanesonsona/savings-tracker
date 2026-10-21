import Link from "next/link";
import { Inbox, type LucideIcon } from "@/lib/icons";

export default function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  icon: Icon = Inbox,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col items-center rounded-panel border border-dashed border-line bg-surface px-6 py-10 text-center">
      <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-brand">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="btn-primary mt-4">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}
