"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useState } from "react";
import { TaskCheckInPanel } from "@/components/TaskCheckInPanel";

type Chapter = { title?: string; content?: string };

export default function BookPage() {
  const [title, setTitle] = useState("Nebula Chronicles");
  const [genre, setGenre] = useState("Sci-fi");
  const [tone, setTone] = useState("Cinematic, tight, forward-moving");
  const [chapters, setChapters] = useState("Arrival at the station\nSignal from the void\nBreach in the hull");
  const [words, setWords] = useState(400);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outline, setOutline] = useState<string[]>([]);
  const [draftChapters, setDraftChapters] = useState<Chapter[]>([]);
  const [transcribeBusy, setTranscribeBusy] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [transcribed, setTranscribed] = useState("");

  function parseChapters(input: string) {
    return input
      .split("\n")
      .map((c) => c.trim())
      .filter(Boolean);
  }

  async function generate() {
    setBusy(true);
    setError(null);
    setOutline([]);
    setDraftChapters([]);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          genre,
          tone,
          chapters: parseChapters(chapters),
          wordsPerChapter: words,
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.error || detail?.message || `Request failed (${res.status})`);
      }
      const data = (await res.json()) as { outline?: string[]; chapters?: Chapter[]; raw?: string };
      setOutline(Array.isArray(data.outline) ? data.outline : []);
      setDraftChapters(Array.isArray(data.chapters) ? data.chapters : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Generation failed.";
      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleTranscribe(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setTranscribeBusy(true);
    setTranscribeError(null);
    setTranscribed("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("model", "whisper-large-v3");
      const res = await fetch("/api/audio/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "Transcription failed.");
      }
      setTranscribed(data?.text || "");
      if (data?.text) {
        setChapters((prev) => `${prev}\n${data.text}`.trim());
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Transcription failed.";
      setTranscribeError(message);
    } finally {
      setTranscribeBusy(false);
      event.target.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Book generator</p>
          <h1 className="text-3xl font-semibold text-white">Chapters + voice to prompt</h1>
          <p className="text-sm text-slate-300">
            Enter a title, genre, tone, and chapter prompts. Use voice input to append ideas, then generate outline and drafts via
            GROQ + Whisper.
          </p>
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

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-[0.24em] text-slate-300">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                  placeholder="Book title"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs uppercase tracking-[0.24em] text-slate-300">Genre</label>
                  <input
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                    placeholder="Genre"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.24em] text-slate-300">Tone</label>
                  <input
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                    placeholder="Tone"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.24em] text-slate-300">Chapter prompts (one per line)</label>
                <textarea
                  value={chapters}
                  onChange={(e) => setChapters(e.target.value)}
                  rows={6}
                  className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                  placeholder="Chapter prompts"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <label className="text-xs uppercase tracking-[0.24em] text-slate-300">Words per chapter</label>
                  <input
                    type="number"
                    min={100}
                    max={2000}
                    value={words}
                    onChange={(e) => setWords(Number(e.target.value))}
                    className="mt-1 w-full rounded-2xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs uppercase tracking-[0.24em] text-slate-300">Voice input (Whisper)</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleTranscribe}
                    className="text-xs text-slate-200"
                  />
                  {transcribeBusy ? <span className="text-xs text-slate-400">Transcribing...</span> : null}
                  {transcribeError ? <span className="text-xs text-rose-300">{transcribeError}</span> : null}
                  {transcribed ? <p className="text-xs text-emerald-200">Added from voice: {transcribed}</p> : null}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => void generate()}
                  disabled={busy}
                  className="rounded-full border border-emerald-400/60 bg-emerald-500/20 px-5 py-2 text-xs uppercase tracking-[0.28em] text-emerald-50 transition hover:border-emerald-300 disabled:opacity-50"
                >
                  {busy ? "Generating..." : "Generate book"}
                </button>
                {error ? <span className="text-xs text-rose-300">{error}</span> : null}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-white">Outline</p>
                {outline.length === 0 ? (
                  <p className="text-xs text-slate-400">No outline yet.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm text-slate-200">
                    {outline.map((item, idx) => (
                      <li key={idx} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Chapters</p>
                {draftChapters.length === 0 ? (
                  <p className="text-xs text-slate-400">No chapters yet.</p>
                ) : (
                  <div className="mt-2 space-y-3">
                    {draftChapters.map((ch, idx) => (
                      <div key={idx} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <p className="text-sm font-semibold text-white">{ch.title || `Chapter ${idx + 1}`}</p>
                        <p className="mt-1 text-sm text-slate-200 whitespace-pre-line">{ch.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>

        <TaskCheckInPanel />
      </div>
    </main>
  );
}
