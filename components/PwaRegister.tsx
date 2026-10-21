"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/Toaster";

/**
 * T39 — production-only service-worker registration + update prompt.
 *
 * The worker is intentionally *not* registered in dev, and the update toast
 * waits for an explicit "Refresh" click before sending SKIP_WAITING, so a
 * background deploy can never reload a form the user is filling in.
 */
export default function PwaRegister() {
  const { toast } = useToast();
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      // A production build may have been served from this same origin/port;
      // remove its worker + caches so `next dev` behaves exactly as before.
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then(
          (registrations) => {
            for (const registration of registrations) void registration.unregister();
          },
          () => {},
        );
      }
      if ("caches" in window) {
        caches.keys().then(
          (keys) => {
            for (const key of keys) {
              if (key.startsWith("savings-tracker-")) void caches.delete(key);
            }
          },
          () => {},
        );
      }
      return;
    }
    if (window.location.pathname === "/offline") return;
    if (!("serviceWorker" in navigator)) return;

    let disposed = false;
    let updateToastId: number | null = null;
    let waitingWorker: ServiceWorker | null = null;

    function showUpdate(worker: ServiceWorker) {
      if (disposed || updateToastId !== null) return;
      waitingWorker = worker;
      updateToastId = toast({
        tone: "info",
        title: "Update available",
        description: "Refresh to load the latest version of Savings Tracker.",
        duration: 0,
        action: {
          label: "Refresh",
          onClick: () => {
            if (refreshingRef.current) return;
            refreshingRef.current = true;
            const target = waitingWorker;
            if (!target) {
              window.location.reload();
              return;
            }
            navigator.serviceWorker.addEventListener(
              "controllerchange",
              () => window.location.reload(),
              { once: true },
            );
            target.postMessage({ type: "SKIP_WAITING" });
          },
        },
      });
    }

    async function register() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        if (registration.waiting && navigator.serviceWorker.controller) {
          showUpdate(registration.waiting);
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener("statechange", () => {
            if (installing.state === "installed" && navigator.serviceWorker.controller) {
              showUpdate(installing);
            }
          });
        });
      } catch (error) {
        // Private mode/policy can block SWs; the app still works normally.
        console.warn("[pwa] service worker registration failed", error);
      }
    }

    void register();

    return () => {
      disposed = true;
    };
  }, [toast]);

  return null;
}
