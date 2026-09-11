# Pre-migration baseline — 2026-09-11

Branch: `codex/base44-extraction`. Existing checkout reused; no clone. Original local HEAD `99445985d9f290bf51b892b26e7a539beac9327a`; after fetching, fast-forwarded migration branch five commits to current default branch `4bdb09e1c8c3f798a19cbaa5c59d247b997cbfdb`. Local main and remote untouched. Original implementation recoverable in Git.

Node v26.7.0; npm 11.19.0; npm lockfile; installed TypeScript 5.9.3. No application code changed before these checks.

| Check | Reproduced result |
|---|---|
| npm ci | PASS; 629 packages installed; 630 audited |
| npm run build | PASS; dist/index.html generated; missing Base44 settings means runtime unavailable |
| npm run lint | FAIL; 16 unused-import errors in 8 files |
| npm run typecheck | FAIL; 381 diagnostics in 36 files |
| Existing tests | No test script or checked-in test suite |

## Reconcile the reported 372 / 35 baseline

User reported **372 errors across 35 files** before migration. Independently typechecked a temporary `git archive 9944598` using the same installed compiler/dependencies: **372 / 35**, exactly matching. The five upstream commits add **8 errors in OAuthConsent.jsx** and **1 in MessageBubble.jsx**. No errors disappeared. Thus **381 / 36** is the control condition at current default HEAD; all are pre-existing. The archive was a temporary source snapshot, not another clone. No compiler settings changed or errors suppressed.

| Family | Count | Interpretation |
|---|---:|---|
| TS2322 | 237 | JSX props incompatible with inferred forwardRef/component props |
| TS2339 | 87 | Missing properties in inferred UI props, SDK output, import.meta env |
| TS2559 | 26 | JSX has no common props with inferred component type |
| TS2741 | 19 | Inferred required props omitted |
| TS2739 | 6 | Required object fields omitted |
| TS2345 | 3 | Callback / mutation argument inference |
| TS2353 | 1 | Object literal has unknown property |
| TS2362 / TS2363 | 2 | Date arithmetic typing |

Fix types in touched architecture incrementally. Do not disable TypeScript, weaken checks, broadly ignore diagnostics, or rewrite UI to service this debt. A passing server-only check will not imply the legacy frontend check passes.

## Warnings and limits

Install audit: **27 vulnerabilities: 2 low, 11 moderate, 13 high, 1 critical**. Registry report is time-sensitive; preserve evidence and triage, do not run force-fix. npm warns about install-script approval for core-js, esbuild and fsevents. Build warns missing `VITE_BASE44_APP_ID`, disabled proxy without `VITE_BASE44_APP_BASE_URL`, and old caniuse-lite data. Vite already sets logLevel:error; unchanged.

Baseline lint covers selected UI files, not the backend. Baseline jsconfig excludes some paths but imports still bring dependencies into checking. Deno functions are not validated by existing typecheck.

No Base44, Supabase, Stripe, AI or production database credentials were used; no patient records accessed. Hosted login, conversations, entity permissions, PDF extraction, checkout and webhooks cannot be exercised against the live system from this baseline. Build success is not functional parity.

Reproducible command output: [install](baseline/install.txt), [build](baseline/build.txt), [lint](baseline/lint.txt), [current typecheck](baseline/typecheck.txt), [prior typecheck](baseline/prior-typecheck.txt).

## Extraction validation update — 2026-09-11

The owned-backend and UI integration now pass the full `npm run typecheck` with **zero errors**, without compiler relaxation, TypeScript disabling, or error suppressions. Most baseline failures came from untyped Radix/HTML component wrappers; the touched wrappers now use their actual React/Radix prop and ref types. Remaining fixes included optional props, arithmetic over dates, query mutation argument types, checkbox tri-state handling, and the owned DTO fields.

Original baseline logs remain unchanged: 381 errors / 36 files at the upstream baseline, with 372 / 35 independently reproduced at the user's original commit. See `PRODUCTION_STATUS.md` and the current validation artifacts for limits; a clean typecheck is not evidence of live provider readiness.
