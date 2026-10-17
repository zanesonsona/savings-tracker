import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { ReactNode } from "react";
import Nav from "@/components/Nav";
import { getSessionUser } from "@/lib/auth";

// The app shell reads the session (T25): signed-out visitors (e.g. a stale
// cookie that the proxy accepted optimistically) and sessions that are no
// longer APPROVED are bounced to `/login`. `instant = false` + `connection()`
// = block on the server instead of prerendering a shell (see T24 notes).
export const instant = false;

export default async function AppLayout({ children }: { children: ReactNode }) {
  await connection();
  const user = await getSessionUser();
  if (!user || user.status !== "APPROVED") redirect("/login");

  return (
    <>
      <Nav user={{ username: user.username, role: user.role }} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
