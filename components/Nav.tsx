"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";

const LINKS = [
  { href: "/", label: "Dashboard" },
  { href: "/income", label: "Income" },
  { href: "/expenses", label: "Expenses" },
  { href: "/savings", label: "Savings" },
  { href: "/categories", label: "Categories" },
] as const;

interface NavUser {
  username: string;
  role: string;
}

/** Session-aware top navigation (T25): username, Admin link for admins, log out. */
export default function Nav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const links: { href: string; label: string }[] =
    user.role === "ADMIN" ? [...LINKS, { href: "/admin/users", label: "Admin" }] : [...LINKS];

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch {
      setLoggingOut(false);
    }
  }

  return (
    <header className="border-b border-line bg-surface">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
          Savings Tracker
        </Link>
        <div className="flex flex-wrap gap-1">
          {links.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-accent text-on-accent"
                    : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <ThemeToggle />
          <span className="text-sm text-ink-muted">{user.username}</span>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-control px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>
      </nav>
    </header>
  );
}
