"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, Info, X } from "@/lib/icons";
import { useHydrated } from "@/lib/use-hydrated";

export type ToastTone = "success" | "error" | "info";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Auto-dismiss delay in ms. `0` keeps the toast until dismissed. */
  duration?: number;
  /** Optional inline action (e.g. the PWA "Refresh" update button). */
  action?: ToastAction;
}

interface ToastItem extends ToastOptions {
  id: number;
  tone: ToastTone;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => number;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextToastId = 1;

const TONE_ICON = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

const TONE_CLASS: Record<ToastTone, string> = {
  success: "text-success",
  error: "text-danger",
  info: "text-brand",
};

/** Access the app-wide toast queue (T34). Must be used under <ToastProvider>. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

/**
 * Portal-based toast host (T34). Success/info render as `role=status`,
 * errors as `role=alert`; each toast auto-dismisses after 4.5s by default.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const hydrated = useHydrated();

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextToastId++;
      const item: ToastItem = { ...options, id, tone: options.tone ?? "info" };
      // Keep at most four visible; older toasts fall off the top.
      setItems((prev) => [...prev.slice(-3), item]);

      if (options.duration !== 0) {
        const timer = setTimeout(() => dismiss(id), options.duration ?? 4500);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  // Clear pending timers if the provider unmounts (logout/full reload).
  useEffect(() => {
    const current = timers.current;
    return () => {
      for (const timer of current.values()) clearTimeout(timer);
      current.clear();
    };
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {hydrated
        ? createPortal(
            <div
              role="region"
              aria-label="Notifications"
              className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:items-end"
            >
              {items.map((item) => {
                const Icon = TONE_ICON[item.tone];
                return (
                  <div
                    key={item.id}
                    role={item.tone === "error" ? "alert" : "status"}
                    className="card-raised pointer-events-auto flex w-full max-w-sm items-start gap-3 p-4"
                  >
                    <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${TONE_CLASS[item.tone]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{item.title}</p>
                      {item.description ? (
                        <p className="mt-0.5 text-sm text-ink-muted">{item.description}</p>
                      ) : null}
                      {item.action ? (
                        <button
                          type="button"
                          onClick={() => {
                            item.action?.onClick();
                            dismiss(item.id);
                          }}
                          className="mt-1.5 text-sm font-semibold text-brand underline-offset-2 hover:underline"
                        >
                          {item.action.label}
                        </button>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => dismiss(item.id)}
                      aria-label="Dismiss notification"
                      className="-m-1 rounded-control p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
                    >
                      <X aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}
