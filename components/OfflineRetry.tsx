"use client";

import { RefreshCw } from "@/lib/icons";

/**
 * T39 — retry the app. The original destination is not kept in the URL after
 * the service-worker fallback redirect, so go home: online this lands on the
 * dashboard; offline the navigation is redirected straight back to `/offline`.
 */
export default function OfflineRetry() {
  // A full navigation is required so the service worker can answer with
  // `/offline` while the network is still down; client-side routing would
  // stay on this page with a failed RSC request.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  const retry = () => window.location.assign("/");

  return (
    <button type="button" onClick={retry} className="btn-primary w-full">
      <RefreshCw aria-hidden="true" className="h-4 w-4" />
      Try again
    </button>
  );
}
