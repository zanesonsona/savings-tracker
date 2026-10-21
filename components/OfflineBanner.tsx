"use client";

import { WifiOff } from "@/lib/icons";
import { useOnline } from "@/lib/use-online";

/**
 * T39 — in-app connectivity notice. Rendered by the signed-in shell; the
 * public `/offline` fallback has its own full-page message.
 */
export default function OfflineBanner() {
  const online = useOnline();
  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-4 flex items-start gap-3 rounded-panel border border-warning-border bg-warning-soft px-4 py-3 text-sm text-warning"
    >
      <WifiOff aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="font-semibold">You&apos;re offline</p>
        <p className="mt-0.5 opacity-90">
          Reconnect to load or change your data. Financial data is never stored in the offline
          cache.
        </p>
      </div>
    </div>
  );
}
