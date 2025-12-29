"use client";
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useMemo, useRef, useState } from "react";

type Client = {
  id: number;
  name: string;
  contact?: string | null;
  projects: Project[];
};
type Project = {
  id: number;
  name: string;
  status?: string | null;
  owner?: string | null;
  due?: string | null;
  notes?: string | null;
  tasks: Task[];
};
type Task = {
  id: number;
  title: string;
  status?: string | null;
  due?: string | null;
  owner?: string | null;
  prompt?: string | null;
  timeSpentMs?: number | null;
  runningStart?: string | null;
  projectId?: number | null;
  projectName?: string | null;
  clientName?: string | null;
};
type Tab = "projects" | "tasks" | "calendar";

function formatDate(input: string) {
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

function computeElapsed(task: Task) {
  const base = typeof task.timeSpentMs === "number" ? Math.max(0, task.timeSpentMs) : 0;
  if (task.runningStart) {
    const start = Date.parse(task.runningStart);
    if (Number.isFinite(start)) {
      return base + Math.max(0, Date.now() - start);
    }
  }
  return base;
}

export default function ClientPage() {
  const [tab, setTab] = useState<Tab>("projects");
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timerBusy, setTimerBusy] = useState<number | null>(null);
  const [timerError, setTimerError] = useState<string | null>(null);
  const [newClientName, setNewClientName] = useState("");
  const [newClientContact, setNewClientContact] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectStatus, setNewProjectStatus] = useState("");
  const [newProjectOwner, setNewProjectOwner] = useState("");
  const [newProjectDue, setNewProjectDue] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState("");
  const [newTaskOwner, setNewTaskOwner] = useState("");
  const [newTaskDue, setNewTaskDue] = useState("");
  const [createBusy, setCreateBusy] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const activeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    void refresh();
  }, []);

  const activeClient = useMemo(() => clients.find((c) => c.id === clientId) || clients[0], [clients, clientId]);
  const projects = activeClient?.projects || [];
  const activeProject = useMemo(
    () => projects.find((p) => p.id === projectId) || projects[0],
    [projects, projectId],
  );
  const tasks = useMemo(() => {
    if (!activeProject) return [];
    return [...activeProject.tasks];
  }, [activeProject]);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => (a.due || "").localeCompare(b.due || ""));
  }, [tasks]);

  const calendarBuckets = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of sortedTasks) {
      const key = task.due || "No date";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return Array.from(map.entries()).map(([date, tasks]) => ({ date, tasks }));
  }, [sortedTasks]);

  useEffect(() => {
    return () => {
      if (activeTimerRef.current !== null) {
        void stopTimer(activeTimerRef.current);
      }
    };
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clients");
      if (!res.ok) throw new Error(`Clients request failed (${res.status})`);
      const data = (await res.json()) as { clients?: Client[] };
      const list = Array.isArray(data.clients) ? data.clients : [];
      setClients(list);
      if (list.length && clientId === null) setClientId(list[0].id);
      if (list.length && list[0].projects.length && projectId === null) setProjectId(list[0].projects[0].id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load clients.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function createClient() {
    if (!newClientName.trim()) return;
    setCreateBusy("client");
    setCreateError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClientName, contact: newClientContact }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create client.");
      if (data?.client?.id) {
        setClientId(data.client.id);
        setProjectId(null);
      }
      setNewClientName("");
      setNewClientContact("");
      await refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create client.");
    } finally {
      setCreateBusy(null);
    }
  }

  async function createProject() {
    if (!activeClient || !newProjectName.trim()) return;
    setCreateBusy("project");
    setCreateError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: activeClient.id,
          name: newProjectName,
          status: newProjectStatus,
          owner: newProjectOwner,
          due: newProjectDue,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create project.");
      if (data?.project?.id) {
        setProjectId(data.project.id);
      }
      setNewProjectName("");
      setNewProjectStatus("");
      setNewProjectOwner("");
      setNewProjectDue("");
      await refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create project.");
    } finally {
      setCreateBusy(null);
    }
  }

  async function createTask() {
    if (!activeProject || !newTaskTitle.trim()) return;
    setCreateBusy("task");
    setCreateError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: activeProject.id,
          title: newTaskTitle,
          status: newTaskStatus,
          owner: newTaskOwner,
          due: newTaskDue,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to create task.");
      setNewTaskTitle("");
      setNewTaskStatus("");
      setNewTaskOwner("");
      setNewTaskDue("");
      await refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create task.");
    } finally {
      setCreateBusy(null);
    }
  }

  async function startTimer(taskId: number) {
    setTimerBusy(taskId);
    setTimerError(null);
    try {
      await fetch("/api/dashboard/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action: "start" }),
      });
      activeTimerRef.current = taskId;
      await refresh();
    } catch (err) {
      setTimerError(err instanceof Error ? err.message : "Timer start failed.");
    } finally {
      setTimerBusy(null);
    }
  }

  async function stopTimer(taskId: number) {
    setTimerBusy(taskId);
    setTimerError(null);
    try {
      await fetch("/api/dashboard/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId, action: "stop" }),
      });
      if (activeTimerRef.current === taskId) activeTimerRef.current = null;
      await refresh();
    } catch (err) {
      setTimerError(err instanceof Error ? err.message : "Timer stop failed.");
    } finally {
      setTimerBusy(null);
    }
  }

  function handleSelectTask(taskId: number, running: boolean) {
    if (activeTimerRef.current && activeTimerRef.current !== taskId) {
      void stopTimer(activeTimerRef.current);
    }
    if (running) {
      void stopTimer(taskId);
    } else {
      void startTimer(taskId);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-200">Client workspace</p>
          <h1 className="text-3xl font-semibold text-white">Projects, tasks, and calendar</h1>
          <p className="text-sm text-slate-300">Data pulled from /api/clients with per-task timers.</p>
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

        <div className="rounded-3xl border border-white/10 bg-slate-900/60 p-4 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="mb-4 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">New client</p>
              <input
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Client name"
                className="mt-2 w-full rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              />
              <input
                value={newClientContact}
                onChange={(e) => setNewClientContact(e.target.value)}
                placeholder="Contact (optional)"
                className="mt-2 w-full rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              />
              <button
                onClick={() => void createClient()}
                disabled={createBusy === "client" || !newClientName.trim()}
                className="mt-2 w-full rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-2 text-xs uppercase tracking-[0.28em] text-emerald-100 transition hover:border-emerald-300 disabled:opacity-50"
              >
                {createBusy === "client" ? "Adding..." : "Add client"}
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">New project</p>
              <input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Project name"
                className="mt-2 w-full rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  value={newProjectStatus}
                  onChange={(e) => setNewProjectStatus(e.target.value)}
                  placeholder="Status"
                  className="w-full rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                />
                <input
                  value={newProjectOwner}
                  onChange={(e) => setNewProjectOwner(e.target.value)}
                  placeholder="Owner"
                  className="w-full rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                />
              </div>
              <input
                value={newProjectDue}
                onChange={(e) => setNewProjectDue(e.target.value)}
                placeholder="Due (optional date)"
                className="mt-2 w-full rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              />
              <button
                onClick={() => void createProject()}
                disabled={createBusy === "project" || !newProjectName.trim() || !activeClient}
                className="mt-2 w-full rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-2 text-xs uppercase tracking-[0.28em] text-emerald-100 transition hover:border-emerald-300 disabled:opacity-50"
              >
                {createBusy === "project" ? "Adding..." : activeClient ? "Add project" : "Select client first"}
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">New task</p>
              <input
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Task title"
                className="mt-2 w-full rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              />
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  value={newTaskStatus}
                  onChange={(e) => setNewTaskStatus(e.target.value)}
                  placeholder="Status"
                  className="w-full rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                />
                <input
                  value={newTaskOwner}
                  onChange={(e) => setNewTaskOwner(e.target.value)}
                  placeholder="Owner"
                  className="w-full rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
                />
              </div>
              <input
                value={newTaskDue}
                onChange={(e) => setNewTaskDue(e.target.value)}
                placeholder="Due (optional date)"
                className="mt-2 w-full rounded-full border border-white/20 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400/60"
              />
              <button
                onClick={() => void createTask()}
                disabled={createBusy === "task" || !newTaskTitle.trim() || !activeProject}
                className="mt-2 w-full rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-2 text-xs uppercase tracking-[0.28em] text-emerald-100 transition hover:border-emerald-300 disabled:opacity-50"
              >
                {createBusy === "task" ? "Adding..." : activeProject ? "Add task" : "Select project first"}
              </button>
            </div>
          </div>
          {createError ? <p className="mb-4 text-xs text-rose-300">{createError}</p> : null}
          <div className="mb-4 flex flex-wrap gap-2">
            <select
              value={clientId ?? activeClient?.id ?? ""}
              onChange={(e) => setClientId(Number(e.target.value))}
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white"
            >
              {(clients || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={projectId ?? activeProject?.id ?? ""}
              onChange={(e) => setProjectId(Number(e.target.value))}
              className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white"
            >
              {(projects || []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {(["projects", "tasks", "calendar"] as Tab[]).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.28em] transition ${
                  tab === key
                    ? "border-emerald-400/70 bg-emerald-500/20 text-emerald-100"
                    : "border-white/15 bg-white/5 text-slate-200 hover:border-emerald-300/60"
                }`}
              >
                {key}
              </button>
            ))}
            <button
              onClick={() => void refresh()}
              className="ml-auto rounded-full border border-white/20 px-4 py-2 text-xs uppercase tracking-[0.28em] text-white transition hover:border-emerald-400/50"
            >
              Refresh
            </button>
            {loading ? <span className="text-xs text-slate-400">Loading...</span> : null}
          </div>

          {error ? (
            <p className="text-xs text-rose-300">{error}</p>
          ) : !activeClient ? (
            <p className="text-sm text-slate-400">No data loaded yet.</p>
          ) : tab === "projects" ? (
            <div className="grid gap-3 md:grid-cols-2">
              {projects.map((project) => (
                <div key={project.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold text-white">{project.name}</p>
                    <span className="text-xs uppercase tracking-[0.24em] text-emerald-200">{project.status}</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {activeClient.name} — Owner: {project.owner || "Unassigned"}
                  </p>
                </div>
              ))}
            </div>
          ) : tab === "tasks" ? (
            <div className="space-y-3">
              {sortedTasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{task.title}</p>
                      <p className="text-xs text-slate-400">
                        {activeProject?.name || "Project"} — {task.status || "Todo"} — {task.owner || "Unassigned"}
                      </p>
                    </div>
                    <span className="text-xs text-slate-300">{task.due || "No date"}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-emerald-100">
                    <span>Time: {formatDuration(computeElapsed(task))} {task.runningStart ? "(running)" : ""}</span>
                    <button
                      onClick={() => handleSelectTask(task.id, Boolean(task.runningStart))}
                      disabled={timerBusy === task.id}
                      className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.28em] transition ${
                        task.runningStart
                          ? "border-rose-400/60 bg-rose-500/10 text-rose-100"
                          : "border-emerald-400/60 bg-emerald-500/10 text-emerald-100"
                      } ${timerBusy === task.id ? "opacity-50" : ""}`}
                    >
                      {task.runningStart ? "Stop" : "Start"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {calendarBuckets.map((bucket) => (
                <div key={bucket.date} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{formatDate(bucket.date)}</p>
                    <span className="text-xs text-slate-400">{bucket.tasks.length} task(s)</span>
                  </div>
                  <div className="space-y-2">
                    {bucket.tasks.map((task) => (
                      <div key={task.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">{task.title}</span>
                          <span className="text-xs text-slate-400">{task.status}</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          {(activeProject?.name || "Project")} — {task.owner || "Unassigned"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
