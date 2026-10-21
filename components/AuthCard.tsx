import Link from "next/link";
import type { ReactNode } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { PiggyBank, Receipt, ShieldCheck, Wallet } from "@/lib/icons";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

const FEATURES = [
  {
    icon: Wallet,
    title: "One clear balance",
    body: "See what is left after spending and saving, all in one place.",
  },
  {
    icon: Receipt,
    title: "Plan vs actual",
    body: "Split every paycheck across your own categories and track the difference.",
  },
  {
    icon: PiggyBank,
    title: "Savings that add up",
    body: "Log deposits and withdrawals without losing the bigger picture.",
  },
];

/**
 * Shared auth surface for `/login` and `/register` (T24/T37). Desktop gets a
 * brand panel; mobile keeps a centered card. The forms themselves stay server
 * rendered children, so the T33 method="post"/hydration guards are untouched.
 */
export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="grid w-full flex-1 lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-hero-from to-hero-to px-10 py-12 text-on-hero lg:flex lg:flex-col lg:justify-between xl:px-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-28 -right-24 h-72 w-72 rounded-full border border-on-hero/15"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-24 -right-10 h-48 w-48 rounded-full border border-on-hero/10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-on-hero/5"
        />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-control bg-on-hero/15">
            <PiggyBank aria-hidden="true" className="h-5 w-5" />
          </span>
          <span className="text-base font-semibold tracking-tight">Savings Tracker</span>
        </div>

        <div className="relative max-w-md py-12">
          <p className="text-xs font-semibold tracking-wide uppercase opacity-70">
            Plan · spend · save
          </p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-balance">
            Know where every peso goes.
          </h2>
          <p className="mt-3 text-sm leading-relaxed opacity-80">
            A calm, private home for your income, spending and savings — built around the
            percentages you choose.
          </p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-on-hero/10">
                    <Icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{feature.title}</span>
                    <span className="mt-0.5 block text-sm opacity-70">{feature.body}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative flex items-center gap-2 text-xs opacity-70">
          <ShieldCheck aria-hidden="true" className="h-4 w-4" />
          Your account is private; only approved members can sign in.
        </p>
      </aside>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center justify-between gap-3 lg:hidden">
            <Link
              href="/"
              prefetch={false}
              className="flex items-center gap-2.5 text-base font-semibold tracking-tight text-ink"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-control bg-brand text-on-brand">
                <PiggyBank aria-hidden="true" className="h-5 w-5" />
              </span>
              Savings Tracker
            </Link>
            <ThemeToggle />
          </div>

          <div className="card-raised p-6 sm:p-8">
            <h1 className="text-xl font-semibold tracking-tight text-ink">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-ink-muted">{subtitle}</p> : null}
            <div className="mt-6">{children}</div>
          </div>

          <div className="mt-5 hidden justify-center lg:flex">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
