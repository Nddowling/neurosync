# SQL and UI field reconciliation

Code-observed differences at 4bdb09e. **The deployed Supabase schema is absent.** This table is a migration design input, not permission to rename production fields. Confirm actual exports/schema without accessing PHI before data migration.

| Area | UI/legacy contract | Checked SQL | Planned resolution |
|---|---|---|---|
| Ownership | user_id; clinician_email supplied in patient forms | owner_uid FK clinicians.uid | Verified identity only; explicit old→new identity mapping |
| Patients | date_of_birth | dob | DTO translation |
| Patients | patient_code, address, emergency_contact, insurance_info | Missing | Add owned typed columns where preserved workflow needs them |
| Notes | supabase_note_id metadata linked to body; patient_info, risk_assessment in body | Missing linking/content fields; session_id UUID without FK in 0001 | Atomic owned note; add risk assessment; reconcile patient linkage and imported IDs |
| Notes | created_date in entity list | created_at | Compatibility DTO |
| Sessions | base44_session_id, base44_conversation_id, session_date expectations | conversation_id, started_at, UUID id | Native conversation/session relation; preserve import IDs separately |
| Medications | prescribing_provider, start_date, status | started_on, stopped_on; no provider/status | Explicit date mapping and additive domain fields |
| Appointments | appointment_date, appointment_time, duration_minutes, location; cancelled | scheduled_at; canceled | Clinician timezone policy plus DTO; preserve duration/location |
| Goals | title, description, domain; achieved | goal; met | Explicit status/field mapping and missing content columns |
| Billing | service_date, description, fee, insurance_billed/paid, patient_responsibility, notes; pending/denied/partial | amount_cents; draft/submitted/paid/void | Decimal-to-cents rules, separate amounts/statuses; preserve original semantics |
| Subscription | entity id, user_email, user_id | owner_uid PK | Stable subject account mapping; dedicated commerce access |
| Knowledge | entity id/created_date, external file_url | UUID id/created_at, file_url | Document/version/object ownership; compatibility timestamps |

The first patient repository intentionally exposes only canonical 0001 fields; it is not a replacement for all current patient UI fields. Feature parity stays incomplete until this reconciliation is implemented and exercised through the facade/UI. No silent field dropping.
