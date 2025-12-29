"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from "react";

type HealthStatus = {
  key: string;
  label: string;
  status: "pending" | "ok" | "error";
  detail?: string;
  latencyMs?: number;
};

const endpointChecks = [
  { key: "dashboard", label: "Dashboard API", url: "/api/dashboard" },
  { key: "products", label: "Products API", url: "/api/products" },
  { key: "db", label: "DB health", url: "/api/db/health" },
  { key: "logs", label: "Log tail", url: "/api/logs" },
  { key: "dashboard-time", label: "Dashboard time API", url: "/api/dashboard/time" },
];

function StatusBadge({ status }: { status: HealthStatus["status"] }) {
  const tone =
    status === "ok"
      ? "bg-emerald-500/15 text-emerald-100 border-emerald-400/40"
      : status === "error"
        ? "bg-rose-500/15 text-rose-100 border-rose-400/40"
        : "bg-white/10 text-slate-200 border-white/20";
  return <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.24em] ${tone}`}>{status}</span>;
}

export default function HealthPage() {
  const [health, setHealth] = useState<Record<string, HealthStatus>>(() =>
    endpointChecks.reduce((acc, check) => {
      acc[check.key] = { ...check, status: "pending" };
      return acc;
    }, {} as Record<string, HealthStatus>),
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void runChecks();
  }, []);

  async function runChecks() {
    setLoading(true);
    setError(null);
    const pending = endpointChecks.reduce((acc, check) => {
      acc[check.key] = { ...check, status: "pending" as const };
      return acc;
    }, {} as Record<string, HealthStatus>);
    setHealth(pending);

    const results = await Promise.all(
      endpointChecks.map(async (check) => {
        const started = performance.now();
        try {
          const res = await fetch(check.url, { cache: "no-store" });
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return {
            key: check.key,
            status: "ok" as const,
            detail: res.statusText || "OK",
            latencyMs: Math.round(performance.now() - started),
            label: check.label,
            url: check.url,
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Request failed";
          return {
            key: check.key,
            status: "error" as const,
            detail: message,
            latencyMs: Math.round(performance.now() - started),
            label: check.label,
            url: check.url,
          };
        }
      }),
    );

    const next = { ...pending };
    for (const r of results) {
      next[r.key] = { ...next[r.key], ...r };
    }
    setHealth(next);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Health</p>
          <h1 className="text-3xl font-semibold text-white">API and system checks</h1>
          <p className="text-sm text-slate-300">Ping core endpoints and show latency/status.</p>
          <div className="flex flex-wrap gap-3 text-xs text-emerald-100">
            <a className="underline" href="/">
              Home
            </a>
            <a className="underline" href="/assistant">
              Assistant
            </a>
            <a className="underline" href="/dashboard">
              Dashboard
            </a>
            <a className="underline" href="/logs">
              Logs
            </a>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">Checks</p>
              <p className="text-xs text-slate-400">/api/dashboard, /api/products, etc.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void runChecks()}
                className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-white transition hover:border-emerald-400/50"
              >
                Refresh
              </button>
              {loading ? <span className="text-xs text-slate-400">Loading...</span> : null}
            </div>
          </div>
          {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          <div className="space-y-2">
            {endpointChecks.map((check) => {
              const status = health[check.key];
              return (
                <div
                  key={check.key}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{check.label}</p>
                    <p className="text-xs text-slate-400">{check.url}</p>
                    {status?.detail ? <p className="text-xs text-slate-500">{status.detail}</p> : null}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={status?.status || "pending"} />
                    {status?.latencyMs ? (
                      <span className="text-[11px] text-slate-400">{status.latencyMs} ms</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 rounded-2xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            If an endpoint errors, ensure the dev server is running and Turbopack symlink issues are resolved (run in Admin shell
            or enable Windows Developer Mode).
          </div>
        </section>
      </div>
    </main>
  );
}
