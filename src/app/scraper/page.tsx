"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useState } from "react";

type ScrapeResult = {
  url: string;
  fetchedMs: number;
  title?: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  counts?: { h1s: number; h2s: number; links: number; words: number };
  snippet?: string;
};

export default function ScraperPage() {
  const [url, setUrl] = useState("https://example.com");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  async function scrape() {
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Scrape failed");
      setResult(data as ScrapeResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scrape failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Data scraper</p>
          <h1 className="text-3xl font-semibold text-white">Pull meta + text from any URL</h1>
          <p className="text-sm text-slate-300">
            Uses <code className="text-white">/api/scrape</code> to fetch and summarize HTML (title, og tags, counts, snippet).
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-emerald-100">
            <a className="underline" href="/">
              Home
            </a>
            <a className="underline" href="/assistant">
              Assistant
            </a>
            <a className="underline" href="/logs">
              Logs
            </a>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <label className="text-xs uppercase tracking-[0.24em] text-slate-300">URL</label>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                  placeholder="https://..."
                />
              </div>
              <button
                onClick={() => void scrape()}
                disabled={busy || !url.trim()}
                className="self-end rounded-full border border-emerald-400/60 bg-emerald-500/20 px-5 py-2 text-xs uppercase tracking-[0.28em] text-emerald-50 transition hover:border-emerald-300 disabled:opacity-50"
              >
                {busy ? "Scraping..." : "Scrape"}
              </button>
            </div>
            {error ? <p className="text-xs text-rose-300">{error}</p> : null}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          {result ? (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300">Title</p>
                  <p className="mt-1 text-white">{result.title || "None"}</p>
                  <p className="text-[11px] text-slate-400">Fetched in {result.fetchedMs} ms</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300">Description</p>
                  <p className="mt-1 text-slate-200">{result.description || "None"}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-cyan-400/40 bg-cyan-500/10 p-3 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-cyan-100">OG Title</p>
                  <p className="mt-1 text-white">{result.ogTitle || "None"}</p>
                </div>
                <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-amber-100">OG Description</p>
                  <p className="mt-1 text-white">{result.ogDescription || "None"}</p>
                </div>
                <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-3 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-100">OG Image</p>
                  <p className="mt-1 break-words text-white">{result.ogImage || "None"}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-4 text-sm">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300">H1 tags</p>
                  <p className="text-xl font-semibold text-white">{result.counts?.h1s ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300">H2 tags</p>
                  <p className="text-xl font-semibold text-white">{result.counts?.h2s ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300">Links</p>
                  <p className="text-xl font-semibold text-white">{result.counts?.links ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300">Words</p>
                  <p className="text-xl font-semibold text-white">{result.counts?.words ?? 0}</p>
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-slate-300">Snippet</p>
                <p className="mt-2 whitespace-pre-line rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-slate-100">
                  {result.snippet || "No snippet returned."}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Results will appear here.</p>
          )}
        </section>
      </div>
    </main>
  );
}
