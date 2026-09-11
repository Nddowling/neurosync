# Target architecture

Retain React/Vite and existing page layout. Browser → owned NeuroSync HTTP API → domain services → repositories → standard PostgreSQL. External identity, AI, payment and storage providers are adapters. No browser database/service credentials. Frontend hosting and PHI backend hosting can move independently.

```text
src/api/                 typed NeuroSync client; temporary legacy compatibility facade
src/pages/, components/  preserved workflows
server/api/              HTTP handlers, validation, safe errors, transport middleware
server/auth/             verified identity interface; OIDC adapter; sessions
server/domain/           patient, conversation, SOAP, evidence, billing, usage services
server/repositories/     parameterized PostgreSQL access
server/db/               pooled identity transactions, runtime-role checks, migrations
server/ai/               gateway, schemas, config, types
server/ai/prompts/       versioned consult/SOAP/medication/reference prompts
server/ai/providers/     OpenAI, Anthropic, Google and deterministic test adapter
server/storage/          private objects; local and hosted adapters; quarantine
server/plans/            centralized feature/limit definitions
server/security/         safe logging, audit, rate limits
scripts/                 migration and synthetic local bootstrap tooling
db/migrations/           retain 0001–0003; additive, reviewed SQL
tests/                   unit, HTTP, actual PostgreSQL isolation and contract tests
docs/                    architecture, runbooks, parity and deployment evidence
```

Use pg with explicit SQL transactions; no generated ORM replacement. Verify database login is a non-owner without SUPERUSER/BYPASSRLS/role escalation. Set local app.uid from server verification, parameterized, in every transaction. No global clinician admin bypass in routine runtime policies; future clinic sharing needs explicit membership authorization. Tenant relationships need composite owner+record foreign keys. Audit data is sensitive even without note bodies. Reads and writes require audit events with no free-text clinical payloads.

Authentication target: replaceable OIDC integration using maintained protocol libraries, authorization-code+PKCE, issuer/audience/signature/time validation, server-held opaque sessions (hashed tokens at rest), secure HttpOnly cookies, CSRF protection, revocation/expiry, approved clinician provisioning. Application roles are owned, never copied from editable profile metadata. MFA assurance fields and organization membership are explicit extension points. Synthetic local auth must be isolated and unavailable in production.

AI gateway exposes clinicalConsult, generateSoapNote, generateDifferential, analyzeMedication, retrieveClinicalEvidence, summarizePatient, extractStructuredData. Domain request and response contracts do not mention vendor SDKs. Central task-specific provider/model configuration, timeouts, bounded retries, token limits and structured validation. No silent PHI-bearing fallback to another provider. Store prompt/version and provider/model metadata with drafts; no transcript telemetry. Validate output shape and require clinician review; shape validation cannot prove medical correctness.

SOAP types: ClinicalTranscript (speaker + provided observations), BillingContext (selected codes, encounter classification, supplied times), SOAPGenerationRequest, SOAPGenerationResult. Test E&M, combined, standalone, crisis, unknown/incompatible codes, missing observations and invalid output. Persist body+metadata+generation provenance atomically; finalize with an explicit clinician action and audit/version record.

Conversation and Message are authoritative PostgreSQL records, with owned metadata, timestamps, ordered messages, status and response provenance. Retrieval enforces identity. Prefer response completion/polling first if it preserves subscription callbacks; adopt streaming only with a proven concurrency/cancellation design. Agent tools require explicit permissions and deterministic authorization.

Knowledge: Document → immutable DocumentVersion → Chunk → Embedding; citations link to owned version/chunk IDs. Validate size/MIME/magic bytes, quarantine and scan before parsing, private storage, bounded parsing jobs, owned access checks on upload/download/retrieval/delete. Embedding/vector interfaces remain replaceable; pgvector optional, not domain schema contract. Never expose arbitrary URL fetch to extraction. No redistribution of licensed DSM/reference works without licensing verification.

Usage: server checks entitlement and reserves usage atomically with idempotency key before costly work; finalize/release reservation by documented success/failure semantics. Preserve current free limits initially. Billing events use a unique Stripe event ledger and transactional processing, safe retries and no PHI in metadata. Commerce role has narrowly scoped billing writes, no global PHI access. Return destinations and prices are server controlled.
