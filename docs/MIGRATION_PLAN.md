# Migration plan

Status: baseline/reconnaissance complete; extraction not complete. Work only on codex/base44-extraction. No remote push, deployment, live data access or paid resources. Phase gates retain visibility of known legacy failures; they must not be relabeled as passing. New backend checks must pass independently.

| Phase | Scope | Complexity | State / gate |
|---|---|---|---|
| 0 | Baseline and audit | Low | Complete; existing failures recorded |
| 1 | Architecture/dependency mapping | Medium | Complete; hosted behavior unknown |
| 2 | Owned PostgreSQL/API foundation | High | Next; runtime-role isolation tests |
| 3 | Compatibility facade | Medium | Pending entity/auth contracts |
| 4 | Authentication replacement | High | Pending verified sessions and provisioning |
| 5 | Entity persistence/field parity | High | Pending schema mappings |
| 6 | Conversations | High | Pending ordered state and ownership |
| 7 | AI gateway and prompts | High | Pending provider contracts and tools |
| 8 | SOAP migration | High | Pending billing-aware fixtures and human review |
| 9 | Knowledge/storage/RAG | High | Pending parsing, embeddings, citations and licensing |
| 10 | Stripe/subscriptions/usage | High | Pending atomic ledger and replay tests |
| 11 | Remaining feature parity | High | Pending end-to-end workflow tests |
| 12 | Remove SDK/runtime | Medium | Blocked on behavior replacement |
| 13 | Security/regression | High | Pending complete security test suite and dependency triage |
| 14 | Deployment readiness | Medium | Contract verification before PHI; no deploy now |

## Exact first implementation milestone

Add an owned PostgreSQL/API foundation without switching UI traffic: parameterized identity-scoped transactions, runtime-role guard, migration runner/ledger, additive RLS/audit hardening, synthetic clinician patient CRUD slice, fail-closed injectable auth boundary, health endpoint, safe errors, strict input validation, isolated local PostgreSQL tests. No fake production identity or live database access. Existing 0001–0003 stay intact.

Files intended: package.json/package-lock.json; eslint.config.js (add server scope without reducing UI rules); tsconfig.server.json; server/auth/identity.ts; server/db/{pool,transaction,migrate}.ts; server/repositories/patients.ts; server/api/app.ts; server/index.ts; scripts/migrate.ts; db/migrations/0004_runtime_security.sql; tests/{database,api}.test.ts; .gitignore; .env.example; compose.yaml; docs and db/README.md. Exact helper files may be added as implementation dictates.

Tests: actual PostgreSQL as app_rw shows A cannot read/update/delete B, missing identity sees no protected rows, forged owner fields rejected, cross-owner child references blocked, audit immutable and scoped, role escalation denied, runtime refuses owner/BYPASSRLS credentials, rollback clears identity and data, pooled connections do not leak identity. HTTP authentication failure, validation, safe error and health tests. Migration replay/checksum checks. Run build/lint/typecheck and compare diagnostic baseline; server strict typecheck and tests must pass. No live auth/AI/Stripe credentials needed for this milestone.

## Gates and recovery

Each phase: git status, build/lint/typecheck/applicable tests, compare parity and extraction maps, update decisions/plan, inspect diff, coherent local commit. Existing type debt is carried visibly until replaced. Cutover only after golden synthetic workflow fixtures, deployment restore exercise and full ownership checklist pass. Import tooling must dry-run counts, identity mapping, referential integrity and reconcile both note stores before any authorized real-data move. Do not infer existing hosted schema from this incomplete SQL snapshot. Keep original Git history and export strategy; never delete remote resources to establish ownership.
