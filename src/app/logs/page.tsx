"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from "react";

type LogEntry = {
  ts?: string;
  level?: string;
  source?: string;
  message?: string;
  detail?: unknown;
};

function formatTime(ts?: string) {
  if (!ts) return "";
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleTimeString();
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/logs?limit=200", { cache: "no-store" });
      if (!res.ok) throw new Error(`Logs request failed (${res.status})`);
      const data = (await res.json()) as { entries?: LogEntry[] };
      setLogs(Array.isArray(data.entries) ? data.entries : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load logs.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Logs</p>
          <h1 className="text-3xl font-semibold text-white">Recent agent and API logs</h1>
          <p className="text-sm text-slate-300">Reading workspace/logs/app.log via /api/logs.</p>
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
            <a className="underline" href="/health">
              Health
            </a>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">Entries</p>
              <p className="text-xs text-slate-400">/api/logs</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void refresh()}
                className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-white transition hover:border-emerald-400/50"
              >
                Refresh
              </button>
              {loading ? <span className="text-xs text-slate-400">Loading...</span> : null}
            </div>
          </div>
          {error ? (
            <p className="text-xs text-rose-300">{error}</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-400">No log entries yet.</p>
          ) : (
            <div className="space-y-2">
              {logs
                .slice()
                .reverse()
                .slice(0, 50)
                .map((entry, idx) => {
                  const tone =
                    entry.level === "error"
                      ? "border-rose-400/40 bg-rose-500/10 text-rose-100"
                      : "border-white/10 bg-white/5 text-slate-100";
                  return (
                    <div key={`${entry.ts}-${idx}`} className={`rounded-xl border px-3 py-2 text-sm ${tone}`}>
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-slate-300">
                        <span>{entry.source || "log"}</span>
                        <span>{formatTime(entry.ts)}</span>
                      </div>
                      <p className="text-slate-100">{entry.message}</p>
                      {entry.detail ? (
                        <pre className="mt-1 overflow-auto rounded-lg bg-black/40 p-2 text-[11px] leading-relaxed text-slate-200">
                          {typeof entry.detail === "string" ? entry.detail : JSON.stringify(entry.detail, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
