import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import AdminUsers from "@/components/AdminUsers";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin · Savings Tracker" };

// Admin-only page (T25): the role is re-checked here, close to the data —
// non-admins are sent to the dashboard. The approvals UI itself (T27) is a
// client component that talks to /api/admin/users (admin-guarded too).
export const instant = false;

export default async function AdminUsersPage() {
  await connection();
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  return <AdminUsers currentUserId={user.id} />;
}
