"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useMemo, useState } from "react";

type NotionDataSource = { id: string; name?: string };
type NotionResult = {
  databaseId: string;
  title?: string;
  status: "ok" | "error";
  dataSources: NotionDataSource[];
  error?: string;
};
type NotionPayload = {
  databaseIds: string[];
  results: NotionResult[];
  version: string;
  message?: string;
};

type Client = {
  id: number;
  name: string;
  contact?: string | null;
};

type Project = {
  id: number;
  name: string;
  clientName: string;
  status?: string | null;
  owner?: string | null;
  due?: string | null;
  timeSpentMs?: number | null;
  runningStart?: string | null;
};

type Task = {
  id: number;
  title: string;
  projectId: number;
  projectName: string;
  clientName: string;
  status?: string | null;
  due?: string | null;
  owner?: string | null;
  prompt?: string | null;
  timeSpentMs?: number | null;
  runningStart?: string | null;
};

type DashboardState = {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  counts?: { clients: number; projects: number; tasks: number };
};

const NOTION_PROJECTS_DATA_SOURCE_ID = "2c190401-24a7-8133-98f6-000bf5671524";

const workstations = [
  { title: "Assistant", href: "/assistant", detail: "Groq-backed agent for planning and actions." },
  { title: "Book generator", href: "/book", detail: "Chapters + voice to prompt with Groq + Whisper." },
  { title: "MasterWriter", href: "/masterwriter", detail: "Lyrics/notes/audio cockpit with references." },
  { title: "Storyboard", href: "/storyboard", detail: "Drag/drop beats, attach clips & audio, export JSON." },
];

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

export default function DashboardPage() {
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerBusy, setTimerBusy] = useState<number | null>(null);
  const [timerError, setTimerError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [runningCount, setRunningCount] = useState<number | null>(null);
  const [notion, setNotion] = useState<NotionPayload | null>(null);
  const [notionLoading, setNotionLoading] = useState(false);
  const [notionError, setNotionError] = useState<string | null>(null);
  const [notionProjects, setNotionProjects] = useState<unknown[]>([]);
  const [notionProjectsLoading, setNotionProjectsLoading] = useState(false);
  const [notionProjectsError, setNotionProjectsError] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
    void fetchTimerSummary();
    void fetchNotion();
    void fetchNotionProjects();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sortedTasks = useMemo(() => {
    if (!state?.tasks) return [];
    return [...state.tasks].sort((a, b) => (a.due || "").localeCompare(b.due || ""));
  }, [state]);

  const projectsByClient = useMemo(() => {
    if (!state?.projects) return [];
    const map = new Map<string, Project[]>();
    for (const project of state.projects) {
      const key = project.clientName || "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(project);
    }
    return Array.from(map.entries());
  }, [state]);

  const notionCounts = useMemo(() => {
    if (!notion?.results) return { databases: 0, dataSources: 0, ok: 0 };
    const ok = notion.results.filter((r) => r.status === "ok").length;
    const ds = notion.results.reduce((acc, r) => acc + r.dataSources.length, 0);
    return { databases: notion.results.length, dataSources: ds, ok };
  }, [notion]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error(`Dashboard request failed (${res.status})`);
      const data = (await res.json()) as DashboardState;
      setState(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTimerSummary() {
    try {
      const res = await fetch("/api/dashboard/time");
      if (!res.ok) return;
      const data = (await res.json()) as { running?: number };
      if (typeof data.running === "number") setRunningCount(data.running);
    } catch {
      // ignore timer summary errors in UI
    }
  }

  async function fetchNotion() {
    setNotionLoading(true);
    setNotionError(null);
    try {
      const res = await fetch("/api/notion/databases", { cache: "no-store" });
      if (!res.ok) throw new Error(`Notion request failed (${res.status})`);
      const data = (await res.json()) as NotionPayload;
      setNotion(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load Notion status.";
      setNotionError(message);
    } finally {
      setNotionLoading(false);
    }
  }

  async function fetchNotionProjects() {
    setNotionProjectsLoading(true);
    setNotionProjectsError(null);
    try {
      const res = await fetch("/api/notion/data-sources/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataSourceId: NOTION_PROJECTS_DATA_SOURCE_ID }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.error || detail?.message || `Notion projects failed (${res.status})`);
      }
      const data = (await res.json()) as { results?: unknown[] };
      setNotionProjects(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load Notion projects.";
      setNotionProjectsError(message);
    } finally {
      setNotionProjectsLoading(false);
    }
  }

  function getNotionPageTitle(page: any) {
    const props = page?.properties;
    if (!props || typeof props !== "object") return page?.id || "Untitled";
    const titleProp = Object.values(props).find(
      (p: any) => p?.type === "title" && Array.isArray(p?.title) && p.title.length,
    ) as any;
    const txt = titleProp?.title?.map((t: any) => t?.plain_text).filter(Boolean).join(" ").trim();
    return txt || page?.id || "Untitled";
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
      await fetchTimerSummary();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update timer.";
      setTimerError(message);
    } finally {
      setTimerBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Dashboard</p>
          <h1 className="text-3xl font-semibold text-white">Clients, projects, tasks, timers</h1>
          <p className="text-sm text-slate-300">
            Data is pulled from Prisma/SQLite via <code className="text-white">/api/dashboard</code>. Start/stop timers feed{" "}
            <code className="text-white">/api/dashboard/time</code>.
          </p>
            <div className="flex flex-wrap gap-3 text-xs text-emerald-100">
              <a className="underline" href="/">
                Home
              </a>
              <a className="underline" href="/client">
              Clients
            </a>
              <a className="underline" href="/assistant">
                Assistant
              </a>
              <a className="underline" href="/logs">
                Logs
              </a>
            </div>
          </header>

        <section className="grid gap-3 rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur md:grid-cols-[1.3fr,1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Notion status</p>
            <p className="text-sm text-slate-300">Live data_sources via NOTION_TOKEN + NOTION_DATABASE_IDS.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-200">
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">DBs: {notionCounts.databases}</span>
              <span className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1">Sources: {notionCounts.dataSources}</span>
              <span className="rounded-full border border-cyan-400/60 bg-cyan-500/10 px-3 py-1">Ready: {notionCounts.ok}</span>
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                Version: {notion?.version || "2025-09-03"}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => void fetchNotion()}
                className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-white transition hover:border-emerald-400/50"
              >
                Refresh
              </button>
              {notionLoading ? <span className="text-xs text-slate-400">Checking…</span> : null}
              {notion?.message ? <span className="text-[11px] text-emerald-200">{notion.message}</span> : null}
              {notionError ? <span className="text-[11px] text-rose-300">{notionError}</span> : null}
            </div>
          </div>
          <div className="space-y-2 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-200">
            <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200">Workstations</p>
            {workstations.map((ws) => (
              <a
                key={ws.href}
                href={ws.href}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 transition hover:border-emerald-300/60"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{ws.title}</p>
                  <p className="text-xs text-slate-300">{ws.detail}</p>
                </div>
                <span className="text-[11px] uppercase tracking-[0.28em] text-emerald-200">Open</span>
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">Live snapshot</p>
              <p className="text-xs text-slate-400">/api/dashboard</p>
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
          ) : !state ? (
            <p className="text-sm text-slate-400">No data loaded yet.</p>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-emerald-100">Clients</p>
                  <p className="text-2xl font-semibold text-white">{state.counts?.clients ?? state.clients.length}</p>
                </div>
                <div className="rounded-2xl border border-cyan-400/40 bg-cyan-500/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-cyan-100">Projects</p>
                  <p className="text-2xl font-semibold text-white">{state.counts?.projects ?? state.projects.length}</p>
                </div>
                <div className="rounded-2xl border border-amber-400/40 bg-amber-500/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-amber-100">Tasks</p>
                  <p className="text-2xl font-semibold text-white">{state.counts?.tasks ?? state.tasks.length}</p>
                </div>
                <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-rose-100">Timers running</p>
                  <p className="text-2xl font-semibold text-white">{runningCount ?? 0}</p>
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Projects by client</p>
                <div className="mt-2 space-y-3">
                  {projectsByClient.map(([clientName, projects]) => (
                    <div key={clientName} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">{clientName}</p>
                        <span className="text-xs text-slate-400">{projects.length} project(s)</span>
                      </div>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {projects.map((project) => (
                          <div key={project.id} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-slate-200">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-white">{project.name}</span>
                              <span className="text-[11px] uppercase tracking-[0.24em] text-emerald-200">
                                {project.status || "Active"}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">
                              Owner: {project.owner || "Unassigned"} · Due: {formatDate(project.due)}
                            </p>
                            <p className="text-xs text-emerald-100 mt-1">
                              Time: {formatDuration(computeElapsed(project as unknown as Task, now))}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Tasks (global)</p>
                {timerError ? <p className="text-xs text-rose-300">{timerError}</p> : null}
                <div className="mt-1 space-y-2">
                  {sortedTasks.length === 0 ? (
                    <p className="text-sm text-slate-400">No tasks yet.</p>
                  ) : (
                    sortedTasks.map((task) => (
                      <div
                        key={task.id}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200"
                      >
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
                            Time: {formatDuration(computeElapsed(task, now))}
                            {task.runningStart ? " (running)" : ""}
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
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-200">Notion databases</p>
              <p className="text-sm text-slate-300">Data_sources discovered from NOTION_DATABASE_IDS.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>DBs: {notionCounts.databases}</span>
              <span>Sources: {notionCounts.dataSources}</span>
              <button
                onClick={() => void fetchNotion()}
                className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white transition hover:border-emerald-400/60"
              >
                Refresh
              </button>
              {notionLoading ? <span>Loading…</span> : null}
            </div>
          </div>
          {notionError ? <p className="mt-2 text-xs text-rose-300">{notionError}</p> : null}
          {!notion?.results?.length ? (
            <p className="mt-3 text-sm text-slate-400">No database IDs loaded yet.</p>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {notion.results.map((db) => (
                <div key={db.databaseId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-white">{db.title || "Untitled database"}</p>
                      <p className="text-[11px] text-slate-400">{db.databaseId}</p>
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.24em] ${
                        db.status === "ok"
                          ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                          : "border-rose-400/60 bg-rose-500/10 text-rose-100"
                      }`}
                    >
                      {db.status}
                    </span>
                  </div>
                  {db.dataSources?.length ? (
                    <div className="mt-2 space-y-1">
                      {db.dataSources.map((ds) => (
                        <div key={ds.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-200">
                          <p className="font-semibold text-white">{ds.name || "Data source"}</p>
                          <p className="font-mono text-[11px] text-slate-300">{ds.id}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">No data sources returned.</p>
                  )}
                  {db.error ? <p className="mt-2 text-xs text-rose-300">{db.error}</p> : null}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-white/10 bg-slate-900/60 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Notion projects</p>
              <p className="text-sm text-slate-300">Data source: {NOTION_PROJECTS_DATA_SOURCE_ID}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <button
                onClick={() => void fetchNotionProjects()}
                className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-white transition hover:border-emerald-400/60"
              >
                Refresh
              </button>
              {notionProjectsLoading ? <span>Loading…</span> : null}
            </div>
          </div>
          {notionProjectsError ? <p className="mt-2 text-xs text-rose-300">{notionProjectsError}</p> : null}
          {!notionProjects.length ? (
            <p className="mt-3 text-sm text-slate-400">No projects returned yet.</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {notionProjects.map((page: any) => (
                <div key={page?.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">{getNotionPageTitle(page)}</p>
                  <p className="text-[11px] text-slate-400 break-all">{page?.id}</p>
                  <p className="mt-1 text-xs text-slate-300">Parent data source: {NOTION_PROJECTS_DATA_SOURCE_ID}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
