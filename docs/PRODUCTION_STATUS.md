# Production extraction status

Updated 2026-09-11. The user authorized working directly in production and confirmed existing NeuroSync data is synthetic/test data. No separate staging deployment was created.

## Infrastructure

- Existing repository: `Nddowling/neurosync`, migration branch `codex/base44-extraction`.
- Vercel project: `neurosync`, `prj_qSRgY8Nk3ZTmJgw3tBn8OmBIkuB5`, team `nicks-projects-0994fdbd`.
- Production URL: https://neurosync-navy.vercel.app
- Existing Supabase project: Lead Generator (`xjltsyviygqisleutgua`, us-east-2).
- Owned schemas: `neurosync`, `neurosync_auth`, `neurosync_migrations`.
- Unrelated public-schema applications and records were preserved. No data wipe was necessary.
- Runtime `app_rw` is a nonowner role with no elevated role flags or memberships. Hosted IPv4 transaction-pooler connectivity and runtime isolation checks passed with certificate and hostname verification enabled.
- Fresh runtime credential exists only in ignored `.env.production.local` (0600) and Vercel production environment. It is not a Supabase service-role key. No existing credential was rotated.

## Implemented

Owned server sessions/CSRF, operator-provisioned password authentication, invitation-scoped Supabase PKCE email authentication, optional OIDC adapter, clinician-scoped record CRUD, conversation history, model routing for OpenAI/Anthropic/Google, versioned clinical and SOAP prompts, schema-validated atomic SOAP persistence, quota reservations and failure release, billing-aware SOAP branches, note finalization protection, knowledge PDF ingestion/private downloads/chunks/version history/local lexical embeddings/citation evidence, and Stripe checkout/webhook adapters with separate commerce authority.

Frontend routes and existing React/Vite layout remain. SDK/build-plugin runtime dependencies were removed. Replaced unused hosted OAuth consent source; an external MCP authorization server was never present in this repository and is not claimed as implemented.

## Activation still required

- The first administrator has been provisioned at the user’s request with a hashed password and active enterprise testing entitlement. Password login uses owned identity storage in Supabase and normal production sessions; administrator role retains clinician data isolation. No email invitation is required for this login.
- Optional email-link authentication still requires Supabase Auth to allow `https://neurosync-navy.vercel.app/api/auth/supabase-callback` as an additional redirect URL. Preserve other applications' settings in this shared Supabase project. End-to-end email delivery and callback require a selected account and provider configuration.
- AI provider keys and model selections are not configured. AI endpoints fail closed with `service_unavailable`; no simulated response is served. Configure `AI_CLINICAL_*`, `AI_SOAP_*`, and `AI_REFERENCE_*` plus selected provider API keys. Live inference has not been validated.
- Stripe secret key, webhook signing secret, product price IDs and an isolated `neurosync_billing` login credential are not configured. This role currently has NOLOGIN. No live purchase or Stripe webhook round-trip has been made. Never reuse unrelated applications' payment keys without authorization.
- Privacy agreements, BAA eligibility, retention/backup/restore operations, and external email deliverability remain deployment/operator requirements. No compliance certification is claimed.

## Validation limits

Deterministic provider fixtures validate adapter contracts and persistence without external AI calls. Temporary PostgreSQL test clusters contain only synthetic records. A route rendering successfully does not establish clinical feature readiness. See validation logs and feature parity matrix for evidence and remaining gaps.

## Verified production API smoke (2026-09-11)

Health returned 200; anonymous profile/document access returned 401. A temporary synthetic server-session identity verified patient creation/date retrieval, linked appointment persistence, patient-linked conversation/history, PDF parsing/private storage/download, knowledge deletion, explicit unavailable AI/commerce responses and logout revocation. The synthetic identity and its records were removed afterward; audit metadata was retained. This deliberately tests the API/session boundary and does not establish external email authentication readiness.

The in-app browser runtime could not initialize (`browser-client is not trusted` / native bridge unavailable), so no interactive-browser or screenshot verification is claimed.

## Release gates

`npm ci`, build, lint and full typecheck pass. Typecheck: zero errors. Integration/unit suite: 41 passing tests, including production password login, rejected credentials and secure session cookies. Compatible security updates reduced the audit to four moderate findings; no high or critical findings remain. Major-version dependency upgrades were not forced. The first deployed PDF-parser packaging failure and direct IPv6 connection incompatibility were corrected with explicit native dependencies, lazy parser loading and the verified IPv4 transaction pooler.

Supabase's security advisor identified one NeuroSync-specific mutable search path inherited from the original timestamp trigger. Additive migration 0012 pins it to pg_catalog; unrelated existing public-schema findings were not modified. [Advisor remediation reference](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).

## Release record

Application commit: `d1a5e4a` on `codex/base44-extraction`. Final production deployment: `neurosync-h0ibe5qzy-nicks-projects-0994fdbd.vercel.app`, aliased to `https://neurosync-navy.vercel.app`. Post-deployment health/config endpoints returned 200, anonymous profile access returned 401, and the page title is NeuroSync.

Vercel deployment is manual for this migration. The automatically added Git connection was disconnected so repository pushes do not generate preview builds or deploy the old main branch. Source remains in GitHub; reconnect CI/CD after choosing the desired production branch and activation gates.

The follow-up Supabase security-advisor check returned no NeuroSync-schema findings. Pre-existing findings in unrelated schemas remain outside this migration.

## Administrator password activation (2026-09-11)

Deployed `neurosync-3haumtd84-nicks-projects-0994fdbd.vercel.app` to the production alias. Verified the supplied administrator credentials against the live API: successful login, secure session cookies, administrator profile, active enterprise entitlement, authorized patient-list access and logout revocation. The login page returned 200. Temporary local credential artifacts were deleted after verification; no password was committed. Browser interaction remains unverified because of the native bridge limitation above. AI and payment provider activation remain outstanding.
