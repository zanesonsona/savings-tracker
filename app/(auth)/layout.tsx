import type { ReactNode } from "react";

// Auth chrome (T24/T37): the AuthCard owns the split-screen layout; this shell
// only lets it fill the viewport.
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="flex flex-1 flex-col">{children}</main>;
}
