import type { Metadata } from "next";
import OfflineRetry from "@/components/OfflineRetry";
import { PiggyBank, ShieldCheck, WifiOff } from "@/lib/icons";

export const metadata: Metadata = { title: "Offline · Savings Tracker" };

/**
 * T39 — public, nav-free offline fallback. It makes no auth/API calls and is
 * the only HTML response the service worker is allowed to cache.
 */
export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-control bg-brand text-on-brand">
            <PiggyBank aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="text-base font-semibold tracking-tight text-ink">Savings Tracker</span>
        </div>

        <div className="card-raised p-6 text-center sm:p-8">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-warning-soft text-warning">
            <WifiOff aria-hidden="true" className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">
            You&apos;re offline
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Savings Tracker needs a connection to load your account and entries. Reconnect, then
            try again.
          </p>
          <div className="mt-6">
            <OfflineRetry />
          </div>
          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-ink-muted">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            Your financial data is never cached on this device.
          </p>
        </div>
      </div>
    </main>
  );
}
