import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import AuthCard from "@/components/AuthCard";
import RegisterForm from "@/components/RegisterForm";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Create account · Savings Tracker" };

// Reads the session (redirect when already signed in) → blocks on the server
// instead of prerendering; see the login page note (T24).
export const instant = false;

export default async function RegisterPage() {
  await connection(); // request-time rendering before the session/token read
  const user = await getSessionUser();
  if (user?.status === "APPROVED") redirect("/");

  return (
    <AuthCard
      title="Create account"
      subtitle="The first account becomes the app admin; later accounts need approval."
    >
      <RegisterForm />
    </AuthCard>
  );
}
