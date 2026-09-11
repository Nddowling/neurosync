# Architecture decisions

## ADR-001 — Retain React/Vite
Decision: retain existing frontend; add an owned TypeScript API. Alternatives: Next.js migration, full rewrite. Reason: no observed SSR need; lowest behavior-change risk. Consequence: explicit API/auth transport needed. Reversibility: frontend can migrate later without changing domain services.

## ADR-002 — Preserve SQL; additive migrations and pg
Decision: keep 0001–0003 byte-for-byte; add hardened privileges/policies/constraints. Alternatives: generated ORM replacement, Supabase service role. Reason: preserve relational intent while closing observed gaps. Consequence: explicit repository mappings and migration ledger needed. Reversibility: new migrations evolve schema; no destructive production rollback without review.

## ADR-003 — Compatibility facade as staged seam
Decision: preserve caller contracts temporarily; replace each behavior after tests, including AuthContext's direct SDK utility and OAuth platform fetches. Alternatives: page rewrite, removing SDK immediately. Reason: reduce regression. Consequence: some legacy naming survives until phase 12; no generic browser prompt or raw database endpoint as final API. Reversibility: replace facade with native typed client incrementally.

## ADR-004 — Identity and security foundation first
Decision: runtime transactions accept verified identity through an auth adapter; deny requests without it. No production development-identity header. Remove global app.role admin bypass; reserve cross-clinic access for later owned membership policy. Alternatives: trust browser owner, use superuser, copy current admin setting. Reason: deterministic isolation. Consequence: first milestone is foundation, not working migrated login. Reversibility: auth adapter replaceable; sharing added through explicit policy/migrations.

## ADR-005 — Synthetic local verification, separate deployment gate
Decision: only synthetic local data; install local PostgreSQL if needed; no hosted resources, data export or deployment now. Alternatives: test against production, infer RLS from SQL. Reason: actual database behavior must be proven without PHI. Consequence: hosted functional parity remains unverified. Reversibility: test database disposable; real-data migration requires explicit authorization.

## ADR-006 — Own AI and clinical workflow contracts
Decision: task-specific gateway, versioned prompts, strict output schemas; configurable provider adapters. Alternatives: generic browser InvokeLLM proxy or one vendor scattered through pages. Reason: security and portability. Consequence: billing-aware SOAP behavior must be ported deliberately, including documented crisis/fabrication corrections. Reversibility: adapters/models replaceable; prompt versions remain traceable.

## ADR-007 — Separate hosting from contractual eligibility
Decision: prepare Vercel-compatible frontend/API packaging but keep backend portable. Alternatives: assume Vercel or Google stack BAA coverage. Reason: no contractual evidence in repo. Consequence: production PHI flows require verification of each service. Reversibility: deploy backend elsewhere without rewriting domain.
