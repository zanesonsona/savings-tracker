"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowDownLeft, LayoutDashboard, PiggyBank, Receipt, Tags } from "@/lib/icons";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/income", label: "Income", icon: ArrowDownLeft },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/savings", label: "Savings", icon: PiggyBank },
  { href: "/categories", label: "Categories", icon: Tags },
] as const;

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Primary destinations shared by the desktop sidebar and the mobile bottom
 * tab bar (T35). The shell renders the surrounding chrome and session actions.
 */
export default function Nav({ variant }: { variant: "sidebar" | "bottom" }) {
  const pathname = usePathname();

  if (variant === "bottom") {
    return (
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[11px] leading-none font-medium transition-colors after:absolute after:inset-x-5 after:top-0 after:h-0.5 after:rounded-full ${
                    active
                      ? "text-brand after:bg-brand"
                      : "text-ink-muted after:bg-transparent hover:text-ink"
                  }`}
                >
                  <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav aria-label="Primary" className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-soft text-brand"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink"
            }`}
          >
            <Icon
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
              strokeWidth={active ? 2.3 : 2}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
