"use client";

import { useEffect, useMemo, useState } from "react";

type DataSource = { id: string; name?: string };
type DbResult = {
  databaseId: string;
  title?: string;
  status: "ok" | "error";
  dataSources: DataSource[];
  error?: string;
};

type ApiPayload = {
  databaseIds: string[];
  results: DbResult[];
  version: string;
  message?: string;
};

const notebooks = [
  { title: "Data source discovery", detail: "GET /v1/databases/{id} → data_sources[]", tone: "emerald" },
  { title: "Parent updates", detail: "Use data_source_id for page parents and relations", tone: "cyan" },
  { title: "MCP link", detail: "HTTPS: https://mcp.notion.com/mcp · SSE: /sse · STDIO: npx -y mcp-remote ...", tone: "amber" },
  { title: "SDK & webhooks", detail: "@notionhq/client v5 + webhook version 2025-09-03", tone: "emerald" },
];

const mcpConfigs = [
  {
    label: "Streamable HTTP",
    json: `{
  "mcpServers": {
    "Notion": { "url": "https://mcp.notion.com/mcp" }
  }
}`,
  },
  {
    label: "SSE",
    json: `{
  "mcpServers": {
    "Notion": { "type": "sse", "url": "https://mcp.notion.com/sse" }
  }
}`,
  },
  {
    label: "STDIO relay",
    json: `{
  "mcpServers": {
    "notionMCP": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.notion.com/mcp"]
    }
  }
}`,
  },
];

const createSnippet = `{
  "parent": { "type": "data_source_id", "data_source_id": "..." },
  "properties": {
    "Title": { "title": [{ "text": { "content": "Hello" } }] }
  }
}`;

const searchSnippet = `{
  "query": "tasks",
  "filter": { "property": "object", "value": "data_source" }
}`;

const agentSops = [
  {
    title: "Core Control",
    items: ["Orchestrator Agent: task planning, routing, budget/policy", "Policy & Safety Agent: watermark/consent, fail closed"],
  },
  {
    title: "Video",
    items: [
      "Video Director: pick model (Sora/Hailuo/Pika), beats/timing",
      "Prompt Engineer: per-scene prompts (style/camera/motion)",
      "Video Assembly: sequence renders, EDL/timeline, mark missing",
      "Lip Sync: align vocals; flag drift >120ms",
    ],
  },
  {
    title: "Music & Songwriting",
    items: [
      "Songwriting AI: hook/verse options; keep rhyme/intent",
      "Music Structure: tempo, bars, verse/chorus map JSON",
      "Vocal Analysis: phrasing/emphasis/breath points",
    ],
  },
  {
    title: "AI Dev",
    items: ["AI Solutions Architect: build vs integrate, data flow, evals", "AI App Builder: scaffold tools/dashboards, logging"],
  },
  {
    title: "Business",
    items: ["Client Intake: parse briefs, goals, budget/dates", "Pricing: package + margins", "PM: owners/dates/blockers", "Delivery: approvals + links"],
  },
  {
    title: "Memory / IP",
    items: ["Prompt & Template Agent: store/version/score reuse", "Client Memory Agent: prefs/voices/styles per client ID"],
  },
];

const safetyChecklist = [
  "No unapproved real-person likeness; enforce consent.",
  "Watermark AI media by default.",
  "Log actions with timestamps; fail closed on missing approvals.",
  "Respect budgets, rate limits, and usage caps.",
];

const buildChecklist = [
  "Env & config: GROQ_API_KEY, DB URL, allowedDevOrigins; logging on requests/actions/files.",
  "Agent kernel: action schema, validation, policy gate, token/temp caps.",
  "Data/memory: projects/tasks/events/notes persisted; prompt store; client memory; audit trail.",
  "File ops: scoped to /workspace; size limits; tests for traversal.",
  "UI tabs: Projects, Agents, Templates, Music/Lyrics, Memory, Policy, Analytics, Deployment, Files, Company OS.",
  "Video/music pipelines: model selector, prompt versioning, render tracker, structure JSON, watermark step.",
  "Policy & Safety: consent checks, watermarks, budget/time guards, blocklists.",
  "Costs & Analytics: per-agent token/compute, rollups, dashboards.",
  "Deployment/QA: next build, health checks, staging envs, feature flags, backup/rollback, smoke/policy/load tests.",
];

const visualSystem = [
  "AI Intake → Orchestrator (rules/budget/policy) → Creative/Tech agents → QA/Policy/Memory/Safety → Final delivery",
  "Tabs: Projects, Agents, Templates/Prompts, Music/Lyrics, Memory, Policy/Safety, Analytics/Costs, Deployment, Files, Company OS",
  "Build vs Buy: Build (orchestrator, prompts/templates, video pipelines, safety); Buy (LLMs, GPUs, storage)",
];

const companyStatement =
  "We operate a human-guided, multi-agent AI company that creates music, video, software, and AI solutions using proprietary systems.";

const projectData = {
  projects: [
    { id: "p-001", name: "Storefront polish", client: "Internal", status: "Active", owner: "iLL" },
    { id: "p-002", name: "Holiday drop", client: "Brand", status: "Planned", owner: "Cody" },
  ],
  tasks: [
    { id: "t-001", title: "Ship hero banner", project: "Storefront polish", status: "Doing", due: "2025-12-24", owner: "iLL" },
    { id: "t-002", title: "QA checkout", project: "Holiday drop", status: "Todo", due: "2025-12-26", owner: "Bill" },
    { id: "t-003", title: "Catalog sync", project: "Storefront polish", status: "Doing", due: "2025-12-23", owner: "Ad" },
  ],
  notes: [
    { id: "n-001", title: "KPIs", content: "AOV target 80, CVR 4.5%", reference: "deck" },
    { id: "n-002", title: "Risks", content: "Checkout flakiness on Safari", reference: "qa" },
  ],
};

const investorDeck = [
  { title: "Title & Positioning", bullets: ["Human-guided multi-agent studio for video, music, and AI apps.", "Proprietary orchestrator, policy engine, template/IP stack."] },
  { title: "Problem", bullets: ["Brands need bespoke AI without black-box risk.", "Current tools lack policy, consent, watermark, auditability."] },
  { title: "Solution", bullets: ["Company OS: intake → orchestrator → agents → QA/policy → delivery.", "Built-in safety: consent, watermark, budget/rate guards, file-scoped ops."] },
  { title: "Product", bullets: ["Control dashboard tabs (Projects, Agents, Templates, Music/Lyrics, Memory, Policy/Safety, Analytics, Deployment, Files, Company OS).", "Agent actions: tasks/events/notes/files; video/music assembly; policy enforcement."] },
  { title: "Tech Moat", bullets: ["Orchestrator + policy engine + prompt/template system.", "Video pipelines (scene prompts, model selection, EDL/assembly, watermark).", "Songwriting pipelines (structure JSON, lyric drafts, vocal analysis).", "Client memory and IP store."] },
  { title: "Traction / Proof", bullets: ["Add demos (video/music, app agents, policy logs).", "Add early adopters/pilots and KPIs (cost/time saved)."] },
  { title: "GTM", bullets: ["Direct to brands/creators; agency partnerships.", "Website AI agent for intake/upsell."] },
  { title: "Business Model", bullets: ["Platform + usage; optional pro services.", "Compliance/policy add-ons."] },
  { title: "Roadmap", bullets: ["Agent SOPs → Policy hardening → Cost/analytics → Deploy pipelines → SaaS packaging.", "Multi-model (Sora/Hailuo/Pika) + eval loops."] },
  { title: "Team / Ask", bullets: ["Add founders/advisors.", "Funding/partnership ask; use of funds (product, safety, GTM)."] },
];

const saasOutline = [
  { title: "Packaging", bullets: ["Tiers: Starter / Pro / Enterprise.", "Add-ons: video seats, music seats, compliance/policy, memory/IP isolation."] },
  { title: "Multi-Tenant Architecture", bullets: ["Isolate data per tenant; scoped file ops.", "Per-tenant API keys, rate limits, usage metering, audit trails."] },
  { title: "Safety & Policy", bullets: ["Consent + watermark default; tenant-configurable.", "Block real-person likeness without approvals; redaction/blocklists.", "Budget/rate guards per tenant."] },
  { title: "Agent Layer", bullets: ["Orchestrator with tenant routing + policy checks.", "Action schema: sections/tasks/events/notes/files; validate /workspace/tenant/{id}.", "Model routing per tenant; fallbacks."] },
  { title: "Pipelines", bullets: ["Video: scene prompts, model selection, render tracking, watermark.", "Music: structure JSON, lyric drafts, vocal analysis.", "App/website agent: intake widget + FAQ + lead capture."] },
  { title: "Billing & Usage", bullets: ["Track tokens/compute per agent and per tenant.", "Usage-based billing hooks; overage alerts; cost caps."] },
  { title: "Deployment", bullets: ["Env per stage; feature flags; health checks; backups.", "CDN/private storage per tenant; SSO (SAML/OIDC); RBAC."] },
  { title: "Onboarding & Support", bullets: ["Templates for projects/prompts; sample pipelines.", "Policy presets; safety dashboards.", "Support: email/chat; premium for Enterprise."] },
];

export default function WorkspaceHub() {
  const [payload, setPayload] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/notion/databases", { cache: "no-store" });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = (await res.json()) as ApiPayload;
        if (!cancelled) setPayload(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load Notion status.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    if (!payload?.results) return { databases: 0, dataSources: 0, ok: 0 };
    const ok = payload.results.filter((r) => r.status === "ok").length;
    const ds = payload.results.reduce((acc, r) => acc + r.dataSources.length, 0);
    return { databases: payload.results.length, dataSources: ds, ok };
  }, [payload]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_16%,rgba(34,197,94,0.12),transparent_36%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(14,165,233,0.12),transparent_36%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
          <header className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Workspace</p>
              <h1 className="text-4xl font-semibold text-white sm:text-5xl">Notion control deck</h1>
              <p className="max-w-2xl text-sm text-slate-300">
                Env-driven status for all databases, data_source_id discovery, and MCP connection recipes. Ready for the 2025-09-03 API.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-slate-200">
                  DBs: {counts.databases} · Sources: {counts.dataSources}
                </span>
                <span className="rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-emerald-100">
                  Ready: {counts.ok}
                </span>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-slate-200">
                  Version: {payload?.version || "2025-09-03"}
                </span>
              </div>
            </div>
            <div className="rounded-3xl border border-emerald-400/40 bg-emerald-500/10 p-5 text-sm text-emerald-50 shadow-2xl shadow-black/40">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Connection</p>
              <p className="text-lg font-semibold text-white">Token + IDs</p>
              <p className="text-sm text-emerald-50/80">
                .env.local → NOTION_TOKEN & NOTION_DATABASE_IDS (comma-separated). This page pings Notion to list data_sources.
              </p>
              {payload?.message ? <p className="mt-2 text-xs text-emerald-100/80">{payload.message}</p> : null}
              {error ? <p className="mt-2 text-xs text-amber-200">{error}</p> : null}
              {loading ? <p className="mt-2 text-xs text-emerald-100">Checking…</p> : null}
            </div>
          </header>

          <section className="grid gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/40 backdrop-blur lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-3">
              <p className="text-sm font-semibold text-white">Upgrade checklist</p>
              <p className="text-xs text-slate-400">Apply before bumping prod to 2025-09-03.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {notebooks.map((item) => (
                  <div
                    key={item.title}
                    className={`rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200 ${
                      item.tone === "emerald"
                        ? "shadow-[0_0_24px_rgba(16,185,129,0.25)]"
                        : item.tone === "cyan"
                          ? "shadow-[0_0_24px_rgba(34,211,238,0.25)]"
                          : "shadow-[0_0_24px_rgba(251,191,36,0.25)]"
                    }`}
                  >
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-slate-300">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">API bodies</p>
              <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-xs text-amber-50">
                Create page
                <pre className="mt-2 overflow-auto rounded-lg bg-black/50 p-2 text-[12px] leading-relaxed text-amber-100">{createSnippet}</pre>
              </div>
              <div className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-3 text-xs text-cyan-50">
                Search (data sources)
                <pre className="mt-2 overflow-auto rounded-lg bg-black/50 p-2 text-[12px] leading-relaxed text-cyan-100">{searchSnippet}</pre>
              </div>
            </div>
          </section>

          <section className="grid gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/40 backdrop-blur lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">MCP connection</p>
                  <p className="text-lg font-semibold text-white">Notion MCP</p>
                </div>
                <span className="rounded-full border border-emerald-300/60 bg-emerald-500/15 px-3 py-1 text-[11px] uppercase tracking-[0.26em] text-emerald-50">
                  Live data
                </span>
              </div>
              <p className="text-sm text-slate-300">
                Use Notion MCP to supply workspace context to AI tools. Connect via the directory or add the public server manually.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {mcpConfigs.map((config) => (
                  <div key={config.label} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                    <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">{config.label}</p>
                    <pre className="mt-2 overflow-auto rounded-lg bg-black/60 p-2 text-[12px] leading-relaxed text-emerald-100">{config.json}</pre>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Troubleshooting</p>
              <ul className="space-y-2 text-sm text-slate-200">
                <li>Tool must support MCP client; if not, use STDIO relay.</li>
                <li>Share Notion pages/databases with the integration so it can read them.</li>
                <li>Remote MCP blocked? Try SSE or STDIO.</li>
              </ul>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Notion sources</p>
                <p className="text-xs text-slate-400">From NOTION_DATABASE_IDS with data_source_id discovery.</p>
              </div>
              {loading ? <span className="text-xs text-slate-400">Loading…</span> : null}
            </div>
            {payload?.results?.length ? (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {payload.results.map((db) => (
                  <div key={db.databaseId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white">{db.title || "Untitled database"}</p>
                        <p className="text-xs text-slate-400">{db.databaseId}</p>
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
            ) : (
              <p className="mt-3 text-sm text-slate-400">No database IDs detected. Add NOTION_DATABASE_IDS to .env.local.</p>
            )}
          </section>

          <section className="grid gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/40 backdrop-blur lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Agent SOPs</p>
                  <p className="text-lg font-semibold text-white">Operating playbook</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {agentSops.map((group) => (
                  <div key={group.title} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-sm font-semibold text-white">{group.title}</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-200">
                      {group.items.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-amber-200">Safety checklist</p>
              <ul className="space-y-2 text-sm text-slate-200">
                {safetyChecklist.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="grid gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/40 backdrop-blur lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Build checklist</p>
                  <p className="text-lg font-semibold text-white">Execution order</p>
                </div>
              </div>
              <div className="space-y-2 text-sm text-slate-200">
                {buildChecklist.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Company OS</p>
              <p className="text-sm text-slate-200">{companyStatement}</p>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Visual system</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-200">
                  {visualSystem.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section className="grid gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/40 backdrop-blur lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Investor / Partner deck</p>
                  <p className="text-lg font-semibold text-white">Outline v1</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {investorDeck.slice(0, 8).map((section) => (
                  <div key={section.title} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-sm font-semibold text-white">{section.title}</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-200">
                      {section.bullets.map((b) => (
                        <li key={b}>• {b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">Roadmap & Ask</p>
              <div className="space-y-2 text-sm text-slate-200">
                {investorDeck.slice(8).map((section) => (
                  <div key={section.title} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-sm font-semibold text-white">{section.title}</p>
                    <ul className="mt-1 space-y-1 text-xs text-slate-200">
                      {section.bullets.map((b) => (
                        <li key={b}>• {b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/40 backdrop-blur lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-200">SaaS productization</p>
                  <p className="text-lg font-semibold text-white">Packaging → Multi-tenant → Policy</p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {saasOutline.slice(0, 4).map((section) => (
                  <div key={section.title} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-sm font-semibold text-white">{section.title}</p>
                    <ul className="mt-2 space-y-1 text-xs text-slate-200">
                      {section.bullets.map((b) => (
                        <li key={b}>• {b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-white/10 bg-slate-950/70 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-200">Pipelines & Ops</p>
              <div className="space-y-2 text-sm text-slate-200">
                {saasOutline.slice(4).map((section) => (
                  <div key={section.title} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-sm font-semibold text-white">{section.title}</p>
                    <ul className="mt-1 space-y-1 text-xs text-slate-200">
                      {section.bullets.map((b) => (
                        <li key={b}>• {b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-2xl shadow-black/40 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Projects & Tasks</p>
                <p className="text-xs text-slate-400">Static snapshot (replace with live Notion sync later).</p>
              </div>
            </div>
            <div className="mt-3 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.26em] text-emerald-200">Projects</p>
                <div className="mt-2 space-y-2 text-sm text-slate-200">
                  {projectData.projects.map((p) => (
                    <div key={p.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                      <p className="font-semibold text-white">{p.name}</p>
                      <p className="text-xs text-slate-400">
                        Client: {p.client} · Owner: {p.owner} · Status: {p.status}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.26em] text-cyan-200">Tasks</p>
                <div className="mt-2 space-y-2 text-sm text-slate-200">
                  {projectData.tasks.map((t) => (
                    <div key={t.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                      <p className="font-semibold text-white">{t.title}</p>
                      <p className="text-xs text-slate-400">
                        Project: {t.project} · Owner: {t.owner} · Status: {t.status} · Due: {t.due}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.26em] text-amber-200">Notes</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 text-sm text-slate-200">
                {projectData.notes.map((n) => (
                  <div key={n.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2">
                    <p className="font-semibold text-white">{n.title}</p>
                    <p className="text-xs text-slate-400">{n.content}</p>
                    <p className="text-[11px] text-slate-500">Ref: {n.reference}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
