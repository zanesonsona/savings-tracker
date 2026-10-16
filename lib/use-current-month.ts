"use client";

import { useSyncExternalStore } from "react";
import { currentMonth } from "./dates";

function subscribe(): () => void {
  return () => {};
}

let cached: string | null = null;
function getSnapshot(): string {
  if (cached === null) cached = currentMonth();
  return cached;
}

function getServerSnapshot(): string {
  return "";
}

/**
 * Client-only current month: "" during SSR/prerender, UTC "YYYY-MM" after
 * hydration (same UTC month rule as the API filters, §7). Mirrors useToday.
 */
export function useCurrentMonth(): string {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
