import Link from "next/link";
import type { ReactNode } from "react";

interface AuthCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Shared centered card for `/login` and `/register` (T24). Plain component so
 * the server pages can render it; classes stay token-friendly for the T30/T31
 * restyle.
 */
export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-sm">
      <p className="mb-4 text-center">
        <Link href="/" className="text-lg font-semibold tracking-tight text-slate-900">
          Savings Tracker
        </Link>
      </p>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}
