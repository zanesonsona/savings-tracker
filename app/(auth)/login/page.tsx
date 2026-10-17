import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import AuthCard from "@/components/AuthCard";
import LoginForm from "@/components/LoginForm";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign in · Savings Tracker" };

// This route reads the session (redirect when already signed in), so it blocks
// on the server instead of prerendering a shell — the Cache Components
// migration path per the bundled `authentication-with-cache-components` guide.
export const instant = false;

export default async function LoginPage() {
  await connection(); // request-time rendering before the session/token read
  const user = await getSessionUser();
  if (user?.status === "APPROVED") redirect("/");

  return (
    <AuthCard title="Sign in" subtitle="Welcome back — sign in to continue.">
      <LoginForm />
    </AuthCard>
  );
}
