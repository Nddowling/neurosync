# Security gaps — code evidence, not compliance certification

| ID | Finding / evidence | Priority | Treatment / phase |
|---|---|---|---|
| S01 | supabase/entry.ts uses service role and user_id; checked SQL uses owner_uid | Critical boundary | Owned non-owner SQL transactions, 2–5 |
| S02 | update forwards data.user_id; client query column names unvalidated | High | Strict per-operation schemas; no browser identity fields, 3–5 |
| S03 | 0002 grants future table UPDATE/DELETE; audit_log inherits them, has no RLS | High | Additive revoke + audit policies; actual role tests, 2 |
| S04 | current_is_admin trusts app.role string, allowing broad PHI access | High | Remove runtime global bypass; server verification + owned membership, 2/4 |
| S05 | FK(patient_id) does not bind child owner to parent owner; note session FK absent | High | Composite tenancy constraints; negative insert/update tests, 2/5 |
| S06 | audit_write SECURITY DEFINER has no pinned search_path | High | Qualify targets, pin trusted path, revoke public execute, 2 |
| S07 | Clinician can write role; subscription owner can edit paid plan/counters via broad grants | High | Narrow privileges; separate provisioning/commerce paths, 2/4/10 |
| S08 | No owned server identity/session implementation; Base44 policies unknown | High | Verified identity, session lifecycle, provisioning and auth tests, 4 |
| S09 | Best-effort note body plus separate metadata/finalization | High | Atomic owned note transaction, explicit failures and versioning, 5/8 |
| S10 | Local usage fallback; non-atomic counters; SOAP page unmetered | High | Server-side atomic reservations and entitlements, 7/10 |
| S11 | Webhook lacks idempotency, resets usage on retries, suppresses processing errors | High | Event ledger and retry-safe transaction, 10 |
| S12 | PDF extraction accepts unchecked upload, unmanaged file URLs and unlimited concurrency | High | Private quarantine/storage/scan/parse limits, 9 |
| S13 | AI output trusted, credentials implied, missing observations may be fabricated | High | Versioned owned prompts, strict schemas and review gates, 7/8 |
| S14 | Raw errors/logging; plugin analytics/navigation; Scholar queries may contain sensitive text | High | PHI-safe logger and no analytics on clinical routes, 3/12/13 |
| S15 | No backend request limits/rate limits/CSRF/headers/audit reads in repo | High | API security boundaries and tests, 2/4/13 |
| S16 | 27 npm audit findings incl. critical at baseline | High | Record dependency paths; targeted upgrades + regression, 13 |
| S17 | Existing docs assert BAA coverage and /infra resources without evidence | High | Mark historical, contractual verification inventory, 1/14 |
| S18 | No clinic membership, break-glass, retention/restore tests or incident response | Deployment gap | Explicit policy, schema and operations work before real PHI, 13/14 |

The SQL identity setting protects against missing filters, not a fully compromised database credential or arbitrary SQL execution: app_rw can set custom session settings. Do not expose raw SQL, owner/role inputs or credentials. Verify identity before opening domain transactions. Test RLS as the actual runtime login, not only SET ROLE from a superuser.

Sources checked 2026-09-11: [PostgreSQL RLS](https://www.postgresql.org/docs/17/ddl-rowsecurity.html) confirms owner bypass and that referential integrity checks bypass RLS; [CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html) covers trusted search paths for SECURITY DEFINER. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) documents service-role bypass. No live exploitation or production access performed.
