"use client";

import { useSyncExternalStore } from "react";

function subscribe(): () => void {
  return () => {};
}

const getSnapshot = () => true;

const getServerSnapshot = () => false;

/**
 * `false` during SSR and the first hydration render, `true` right afterwards.
 * useSyncExternalStore is the intended way to expose "JavaScript is live" —
 * it avoids hydration mismatches and the setState-in-effect anti-pattern.
 *
 * T33 (BUG-QA-03): the auth forms keep their submit button disabled until this
 * flips, so a click before hydration (throttled scripts) can never fall back to
 * a native GET submit that would put credentials in the URL.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
