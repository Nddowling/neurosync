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

## ADR-008 — Foundation authentication is deny-by-default
Decision: expose IdentityVerifier and authenticated Identity transaction boundary, with no default identity in the standalone API. Tests inject synthetic verifiers only in test modules. Alternatives: trust a developer header or immediately couple to one hosted provider. Reason: cannot mistake a development shortcut for verified clinician identity. Consequence: API patient endpoints return 401 until the session adapter/provisioning milestone; this is explicitly not authentication feature completion. Reversibility: wire a verified adapter without changing repositories.

## ADR-009 — Test real PostgreSQL in an ephemeral local cluster
Decision: npm test provisions a new socket-only PostgreSQL cluster and uses an actual app_rw connection; never consumes an existing DATABASE_URL. Alternatives: mocked SQL, SQLite, production integration database. Reason: actual RLS/privilege/transaction semantics with no PHI exposure. Consequence: local PostgreSQL binaries required (PG_BIN supported); no persistent service needed. Reversibility: identical integration suite can move to an isolated CI PostgreSQL container.

## ADR-010 — Fail closed on unknown schema provenance
Decision: migration runner records checksums, rejects edited/missing/out-of-order history and refuses an existing untracked patients schema. Alternatives: blindly rerun IF NOT EXISTS DDL or label existing migrations applied. Reason: checked schema differs from live adapter contract. Consequence: existing deployment needs an explicit reviewed adoption procedure and data preflight; no automatic real-data migration. Reversibility: add reviewed adoption tooling later without modifying historical SQL.
