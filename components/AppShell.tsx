"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import Nav, { isActivePath } from "@/components/Nav";
import { InstallButton } from "@/components/InstallPrompt";
import OfflineBanner from "@/components/OfflineBanner";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/components/Toaster";
import { LogOut, Menu, PiggyBank, ShieldCheck, X } from "@/lib/icons";

interface ShellUser {
  username: string;
  role: string;
}

function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      href="/"
      onClick={onClick}
      className="flex min-h-11 items-center gap-2.5 rounded-control"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-control bg-brand text-on-brand">
        <PiggyBank aria-hidden="true" className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-base leading-tight font-semibold tracking-tight text-ink">
          Savings Tracker
        </span>
        <span className="block text-[11px] leading-tight text-ink-muted">Plan · spend · save</span>
      </span>
    </Link>
  );
}

function LogoutButton({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Could not log out. Please try again.");
      onDone?.();
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLoggingOut(false);
      toast({
        tone: "error",
        title: "Log out failed",
        description: error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="btn-secondary w-full justify-start disabled:cursor-not-allowed"
    >
      <LogOut aria-hidden="true" className="h-4 w-4" />
      {loggingOut ? "Logging out…" : "Log out"}
    </button>
  );
}

/**
 * Responsive app shell (T35): fixed sidebar on desktop, compact top bar +
 * fixed bottom tabs on mobile. The server layout still owns the session guard;
 * this component only receives the safe `{ username, role }` projection.
 */
export default function AppShell({
  user,
  children,
  installSlot,
}: {
  user: ShellUser;
  children: ReactNode;
  installSlot?: ReactNode;
}) {
  const pathname = usePathname();
  // Store the path the menu was opened on: navigation closes it for free.
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const isAdmin = user.role === "ADMIN";

  const adminLink = isAdmin ? (
    <Link
      href="/admin/users"
      onClick={() => setMenuPath(null)}
      aria-current={isActivePath(pathname, "/admin/users") ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors ${
        isActivePath(pathname, "/admin/users")
          ? "bg-brand-soft text-brand"
          : "text-ink-muted hover:bg-surface-muted hover:text-ink"
      }`}
    >
      <ShieldCheck aria-hidden="true" className="h-5 w-5 shrink-0" />
      Admin
    </Link>
  ) : null;

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-line bg-surface px-4 py-5 lg:flex">
        <Brand />
        <div className="mt-7 flex-1 overflow-y-auto">
          <Nav variant="sidebar" />
          {isAdmin ? <div className="mt-2 border-t border-line pt-2">{adminLink}</div> : null}
        </div>
        <div className="mt-4 space-y-3 border-t border-line pt-4">
          <div className="empty:hidden">
            {installSlot ?? <InstallButton className="w-full" />}
          </div>
          <ThemeToggle className="w-full" />
          <div className="rounded-control bg-surface-muted p-2">
            <p className="truncate px-1 text-sm font-medium text-ink">{user.username}</p>
            <p className="px-1 text-xs text-ink-muted">
              {isAdmin ? "Administrator" : "Member"}
            </p>
            <div className="mt-2">
              <LogoutButton />
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center gap-2 px-4">
          <Brand onClick={() => setMenuPath(null)} />
          <button
            type="button"
            onClick={() => setMenuPath(menuOpen ? null : pathname)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-control border border-line text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            {menuOpen ? (
              <X aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Menu aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>
        {menuOpen ? (
          <div id="mobile-menu" className="border-t border-line px-4 py-3">
            <ThemeToggle className="w-full" />
            {adminLink ? <div className="mt-2">{adminLink}</div> : null}
            <div className="mt-2 empty:hidden">
              {installSlot ?? <InstallButton className="w-full" />}
            </div>
            <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{user.username}</p>
                <p className="text-xs text-ink-muted">
                  {isAdmin ? "Administrator" : "Member"}
                </p>
              </div>
              <div className="ml-auto w-36">
                <LogoutButton onDone={() => setMenuPath(null)} />
              </div>
            </div>
          </div>
        ) : null}
      </header>

      <div className="flex-1 lg:pl-72">
        <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:px-8 lg:py-8">
          <OfflineBanner />
          {/* T37 — subtle route fade; reduced-motion disables the keyframes. */}
          <div key={pathname} className="page-in">
            {children}
          </div>
        </main>
      </div>

      <Nav variant="bottom" />
    </>
  );
}
