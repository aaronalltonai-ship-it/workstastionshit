# Build Checklist (v1)

## 0) Foundations
- Env: set GROQ_API_KEY, DB URL, secrets; disable committing secrets.
- Config: allowedDevOrigins for local IPs; CORS; HTTPS in prod.
- Logging: request logs, agent action logs, file ops logs.

## 1) Agent Kernel
- Define action schema (sections, tasks, events, notes, file create/append).
- Add validation and guardrails; fail closed on unsafe paths.
- Route assistant requests through policy checks; cap tokens and temperature.

## 2) Data & Memory
- Notes/sections/projects/tasks/events persisted (DB or KV).
- Prompt/template store with versioning.
- Client memory store keyed by client/account.
- Audit trail for agent changes.

## 3) File Ops
- Scope to /workspace; prevent traversal.
- API: create, append, read, list; add size limits.
- Write tests for path safety and size guards.

## 4) UI / Control
- Tabs: Projects, Agents, Templates & Prompts, Music & Lyrics, Memory, Policy & Safety, Analytics, Deployment, Files, Company OS.
- Agent panel: quick prompts + custom prompt; show actions applied.
- Activity log; file log; system notices.

## 5) Video / Music Pipelines
- Video: scene list, prompt versioning, model selector (Sora/Hailuo/Pika), render tracker, assembly (EDL/timeline), watermark step.
- Music: structure JSON (tempo, bars, map), lyric drafts, vocal analysis (phrasing/breath), output stems refs.
- Safety: consent and watermark enforcement; block real-person likeness.

## 6) Policy & Safety
- Watermarks on by default; consent required for likeness.
- Budget/time guards per request; rate limiting.
- Red-team prompts for leakage; add blocklists/allowlists.

## 7) Costs & Analytics
- Track per-agent token/compute usage; per-project cost rollups.
- Simple dashboards: throughput, failures, safety blocks.

## 8) Deployment
- Build: next build; health check endpoints.
- Env per stage; feature flags for new agents.
- Backups for DB/memory; rollback plan.

## 9) QA
- Smoke tests: API health, assistant action parsing, file ops, UI tabs.
- Policy tests: ensure blocked likeness and watermark rules.
- Load test critical endpoints (assistant, file ops).
