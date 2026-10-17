"use client";

import Link from "next/link";
import { useState } from "react";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none";

interface RegisterSuccess {
  message: string;
  isAdmin: boolean;
}

/** Client registration form for `/register` (T24). Posts to `/api/auth/register`. */
export default function RegisterForm() {
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
        <p
          className={`rounded-md px-3 py-2 text-sm ${
            success.isAdmin ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"
          }`}
        >
          {success.message}
        </p>
        <Link
          href="/login"
          className="block w-full rounded-md bg-slate-900 px-3 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error ? (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="space-y-1">
        <label htmlFor="username" className="block text-sm font-medium text-slate-700">
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
        <p className="text-xs text-slate-500">
          3–30 characters: letters, digits, dots, underscores and hyphens.
        </p>
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
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
        <p className="text-xs text-slate-500">At least 8 characters.</p>
      </div>

      <div className="space-y-1">
        <label htmlFor="confirm" className="block text-sm font-medium text-slate-700">
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
        disabled={submitting}
        className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-slate-900 underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
