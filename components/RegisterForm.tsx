"use client";

import Link from "next/link";
import { useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";

const inputClass = "field w-full";

interface RegisterSuccess {
  message: string;
  isAdmin: boolean;
}

/** Client registration form for `/register` (T24). Posts to `/api/auth/register`. */
export default function RegisterForm() {
  // T33 (BUG-QA-03): inert submit until hydration (see LoginForm) — a native
  // GET submit would put username/password/confirm into the URL.
  const hydrated = useHydrated();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<RegisterSuccess | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await response.json().catch(() => null)) as {
        user?: { role?: string };
        message?: string;
        error?: string;
      } | null;

      if (!response.ok) {
        setError(data?.error ?? "Something went wrong — please try again");
        setSubmitting(false);
        return;
      }

      setSuccess({
        message:
          data?.message ??
          "Account created — an admin must approve it before you can sign in.",
        isAdmin: data?.user?.role === "ADMIN",
      });
      setSubmitting(false);
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div role="status" className="space-y-4">
        <p className={success.isAdmin ? "alert-success" : "alert-warning"}>
          {success.message}
        </p>
        <Link href="/login" className="btn-primary w-full">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" method="post" noValidate>
      {error ? (
        <p role="alert" className="alert-danger">
          {error}
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="username" className="block text-sm font-medium text-ink">
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoFocus
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-ink-muted">
          3–30 characters: letters, digits, dots, underscores and hyphens.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
        <p className="text-xs text-ink-muted">At least 8 characters.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="confirm" className="block text-sm font-medium text-ink">
          Confirm password
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !hydrated}
        className="btn-primary w-full"
      >
        {submitting ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-ink underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
