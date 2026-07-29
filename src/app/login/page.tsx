"use client";

import { useState } from "react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Full reload so the proxy re-reads the new cookie.
        window.location.href = "/";
        return;
      }
      const { error: msg } = await res.json().catch(() => ({ error: "" }));
      setError(msg || "Something went wrong. Please try again.");
    } catch {
      setError("Couldn’t reach the server. Check your internet connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <div className="mb-8 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-4xl">Meeting Notes</h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Enter the password to continue
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
          autoComplete="current-password"
          placeholder="Password"
          className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-3.5 text-base focus:border-[var(--color-primary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
        />

        {error && (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !password}
          className="w-full rounded-2xl bg-[var(--color-primary)] py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-lg active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? "Checking…" : "Continue"}
        </button>

        <p className="text-center text-xs text-[var(--color-text-muted)]">
          You&rsquo;ll stay signed in on this device.
        </p>
      </form>
    </main>
  );
}
