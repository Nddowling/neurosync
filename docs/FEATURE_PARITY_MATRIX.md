# Feature parity matrix

Updated 2026-09-11. “Implemented” means owned code exists; vendor-dependent validation is recorded per workflow. Original caller inventory is retained in BASE44_EXTRACTION_MAP.md. Do not equate removal of imports with completed live feature validation.

| Feature | Owned replacement and status | Evidence | Remaining gaps |
|---|---|---|---|
| Landing | Existing React page, owned favicon/login | Build, deployed HTML | Browser interaction verification unavailable in this session |
| Authentication/account | Owned sessions, CSRF, profile fields, Supabase PKCE email + OIDC adapters | Real password/session/expiry/logout and ownership tests; production session smoke | Administrator password login verified in production; optional Supabase email redirect configuration and email round-trip pending |
| Dashboard | Owned note/session/appointment queries | API/database tests, build | Visual aggregate checks pending |
| Patients | Whitelisted DTO/repository CRUD | Ownership, date and validation tests | Production UI interaction checks pending |
| Patient detail | Owned patient and related records | Foreign-parent rejection and owner isolation | UI interaction checks pending |
| Medication/goal/billing records | Explicit field/status/money mapping | Goal enum, currency and ownership tests | UI interaction checks pending |
| Consult/conversation creation | Owned conversation + patient session | Persistence and patient linkage tests | GPT-5 mini activated; clinical quality evaluation pending |
| Conversation history | Server-side ordered messages; active ID only in localStorage | Replay, ownership and reload tests | List currently bounded to 200 conversations |
| Clinical AI | Versioned prompt, provider adapters, owned evidence retrieval | Three provider transport contracts, synthetic orchestration | GPT-5 mini live chat and reload verified; clinical quality evaluation pending |
| SOAP engine | Structured output, billing contexts, atomic draft + usage | Crisis/combined/EM/therapy branch, foreign-parent, malformed output and replay tests; live GPT-5 mini generation/save/reload/replay | Live model quality evaluation pending |
| CPT selection | Presets preserved; owned reference task | Typecheck, billing branch tests | Live lookup and licensed code verification pending |
| ICD workflow | Presets + schema-validated draft codes | Typecheck, SOAP schema tests | No authoritative licensed code validation service |
| Clinical notes | Unified clinical body + metadata; finalized immutability; version snapshots | Atomic save/replay/finalization tests | Explicit amendment UX not implemented; existing copy/print retained |
| Medication reference | Owned task prompt/provider route | Transport contract tests | GPT-5 mini configured; medication-specific clinical evaluation pending |
| DSM reference | Owned diagnostic overview prompt | Build, adapter contracts and live diagnostic-reference response | Proprietary criteria/corpus not supplied; licensing review remains |
| Knowledge uploads/storage | Validated PDF parser, private PostgreSQL bytes, authenticated download | Owned deployment smoke and database tests | 2 MiB/100-page limit, no OCR or malware scanner |
| Knowledge RAG | Version snapshots, chunks, local lexical vectors + full-text evidence | Retrieval isolation, deletion, deterministic embedding tests | Not learned semantic embeddings; 2,000 vector-candidate bound; retrieval quality evaluation needed |
| Calendar | Existing screens, owned date/time/duration/status records | Schema mapping, owner isolation, production appointment smoke | Timezone conversion/DST UX evaluation pending |
| Subscription display | Owned server entitlements | Database authority tests | Payment credentials pending |
| Plan limits | Free 5 consult messages / 3 SOAP notes, paid plans centralized server-side | Reservation/idempotency/release tests | Load and distributed perimeter validation pending |
| Usage metering | Owned monthly event ledger and reservations | Failed AI releases quota; repeated completed generation not recounted | External token/cost accounting not configured |
| Stripe checkout | Server-controlled prices and return URLs; owned customer map | Typecheck, server validation | Live/test Stripe keys/price IDs missing; no checkout round-trip yet |
| Stripe webhook | Signature verification, event dedupe, canonical subscription state, separate commerce role | Commerce isolation, invalid signatures, replay and canonical out-of-order state fixtures | Live/test provider webhook delivery still pending |
| Audit | Append-only owner-scoped metadata audit; clinical bodies excluded | Privilege, RLS, definer-shadowing and mutation tests | Read/export coverage and retention operations need broader audit |
| External MCP OAuth | Removed unused Base44 consent source | Source inventory: no corresponding server in repository | External MCP server is not implemented |

Current deployment details and activation requirements: [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md).
