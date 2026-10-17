"use client";

import Link from "next/link";
import { useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";

const inputClass = "field w-full";

/** Client sign-in form for `/login` (T24). Posts to `/api/auth/login`. */
export default function LoginForm() {
  // T33 (BUG-QA-03): submit stays inert until hydration so a click while the
  // scripts are still loading can never native-GET the form (credentials in
  // the URL). The `method="post"` fallback below covers Enter-key submits too.
  const hydrated = useHydrated();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Something went wrong — please try again");
        setSubmitting(false);
        return;
      }

      // Hard navigation on purpose (T33, BUG-QA-04): in production builds the
      // client router cache can hold the signed-out `/` redirect payload (the
      // login page's brand-link prefetch), which hijacked `router.replace("/")`
      // and left the app on /login. `location.replace` forces a full document
      // load that always follows the fresh session cookie (and drops the login
      // page from the back history).
      window.location.replace("/");
    } catch {
      setError("Network error — please try again");
      setSubmitting(false);
    }
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
      </div>

      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      <button
        type="submit"
        disabled={submitting || !hydrated}
        className="btn-primary w-full"
      >
        {submitting ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-ink-muted">
        No account?{" "}
        <Link href="/register" className="font-medium text-ink underline underline-offset-2">
          Create one
        </Link>
      </p>
    </form>
  );
}
