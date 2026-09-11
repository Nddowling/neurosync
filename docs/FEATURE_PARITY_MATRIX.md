# Feature parity matrix

Source-observed behavior at 4bdb09e; live behavior unverified. No feature is complete merely because it renders.

| Feature | Current state | Base44 dependency | Target implementation | Migration status | Test/validation | Known gaps |
|---|---|---|---|---|---|---|
| Landing | Implemented public page | Auth status/login; remote favicon | Preserved page and owned login | Not started | Visual + navigation | No live session checked |
| Authentication | Hosted settings + SDK | me/isAuthenticated/redirect/logout | OIDC adapter, opaque sessions | Not started | Session expiry/revocation/CSRF/forgery | No owned auth implementation |
| Dashboard | Recent entities + appointments | ConsultSession/ClinicalNote + supabase | Owned aggregates/repositories | Not started | Counts, ordering, ownership | Metadata/body split; session creation agent-dependent |
| Patients | List/search/create | supabase; auth.me | Owned patient API | Not started | CRUD + ownership + field mappings | SQL lacks UI fields |
| Patient Detail | Profile/edit; six related tabs | supabase | Owned related records | Not started | Cross-clinician joins; read/update/delete | Related identifiers not tenant-bound in SQL |
| Patient medications/goals/billing | Create/list/delete; goals status | supabase | Owned domain repositories | Not started | Enum/field/amount mapping and ownership | UI/SQL schema drift |
| Consult | Chat/status/typewriter/sources | agents + trackUsage | Owned conversation orchestration | Not started | Send/reload/retry/history | Meter is per message |
| Conversation creation | Explicit new or first send | createConversation | SQL conversation service | Not started | Metadata and duplicate handling | First-message title may contain PHI |
| Conversation history | List/get/subscribe; active ID locally | agents | SQL messages + refresh/stream contract | Not started | Reload/order/ownership/unsubscribe | Session linkage incomplete |
| AI clinical consultation | Hosted agent tools and instructions | clinicalAssistant | Versioned gateway and tool policies | Not started | Clinical synthetic fixtures + adapters | No owned model config or evidence validation |
| SOAP generation | Two prompts, billing-aware consult | InvokeLLM; ClinicalNote; supabase | Owned SOAP engine + atomic save | Not started | All billing branches, missing fields, persistence | Crisis branch shadowed; output unvalidated |
| CPT selection | Preset, multi-select, AI lookup | InvokeLLM + internet context | Owned lookup/task adapter | Not started | Combined/crisis/custom codes | Licensing and correctness review |
| ICD workflow | Local presets + generated codes | SOAP InvokeLLM | Owned structured coding draft | Not started | Presets + validated output + review | Codes not authoritative claims |
| Clinical notes | Metadata list/finalize; body rehydrate; copy/print | ClinicalNote + supabase | Single authoritative note + versions | Not started | Atomic save/reload/finalize/export audit | Persistence can fail while metadata succeeds |
| Medication reference | Query + typewriter | InvokeLLM | analyzeMedication | Not started | Adapter contract + safe rendering | No formulary data store |
| DSM reference | Preset categories + AI query | InvokeLLM | Owned evidence/reference task | Not started | Source/permission/license checks | Licensed corpus not present |
| Knowledge Base | Manual CRUD, PDF upload/extract | entities + Core upload/extract + agent read | Document/version/chunk/embedding/citation | Not started | Upload restrictions, retrieval and isolation | No owned RAG/storage/parser |
| Calendar | Month/week views, schedule/list | supabase | Owned appointments + patient service | Not started | Date/time/timezone/status/ownership | UI date+time vs SQL scheduled_at |
| Subscription page | Plan cards, checkout and promo | getSubscription/createCheckout | Owned commerce API | Not started | Checkout URLs and plan display | No cancellation portal implementation |
| Plan limits | Duplicated 5/3 free, paid unlimited | hook + trackUsage | Central server plan config | Not started | Boundary and inactive-plan tests | Client fallback and status holes |
| Usage metering | Calendar-month read/update | UserSubscription | Atomic reservations/ledger | Not started | Concurrent requests/replay/reset | SOAP page unmetered |
| Stripe checkout | Fixed prices plus promo price creation | createCheckout | Stripe adapter + server price config | Not started | Mock request/minimal metadata | Hosted price validity unverified |
| Stripe webhook handling | Signature checked, two event families | service-role UserSubscription | Transactional event ledger | Not started | Invalid signature/replay/retry/order | Errors acknowledged; duplicate resets |
| Account/user functionality | Profile display, ToS, logout | auth User extension | Owned clinician profile/session | Not started | Role immutability/ToS audit | No dedicated account page |
| Audit logging | SQL write triggers only, not wired | Planned database | Protected audit writes + API reads | Not started | Immutability, actor isolation, no bodies | Existing audit grants contradict comments |
| OAuth/MCP consent | Unrouted page source | Direct Base44 platform endpoints | Owned protocol if retained | Not started | Consent replay and redirect validation | Server/config absent; not claimed as working feature |
