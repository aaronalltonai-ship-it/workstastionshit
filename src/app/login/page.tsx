"use client";

import { useEffect, useState } from "react";

export default function LoginPage() {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setError(null);
  }, [passcode]);

  async function submit() {
    if (!passcode.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Login failed");
      }
      const redirect = new URL(window.location.href).searchParams.get("redirect") || "/";
      window.location.href = redirect;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Passcode login</p>
          <h1 className="text-2xl font-semibold text-white">Enter your passcode</h1>
          <p className="text-sm text-slate-300">Single passcode per user; no usernames.</p>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Passcode"
            className="mt-2 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-emerald-400/60"
          />
          <button
            onClick={() => void submit()}
            disabled={busy || !passcode.trim()}
            className="w-full rounded-full border border-emerald-400/60 bg-emerald-500/20 px-4 py-3 text-xs uppercase tracking-[0.3em] text-emerald-50 transition hover:border-emerald-300 disabled:opacity-50"
          >
            {busy ? "Checking..." : "Login"}
          </button>
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
        </div>
      </div>
    </main>
  );
}
