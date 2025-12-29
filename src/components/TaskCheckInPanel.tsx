"use client";

import { useEffect, useMemo, useState } from "react";

type Task = {
  id: number;
  title: string;
  projectName: string;
  clientName: string;
  status?: string | null;
  owner?: string | null;
  due?: string | null;
  runningStart?: string | null;
  timeSpentMs?: number | null;
};

type DashboardPayload = {
  tasks: Task[];
};

function formatDate(input?: string | null) {
  if (!input) return "No date";
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? input : d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatDuration(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "0s";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function computeElapsed(task: Task, now: number) {
  const base = typeof task.timeSpentMs === "number" ? Math.max(0, task.timeSpentMs) : 0;
  if (task.runningStart) {
    const start = Date.parse(task.runningStart);
    if (Number.isFinite(start)) {
      return base + Math.max(0, now - start);
    }
  }
  return base;
}

export function TaskCheckInPanel() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerBusy, setTimerBusy] = useState<number | null>(null);
  const [timerError, setTimerError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [hidden, setHidden] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ loading: boolean; error: string | null }>({
    loading: false,
    error: null,
  });

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sortedTasks = useMemo(() => {
    if (!tasks.length) return [];
    return [...tasks].sort((a, b) => (a.due || "").localeCompare(b.due || ""));
  }, [tasks]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error(`Dashboard request failed (${res.status})`);
      const data = (await res.json()) as DashboardPayload;
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load tasks.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleTimer(taskId: number, isRunning: boolean) {
    setTimerError(null);
    setTimerBusy(taskId);
    try {
      const res = await fetch("/api/dashboard/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action: isRunning ? "stop" : "start" }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.error || detail?.message || `Timer request failed (${res.status})`);
      }
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update timer.";
      setTimerError(message);
    } finally {
      setTimerBusy(null);
    }
  }

  async function aiAssist() {
    if (!tasks.length) return;
    setAiStatus({ loading: true, error: null });
    try {
      const context = tasks
        .slice(0, 6)
        .map((t) => `${t.title} (${t.status || "Todo"}) for ${t.projectName}`)
        .join("; ");
      const res = await fetch("/api/groq-compound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Give 3 concise next-step suggestions for these tasks: ${context}. Each under 80 chars. Return a bullet list.`,
          model: "groq/compound",
          temperature: 0.4,
        }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(detail || `AI request failed (${res.status})`);
      }
      const data = (await res.json()) as { output?: string };
      setError(data?.output || "AI returned no content.");
      setAiStatus({ loading: false, error: null });
    } catch (err) {
      setAiStatus({ loading: false, error: err instanceof Error ? err.message : "AI request failed" });
    }
  }

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="fixed bottom-4 right-4 z-10 h-10 w-10 rounded-full border border-emerald-400/60 bg-slate-900/80 text-[11px] uppercase tracking-[0.2em] text-emerald-100 shadow-lg shadow-black/40 hover:border-emerald-300"
        title="Open assistant"
      >
        AI
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-2xl shadow-black/30 relative">
      <button
        aria-label="Close assistant"
        onClick={() => setHidden(true)}
        className="absolute right-3 top-3 rounded-full border border-white/20 px-2 text-xs text-slate-300 hover:border-rose-300 hover:text-rose-200"
      >
        ✕
      </button>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-emerald-200">Task check-in</p>
          <p className="text-xs text-slate-400">Start/stop timers from any workstation.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            onClick={() => void aiAssist()}
            className="h-8 w-8 rounded-full border border-emerald-400/60 bg-emerald-500/10 text-[11px] uppercase tracking-[0.2em] text-emerald-100 hover:border-emerald-300"
            title="AI suggestions"
          >
            AI
          </button>
          <button
            onClick={() => void refresh()}
            className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white transition hover:border-emerald-400/60"
          >
            Refresh
          </button>
          {loading ? <span>Loading…</span> : null}
        </div>
      </div>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      {timerError ? <p className="text-xs text-rose-300">{timerError}</p> : null}
      {aiStatus.loading ? <p className="text-xs text-slate-300">AI suggestions loading…</p> : null}
      {aiStatus.error ? <p className="text-xs text-rose-300">{aiStatus.error}</p> : null}
      {!sortedTasks.length ? (
        <p className="text-sm text-slate-400">No tasks yet. Add one from /dashboard or /client.</p>
      ) : (
        <div className="space-y-2">
          {sortedTasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="font-semibold text-white">{task.title}</span>
                  <span className="text-xs text-slate-400">
                    {task.clientName} · {task.projectName} · {task.status || "Todo"} · {task.owner || "Unassigned"}
                  </span>
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">{formatDate(task.due)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-emerald-100">
                  Time: {formatDuration(computeElapsed(task, now))} {task.runningStart ? "(running)" : ""}
                </p>
                <button
                  onClick={() => void toggleTimer(task.id, Boolean(task.runningStart))}
                  disabled={timerBusy === task.id}
                  className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.24em] transition ${
                    task.runningStart
                      ? "border-rose-400/60 bg-rose-500/10 text-rose-100"
                      : "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                  } ${timerBusy === task.id ? "opacity-50" : ""}`}
                >
                  {timerBusy === task.id ? "Working..." : task.runningStart ? "Stop" : "Start"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
