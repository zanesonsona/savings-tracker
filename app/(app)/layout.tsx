import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { getSessionUser } from "@/lib/auth";

// The app shell reads the session (T25): signed-out visitors (e.g. a stale
// cookie that the proxy accepted optimistically) and sessions that are no
// longer APPROVED are bounced to `/login`. `instant = false` + `connection()`
// = block on the server instead of prerendering a shell (see T24 notes).
//
// T33 (BUG-QA-05, accepted): production builds may deliver this redirect as
// `200` + a client-executed NEXT_REDIRECT (the fork's postponed streaming
// flushes the shell first). Bodies stay `no-store` with no protected content
// and the browser still lands on `/login`; dev keeps hard 307s. Documented in
// the README (Deployment).
export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  await connection();
  const user = await getSessionUser();
  if (!user || user.status !== "APPROVED") redirect("/login");

  return (
    <AppShell user={{ username: user.username, role: user.role }}>{children}</AppShell>
  );
}
