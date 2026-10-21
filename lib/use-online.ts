"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

/**
 * T39 — `navigator.onLine` as an external store. The server snapshot is
 * "online" so hydration never renders a false offline banner.
 */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => true);
}
