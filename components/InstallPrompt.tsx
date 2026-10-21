"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import FormDialog from "@/components/FormDialog";
import { useToast } from "@/components/Toaster";
import { Download, Share2 } from "@/lib/icons";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface InstallSnapshot {
  /** True once the client has read platform/standalone state. */
  ready: boolean;
  canInstall: boolean;
  installed: boolean;
  ios: boolean;
}

const SERVER_SNAPSHOT: InstallSnapshot = {
  ready: false,
  canInstall: false,
  installed: false,
  ios: false,
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let snapshot: InstallSnapshot = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();
let listenersAttached = false;

function notify() {
  for (const listener of listeners) listener();
}

function update(patch: Partial<InstallSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  notify();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  ensureListeners();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return SERVER_SNAPSHOT;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = window.navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1)
  );
}

/**
 * Capture `beforeinstallprompt` once and fan it out to every install button
 * (sidebar + mobile menu) through a tiny external store (T38).
 */
function ensureListeners() {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;

  update({ ready: true, ios: isIos(), installed: isStandalone() });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    update({ canInstall: true });
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    update({ canInstall: false, installed: true });
  });
}

// Client bundles evaluate before hydration — attach early so an event fired
// while the page is still hydrating is not lost.
if (typeof window !== "undefined") ensureListeners();

export function useInstallState(): InstallSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Trigger the native install prompt; returns "unavailable" if it was consumed. */
async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferredPrompt;
  if (!event) return "unavailable";

  deferredPrompt = null;
  update({ canInstall: false });
  await event.prompt();
  const choice = await event.userChoice;
  if (choice.outcome === "accepted") update({ installed: true });
  return choice.outcome;
}

function IosInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-4">
      <ol className="space-y-3 text-sm text-ink">
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
            1
          </span>
          <span>
            Tap the Share button in Safari&apos;s toolbar{" "}
            <Share2 aria-hidden="true" className="inline h-4 w-4 align-text-bottom text-brand" />.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
            2
          </span>
          <span>
            Scroll down and tap <span className="font-medium">Add to Home Screen</span>.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
            3
          </span>
          <span>
            Tap <span className="font-medium">Add</span>. The app opens full-screen with the same
            sign-in.
          </span>
        </li>
      </ol>
      <button type="button" onClick={onClose} className="btn-primary w-full">
        Got it
      </button>
    </div>
  );
}

/**
 * Install trigger used in the sidebar and mobile menu. Hidden when the app is
 * already installed/standalone or the browser offers no install path.
 */
export function InstallButton({ className = "" }: { className?: string }) {
  const state = useInstallState();
  const [iosOpen, setIosOpen] = useState(false);
  const available = state.ready && !state.installed && (state.canInstall || state.ios);

  if (!available) return null;

  async function handleClick() {
    if (state.canInstall) {
      await promptInstall();
      return;
    }
    if (state.ios) setIosOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`btn-secondary justify-start ${className}`}
      >
        <Download aria-hidden="true" className="h-4 w-4" />
        Install app
      </button>
      <FormDialog
        open={iosOpen}
        onClose={() => setIosOpen(false)}
        title="Install Savings Tracker"
        description="Use Safari's Share menu to add the app to your Home Screen."
      >
        <IosInstructions onClose={() => setIosOpen(false)} />
      </FormDialog>
    </>
  );
}

/**
 * Mounted once in the root layout: owns the shared install listener and the
 * confirmation toast after the browser reports `appinstalled` (T38).
 */
export function InstallPrompt() {
  const { toast } = useToast();

  useEffect(() => {
    ensureListeners();
    function onInstalled() {
      toast({
        tone: "success",
        title: "App installed",
        description: "Savings Tracker is ready on your home screen.",
      });
    }
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, [toast]);

  return null;
}
