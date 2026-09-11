# Phase 2 validation — 2026-09-11

Local PostgreSQL 17.11; Node 26.7.0; npm 11.19.0. Synthetic data only; no remote services or real records.

| Command | Exit | Result |
|---|---:|---|
| npm ci | 0 | Deterministic lockfile install |
| npm run build | 0 | Existing production frontend build passes |
| npm run lint | 1 | Same 16 legacy UI unused-import errors; no new server errors |
| npm run typecheck | 2 | Strict server check passes, then identical 381 legacy diagnostics in 36 files |
| npm test | 0 | 29 passing, zero failures/skips; actual PostgreSQL and HTTP transport |
| npx eslint server scripts tests | 0 | New code lint passes |
| git diff --check | 0 | No whitespace errors |

Adjacent phase2-*.txt files retain output. Frontend diagnostic lines compared exactly with docs/baseline/typecheck.txt, not just counts. Original migrations 0001–0003 and src/ remained unchanged. npm audit still reports 27 findings (critical jspdf); not silently fixed or hidden.

Test evidence includes reproducing inherited UPDATE/DELETE audit grants before 0004, then actual app_rw login tests for ownership, missing identity, role/membership/BYPASSRLS refusal, cross-owner foreign keys, immutable audit, rollback, SQL-injection subject handling, forged identity rejection, and HTTP behavior. Unit-only tests do not substitute for the real PostgreSQL run.

Limits: identity verifier injected in tests; no production auth provider/session integration. Full UI workflows, AI, uploads, Stripe, live permissions, backup restore, hosted deployment and contractual coverage not verified. The health endpoint is liveness only. Phase 2 is an API/database foundation, not completed feature extraction.
