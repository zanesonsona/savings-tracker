import type { ReactNode } from "react";

// Minimal chrome for the auth pages: no app nav, just a centered card (T24).
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="flex flex-1 items-center justify-center px-4 py-10">{children}</main>;
}
