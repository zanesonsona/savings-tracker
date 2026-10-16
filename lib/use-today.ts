"use client";

import { useSyncExternalStore } from "react";

/** Local "today" as YYYY-MM-DD (dates are plain calendar dates, D13). */
function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function subscribe(): () => void {
  return () => {};
}

let cached: string | null = null;
function getSnapshot(): string {
  if (cached === null) cached = todayString();
  return cached;
}

function getServerSnapshot(): string {
  return "";
}

/**
 * Client-only "today" value: "" during SSR/prerender, the local calendar date
 * after hydration. useSyncExternalStore is the intended way to render a value
 * that differs between server and client — it avoids hydration mismatches and
 * the setState-in-effect anti-pattern (react-hooks/set-state-in-effect).
 */
export function useToday(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
