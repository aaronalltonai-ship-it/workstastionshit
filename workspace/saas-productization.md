# SaaS Productization Outline (v1)

## Packaging
- Tiers: Starter (core dashboard + assistant), Pro (agents + pipelines + policy), Enterprise (custom agents, SSO, audit, SLAs).
- Add-ons: Video pipeline seats, Music pipeline seats, Compliance/policy pack, Memory/IP isolation.

## Multi-Tenant Architecture
- Isolate client data/memory per tenant; scoped file ops.
- Per-tenant API keys and rate limits; usage metering.
- Tenant-aware logging/analytics; audit trails per tenant.

## Safety & Policy
- Consent + watermark on by default; tenant-configurable policies.
- Block real-person likeness without approvals; redaction and blocklists.
- Budget/rate guards per tenant; configurable.

## Agent Layer
- Orchestrator with tenant routing; policy checks before actions.
- Action schema: sections/tasks/events/notes/files; validate paths (/workspace/tenant/{id}).
- Model routing: choose provider/model per tenant; fallbacks.

## Pipelines
- Video: scene prompts, model selection (Sora/Hailuo/Pika), render tracking, watermark step.
- Music: structure JSON, lyric drafts, vocal analysis.
- App/website agent: intake widget + FAQ prompts; lead capture.

## Billing & Usage
- Track tokens/compute per agent and per tenant; dashboards.
- Usage-based billing hooks; overage alerts; cost caps.

## Deployment
- Env per stage; feature flags; health checks; backups.
- CDN for assets; private storage per tenant.
- SSO (SAML/OIDC) for Enterprise; RBAC.

## Onboarding & Support
- Templates for projects/prompts; sample pipelines.
- Policy presets; safety checklist; monitoring dashboards.
- Support: email/chat; premium support for Enterprise.
