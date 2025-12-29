# Agent SOPs (v1)

## Core Control
- Orchestrator Agent: break intake into tasks; assign to agents; enforce budget/policy; emit actions; log routing decisions.
- Policy & Safety Agent: apply watermark/consent rules; block real-person likeness unless approved; fail closed on missing approvals; keep safety log.

## Video
- Video Director Agent: pick model (Sora/Hailuo/Pika) based on duration/resolution; define scene list with beats and timing; request prompts from Prompt Engineer.
- Prompt Engineer Agent: generate per-scene prompts (style, camera, motion, lighting, aspect); version prompts; hand off to Video Assembly.
- Video Assembly Agent: collect renders; sequence; add transitions; return EDL/timeline; mark missing scenes; deliver preview link.
- Lip Sync Agent: align vocals to video timestamps (waveform/syllable); output offset map; flag drift >120ms.

## Music & Songwriting
- Songwriting AI Agent: draft lyric variants (hook/verse); keep rhyme/intent from human brief; propose 3 options.
- Music Structure Agent: set tempo, bar count, verse/chorus map; output structure JSON; constrain prompts to structure.
- Vocal Analysis Agent: detect phrasing/emphasis/breath points; suggest punches/backups; mark difficult lines.

## AI Dev
- AI Solutions Architect: decide build vs integrate; outline data flow, auth, evals; hand spec to App Builder.
- AI App Builder Agent: scaffold tools/dashboards; wire APIs; add logging; return deployment steps.
- Website AI Agent: generate embed script + FAQ prompts; route to intake; enforce safety answers before handoff.

## Business
- Client Intake Agent: parse briefs/forms/chat; normalize goals, budget, dates; create tasks/events; tag account.
- Pricing Agent: propose package + line items; respect margin targets; flag low-margin risks.
- Project Manager Agent: assign owners; set dates; monitor status; ping blockers.
- Delivery Agent: package outputs; verify watermark/consent; send client-ready links; log approvals.

## Memory / IP
- Prompt & Template Agent: store/retrieve approved prompts; version; score reuse.
- Client Memory Agent: keep client-specific prefs, voices, styles; guard access by client ID.

## Safety checklist (all agents)
- No unapproved real-person likeness; enforce consent.
- Watermark all AI media by default.
- Time-stamp and log actions; fail closed on missing approvals.
- Respect budgets, rate limits, and usage caps.
