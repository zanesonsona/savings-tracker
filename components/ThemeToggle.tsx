"use client";

import { useCallback, useEffect, useLayoutEffect, useSyncExternalStore } from "react";

const STORAGE_KEY = "st-theme";

type ThemePreference = "light" | "dark" | "system";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolvedIsDark(pref: ThemePreference): boolean {
  return pref === "dark" || (pref === "system" && systemPrefersDark());
}

/**
 * Apply a preference to <html>: the `dark` class drives the Tailwind variant,
 * `data-theme` keeps the raw preference inspectable and matches the inline
 * head script's bookkeeping (app/layout.tsx).
 */
function applyTheme(pref: ThemePreference) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolvedIsDark(pref));
  root.dataset.theme = pref;
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system"; // storage can be unavailable (private mode, blocked cookies)
  }
}

// Tiny external store around localStorage so React can subscribe via
// useSyncExternalStore: the server snapshot is "system" (storage is
// client-only), the client snapshot is the stored preference. Hydration
// renders from the server snapshot, so the markup never mismatches.
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  for (const listener of listeners) listener();
}

/**
 * Light / Dark / System theme switch (T31). The inline script in the root
 * layout applies the stored preference before first paint; this component
 * keeps the control in sync and re-applies the theme after hydration.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const pref = useSyncExternalStore(subscribe, readStoredPreference, () => "system");

  // Before paint: align <html> with the stored preference. This also restores
  // the theme after dev Strict Mode remounts reset <html> to the JSX
  // attributes, clearing what the head script set (see the bundled
  // "preventing flash before hydration" guide).
  useLayoutEffect(() => {
    applyTheme(readStoredPreference());
  }, []);

  // While "System" is selected, follow OS changes live (DOM-only tweak — the
  // stored preference itself does not change, so no React state is involved).
  useEffect(() => {
    if (pref !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [pref]);

  const choose = useCallback((next: ThemePreference) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore unavailable storage — the theme still applies for this page view.
    }
    applyTheme(next);
    notify();
  }, []);

  return (
    <div
      role="group"
      aria-label="Theme"
      className={`inline-flex rounded-control border border-line bg-surface p-0.5 ${className}`}
    >
      {OPTIONS.map((option) => {
        const active = pref === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => choose(option.value)}
            aria-pressed={active}
            className={`flex-1 rounded-sm px-2 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-accent text-on-accent"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
