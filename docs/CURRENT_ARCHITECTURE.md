> Updated implementation/deployment status is in [PRODUCTION_STATUS.md](PRODUCTION_STATUS.md). This document retains the original reconnaissance/target rationale; historical “planned” descriptions are superseded by the feature parity matrix.

# Current architecture

Evidence baseline: 4bdb09e. This is a code audit, not a claim about live deployment state.

React 18 / Vite 6 SPA uses React Router, TanStack Query, Tailwind and Radix components. Eleven configured pages plus OAuthConsent source (not registered in pages.config.js or App routes). App adds explicit duplicate routes for some pages. Landing is public; AuthContext reads Base44 public settings, then SDK identity; TosGate stores acceptance through auth.updateMe. Layout and pages fetch identity separately. Auth failure paths are not uniformly fail closed.

Browser → Base44 SDK / platform REST → five Deno functions and hosted agents/integrations. There is no owned running API. Patients, appointments, medications, goals, billing and note bodies go through the function named `supabase` → Supabase REST with a service-role key. The function stamps user_id on inserts and filters it on reads/writes; updates accept arbitrary data including ownership fields. Query column names are unrestricted. Error bodies and logs expose raw upstream errors.

ClinicalNote metadata, ConsultSession metadata, KnowledgeBase content and UserSubscription live in Base44 entities. No explicit entity access policies are checked in. The user extension adds role and ToS timestamp. PostgreSQL migrations describe a separate planned schema with owner_uid and clinicians; they are not connected to the running frontend/adapter. Historical docs mention Cloud Run, Terraform, Identity Platform and Vertex AI as if implemented; these are absent.

## Consultation

Consult creates, lists, gets, adds messages and subscribes to clinicalAssistant conversations. The server-hosted agent owns the history; localStorage stores only the active ID. First-message text becomes the conversation title, so metadata can contain sensitive content. PatientConsultsTab expects base44_session_id/base44_conversation_id fields, while Consult opens via metadata.session_id; no deterministic write establishing that linkage exists. Agent tools can create/update/read ConsultSession and ClinicalNote, and read KnowledgeBase. It is instructed to save only on explicit request and retrieve knowledge only for billing/CPT/custom protocols. Its model and execution behavior are hosted, not owned. MessageBubble understands tool-call status/results and source delimiters, plus copy/print exports.

Usage is counted per sent message, not per created conversation. The browser separately calls trackUsage before agent invocation; the hook falls back to local counters on failure. Direct agent/inference invocation is not transactionally gated.

## SOAP

Two independent workflows: Consult derives a transcript and selected CPT codes; SOAPNotes takes a structured form (HPI/MSE/medications/demographics/provider/patient info/duration/CPT/ICD). Prompts are embedded in pages and use claude_sonnet_4_6. Consult distinguishes E&M, combined E&M+therapy, standalone therapy, crisis and fallback. **90839 is included in standalone therapy before the crisis conditional, making the ordinary crisis branch unreachable.** Long transcripts retain first 2,000 and last 4,000 characters, explicitly dropping the middle.

Both request subjective/objective/assessment/risk_assessment/plan/ICD strings; Consult also requests CPT strings. Schemas omit required fields and no runtime output validation occurs. Prompts request full observations and time examples without strong missing-data boundaries; both claim the model is board-certified. Documentation must remain drafts for clinician review; correcting credential/fabrication wording is tracked separately.

Bodies are saved best-effort via lib/clinicalNotes to patient_notes; metadata is separately created in Base44 even if persistence fails. Reload rehydrates by supabase_note_id. Finalization updates only Base44 metadata. SOAPNotes has no usage metering; Consult meters SOAP after generation without enforcing the returned allowance. Transactional saving and authoritative finalization are required replacements.

## Knowledge, reference and commerce

KnowledgeBase lists up to 100 entries and filters locally; manual entry create/delete; parallel PDF uploads use UploadFile → ExtractDataFromUploadedFile → entity create. There is no checked-in parser, object store, vector index, document versioning or retrieval implementation. Upload UI has no size/magic validation; success toast can report success despite individual failures; deleting an entry does not delete its object. Agent-generated citations use ---SOURCES--- delimiters; MessageBubble falls back to Google Scholar search links, which can transmit user-derived search text. DSMReference and Medications use direct inference. CPT selector uses gemini_3_flash with internet context. ICD selector uses a local preset list.

getSubscription filters by email; trackUsage creates records, resets calendar-month counters, checks duplicated limits and performs a non-atomic read/update. Free = 5 consult messages and 3 SOAP notes; professional/enterprise/promo_justin unlimited. Status is not consistently enforced. Checkout has hardcoded prices/products, browser return URLs and public promo strings; can create Stripe prices during a request. Webhook verifies signatures but has no event ledger, resets counters on repeated checkout events and acknowledges processing errors with success. No billing portal/cancellation API exists in repo.
