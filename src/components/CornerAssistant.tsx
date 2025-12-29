"use client";

import { useState } from "react";

export function CornerAssistant() {
  const [expanded, setExpanded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  async function send() {
    if (!input.trim()) return;
    const prompt = input.trim();
    setInput("");
    setLoading(true);
    setError(null);
    setHistory((prev) => [...prev, { role: "user", content: prompt }]);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || `Assistant failed (${res.status})`);
      }
      setHistory((prev) => [...prev, { role: "assistant", content: data?.reply || "No reply." }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Assistant failed.";
      setError(message);
      setHistory((prev) => [...prev, { role: "assistant", content: message }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      <div className="rounded-2xl border border-emerald-400/40 bg-slate-950/90 px-4 py-3 text-xs text-slate-100 shadow-2xl shadow-black/40 backdrop-blur max-w-xs">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-emerald-200">Assistant</p>
            <p className="text-[12px] text-slate-300">{expanded ? "Ask or jump to apps" : "Quick jump to agent + dashboards."}</p>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-emerald-100 hover:border-emerald-300"
          >
            {expanded ? "Hide" : "Open"}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <a className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white hover:border-emerald-300" href="/dashboard">
            Dashboard
          </a>
          <a className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white hover:border-emerald-300" href="/assistant">
            Full Agent
          </a>
          <a className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white hover:border-emerald-300" href="/book">
            Book
          </a>
          <a className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white hover:border-emerald-300" href="/masterwriter">
            MasterWriter
          </a>
          <a className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white hover:border-emerald-300" href="/storyboard">
            Storyboard
          </a>
        </div>
        {expanded ? (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask the agent..."
                className="w-full rounded-xl border border-white/15 bg-slate-900/70 px-3 py-2 text-[12px] text-white outline-none focus:border-emerald-400/60"
              />
              <button
                onClick={() => void send()}
                disabled={loading || !input.trim()}
                className="rounded-xl border border-emerald-400/60 bg-emerald-500/20 px-3 py-2 text-[11px] uppercase tracking-[0.24em] text-emerald-100 disabled:opacity-50"
              >
                {loading ? "..." : "Send"}
              </button>
            </div>
            {error ? <p className="text-[11px] text-rose-300">{error}</p> : null}
            <div className="max-h-48 overflow-y-auto space-y-1">
              {history.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}-${msg.content.slice(0, 6)}`}
                  className={`rounded-xl border px-2 py-1 text-[12px] ${
                    msg.role === "user"
                      ? "border-white/10 bg-white/5 text-white"
                      : "border-emerald-400/40 bg-emerald-500/10 text-emerald-50"
                  }`}
                >
                  <span className="uppercase tracking-[0.18em] text-[10px] text-white/70">{msg.role}</span>
                  <p className="whitespace-pre-line text-[12px]">{msg.content}</p>
                </div>
              ))}
              {history.length === 0 ? <p className="text-[11px] text-slate-400">No messages yet.</p> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
