import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin · Savings Tracker" };

// Admin-only page (T25): the role is re-checked here, close to the data —
// non-admins are sent to the dashboard. The approvals API + full UI land in T27.
export const instant = false;

export default async function AdminUsersPage() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">User management</h1>
      <p className="text-sm text-slate-500">
        The account approval UI arrives with the next task (T27).
      </p>
    </div>
  );
}
