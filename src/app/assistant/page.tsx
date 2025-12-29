"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useState } from "react";
import { TaskCheckInPanel } from "@/components/TaskCheckInPanel";

type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
  status?: "ok" | "error";
  actions?: unknown[];
};

export default function AssistantPage() {
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);

  async function send() {
    if (!input.trim()) return;
    const prompt = input.trim();
    setBusy(true);
    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.error || detail?.message || `Assistant failed (${res.status})`);
      }
      const data = (await res.json()) as { reply?: string; actions?: unknown[] };
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "No reply returned.", status: "ok", actions: data.actions },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Assistant failed.";
      setError(message);
      setMessages((prev) => [...prev, { role: "assistant", content: message, status: "error" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Assistant</p>
          <h1 className="text-3xl font-semibold text-white">Groq-backed assistant</h1>
          <p className="text-sm text-slate-300">
            Send prompts to <code className="text-white">/api/assistant</code>. Replies and actions are shown below.
          </p>
          <div className="flex flex-wrap gap-3 text-xs text-emerald-100">
            <a className="underline" href="/">
              Home
            </a>
            <a className="underline" href="/dashboard">
              Dashboard
            </a>
            <a className="underline" href="/logs">
              Logs
            </a>
            <a className="underline" href="/health">
              Health
            </a>
          </div>
        </header>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="space-y-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for a plan, generate code, or request actions..."
              className="w-full rounded-2xl border border-white/15 bg-slate-950/70 p-3 text-sm text-slate-100 outline-none ring-emerald-500/40 focus:border-emerald-400/60 focus:ring"
              rows={4}
            />
            <div className="flex items-center gap-3">
              <button
                onClick={() => void send()}
                disabled={busy || !input.trim()}
                className="rounded-full border border-emerald-400/60 bg-emerald-500/20 px-5 py-2 text-xs uppercase tracking-[0.28em] text-emerald-50 transition hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Sending..." : "Send"}
              </button>
              {error ? <span className="text-xs text-rose-300">{error}</span> : null}
            </div>
            <div className="space-y-2 max-h-[420px] overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-2">
              {messages.length === 0 ? (
                <p className="text-sm text-slate-400">No messages yet.</p>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={`${msg.role}-${idx}-${msg.content.slice(0, 10)}`}
                    className={`rounded-2xl border p-3 text-sm ${
                      msg.role === "user"
                        ? "border-white/10 bg-white/5 text-white"
                        : msg.status === "error"
                          ? "border-rose-400/50 bg-rose-500/10 text-rose-100"
                          : "border-emerald-400/40 bg-emerald-500/10 text-emerald-50"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-white/70">
                      <span>{msg.role}</span>
                      {msg.status === "error" ? <span>Error</span> : null}
                    </div>
                    <p className="whitespace-pre-line">{msg.content}</p>
                    {msg.actions && Array.isArray(msg.actions) && msg.actions.length > 0 ? (
                      <details className="mt-2 text-xs text-slate-200">
                        <summary className="cursor-pointer text-emerald-200">Actions</summary>
                        <pre className="mt-1 overflow-auto rounded-xl bg-black/40 p-2 text-[11px] leading-relaxed text-slate-100">
                          {JSON.stringify(msg.actions, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <TaskCheckInPanel />
      </div>
    </main>
  );
}
