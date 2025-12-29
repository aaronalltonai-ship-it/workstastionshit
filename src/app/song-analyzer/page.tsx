"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useState } from "react";

type Analysis = {
  summary: string;
  strengths: string[];
  issues: string[];
  recommendations: string[];
  score?: number | null;
  raw?: string;
};

export default function SongAnalyzerPage() {
  const [lyrics, setLyrics] = useState("");
  const [style, setStyle] = useState("melodic rap, modern pop hook");
  const [reference, setReference] = useState("Giveon x Drake");
  const [result, setResult] = useState<Analysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function analyze() {
    if (!lyrics.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/song/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lyrics, style, reference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Analysis failed");
      setResult({
        summary: data.summary,
        strengths: data.strengths || [],
        issues: data.issues || [],
        recommendations: data.recommendations || [],
        score: data.score,
        raw: data.raw,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusy(false);
    }
  }

  const card = (title: string, items: string[], tone: string) => (
    <div className={`rounded-2xl border ${tone} p-3`}>
      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No entries</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-slate-100">
          {items.map((item, idx) => (
            <li key={idx} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Song analyzer</p>
          <h1 className="text-3xl font-semibold text-white">Improve lyrics with structured feedback</h1>
          <p className="text-sm text-slate-300">
            Paste lyrics, add style and reference, and get concise strengths, issues, and improvement guidance.
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-emerald-100">
            <a className="underline" href="/">
              Home
            </a>
            <a className="underline" href="/masterwriter">
              Masterwriter
            </a>
            <a className="underline" href="/assistant">
              Assistant
            </a>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="space-y-3">
              <label className="text-xs uppercase tracking-[0.24em] text-slate-300">Lyrics</label>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                rows={10}
                className="w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-emerald-400/60"
                placeholder="Paste lyrics here..."
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.24em] text-slate-300">Style</label>
                  <input
                    value={style}
                    onChange={(e) => setStyle(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                    placeholder="melodic rap, pop hook"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.24em] text-slate-300">Reference</label>
                  <input
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                    placeholder="artist/song reference"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => void analyze()}
                  disabled={busy || !lyrics.trim()}
                  className="rounded-full border border-emerald-400/60 bg-emerald-500/20 px-5 py-2 text-xs uppercase tracking-[0.28em] text-emerald-50 transition hover:border-emerald-300 disabled:opacity-50"
                >
                  {busy ? "Analyzing..." : "Analyze"}
                </button>
                {error ? <span className="text-xs text-rose-300">{error}</span> : null}
              </div>
            </div>
          </div>

              <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
            {result ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300">Summary</p>
                      <p className="mt-1 text-sm text-slate-100 whitespace-pre-line">{result.summary}</p>
                    </div>
                    {typeof result.score === "number" ? (
                      <div className="rounded-2xl border border-emerald-400/60 bg-emerald-500/10 px-3 py-2 text-right">
                        <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-200">Score</p>
                        <p className="text-2xl font-semibold text-white">{Math.round(result.score)}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
                {card("Strengths", result.strengths || [], "border-emerald-400/40")}
                {card("Issues", result.issues || [], "border-rose-400/40")}
                {card("Recommendations", result.recommendations || [], "border-amber-400/40")}
              </div>
            ) : (
              <p className="text-sm text-slate-400">No analysis yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
