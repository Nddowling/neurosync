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

## ADR-011 — OIDC production auth, explicit synthetic local adapter
Decision: use maintained openid-client for authorization-code/PKCE/nonce verification, PostgreSQL-backed opaque sessions and server-side CSRF checks. Provision approved clinician identities offline; no automatic clinician enrollment from arbitrary emails. Provide a password-verified local adapter only when NODE_ENV=development and AUTH_MODE=local; it uses Node's standard scrypt and works without hosted credentials. Alternatives: vendor-bound browser tokens, public self-registration, development identity headers. Reason: portability and independent local development without weakening production identity. Consequence: production OIDC issuer/client credentials and approved identity mappings remain deployment inputs; real provider verification cannot be claimed from synthetic tests. Reversibility: swap the external verifier while retaining owned sessions/profiles/policies.

## ADR-012 — Explicit patient field compatibility
Decision: preserve canonical existing SQL columns and add missing workflow fields; translate legacy UI names at a validated repository boundary. Keep a constrained temporary records endpoint with fixed tables/fields/actions rather than forwarding PostgREST query strings. Alternatives: rename/drop the schema or generic JSON persistence. Reason: preserve UI behavior and relational integrity. Consequence: targeted DTO tests for every patient tab, dates, money and status required. Reversibility: progressively replace the compatibility API with domain-specific methods.

## ADR-013 — Isolate NeuroSync inside the approved existing database
User approved repurposing Lead Generator project xjltsyviygqisleutgua, including deletion if needed. Inspection found empty legacy patient tables alongside substantial unrelated app tables. Decision: create dedicated neurosync, neurosync_auth and neurosync_migrations schemas in that project. Render the immutable historical public-schema migrations into this fixed namespace; retain source checksums. Alternatives: wipe every app's tables; collide with existing public.user_subscriptions. Reason: a fresh NeuroSync schema satisfies the request without unnecessary cross-app disruption or a paid project. Consequence: schema namespace is part of our PostgreSQL adapter, not a vendor API. Reversibility: standard PostgreSQL schema/data export remains portable. Managed PostgreSQL cannot toggle SUPERUSER/BYPASSRLS flags: reject an unsafe preexisting role rather than attempting privileged role alterations.

Production is the deployment target per user instruction. Tests remain local synthetic verification; no separate demo or staging environment will be created.

### ADR-014 — Production identity adapter and invitation eligibility

Supabase Auth PKCE email links perform external authentication; NeuroSync maps only verified, invitation-eligible addresses into owned clinician identities and issues its own hashed, revocable server sessions. Neither Supabase user metadata nor browser-submitted owner IDs grant access. OIDC remains an alternative adapter. The user deferred selecting the first clinician email. A company email is optional. The offline provisioning script sends no email.

### ADR-015 — Owned knowledge storage and replaceable vectors

Bounded PDFs (2 MiB, 100 pages, 500,000 extracted characters) are stored in an owner-isolated PostgreSQL bytea table. Downloads require authentication and are attachments. Parsing rejects invalid, empty/image-only and oversized documents; OCR and malware scanning are not claimed. Version snapshots, chunks and citation identifiers are owned tables. Default embeddings are deterministic local lexical token-hash vectors, combined with PostgreSQL full-text retrieval; these are not learned semantic embeddings. `EmbeddingProvider` is the replacement boundary. Candidate vector scanning is bounded to 2,000 owned chunks; a larger corpus needs an indexed vector adapter and retrieval evaluation.

### ADR-016 — Commerce authority and activation

Stripe calls remain at the billing adapter boundary. Opaque customer mapping is created by the application; no patient/chart data is sent to Stripe. Webhooks validate raw-body signatures and use separate `neurosync_billing` authority, event deduplication and canonical subscription retrieval. The role has NOLOGIN until a dedicated credential is configured; app_rw cannot grant itself paid entitlements. Browser usage increments and locally invented subscription counts were removed. Missing AI/payment configuration is reported as unavailable, never replaced with production mocks.

### ADR-017 — Runtime extraction and validation boundaries

Removed Base44 SDK, Vite plugin, token URL/localStorage bootstrap, split note persistence and unused hosted MCP-consent source. React/Vite and route names are retained. Production Vercel deploys the owned Fetch API alongside the SPA. Historical Base44 source remains outside production packaging for migration provenance; imports and runtime asset references are absent. Live clinical AI, Stripe commerce and email authentication still require credential/account activation and end-to-end checks. Removing imports alone does not satisfy full feature readiness.
