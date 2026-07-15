-- 0001_schema.sql — NeuroSync core schema (Cloud SQL / PostgreSQL 15+)
--
-- ALL PHI lives in this database. Tenant isolation is enforced by Row-Level
-- Security (see 0002_rls.sql), keyed on the authenticated clinician's Identity
-- Platform uid, which the backend surfaces per-transaction via `SET LOCAL app.uid`.
--
-- Run as the migration/owner role. The application connects as a NON-owner role
-- (app_rw, created below) so RLS is actually enforced against it.

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- Bump updated_at on write.
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

-- ── clinician profile (auth itself is external — Identity Platform) ───────────
create table if not exists clinicians (
  uid             text primary key,              -- Identity Platform subject (JWT `sub`)
  email           text not null,
  full_name       text,
  credentials     text,                          -- "MD", "PMHNP-BC", …
  role            text not null default 'user' check (role in ('user','admin')),
  tos_accepted_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ── patients (PHI) ───────────────────────────────────────────────────────────
create table if not exists patients (
  id          uuid primary key default gen_random_uuid(),
  owner_uid   text not null references clinicians(uid) on delete restrict,
  mrn         text,                              -- clinician's own medical record #
  first_name  text,
  last_name   text,
  dob         date,
  sex         text,
  email       text,
  phone       text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_patients_owner on patients (owner_uid);

-- ── clinical notes / SOAP (PHI) ──────────────────────────────────────────────
create table if not exists patient_notes (
  id               uuid primary key default gen_random_uuid(),
  owner_uid        text not null references clinicians(uid) on delete restrict,
  patient_id       uuid references patients(id) on delete cascade,
  session_id       uuid,                          -- optional link to patient_sessions
  note_type        text not null default 'soap'
                     check (note_type in ('soap','progress','intake','discharge','medication_change')),
  status           text not null default 'draft' check (status in ('draft','finalized','amended')),
  subjective       text,
  objective        text,
  assessment       text,
  plan             text,
  body             text,                          -- free-form / non-SOAP note bodies
  icd_codes        text,                          -- billing reference (codes, not identifiers)
  cpt_code         text,
  session_duration text,
  provider_name    text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_notes_owner   on patient_notes (owner_uid);
create index if not exists idx_notes_patient on patient_notes (patient_id);

-- ── medications (PHI) ────────────────────────────────────────────────────────
create table if not exists patient_medications (
  id          uuid primary key default gen_random_uuid(),
  owner_uid   text not null references clinicians(uid) on delete restrict,
  patient_id  uuid references patients(id) on delete cascade,
  name        text not null,
  dose        text,
  frequency   text,
  started_on  date,
  stopped_on  date,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_meds_owner   on patient_medications (owner_uid);
create index if not exists idx_meds_patient on patient_medications (patient_id);

-- ── appointments (PHI) ───────────────────────────────────────────────────────
create table if not exists patient_appointments (
  id           uuid primary key default gen_random_uuid(),
  owner_uid    text not null references clinicians(uid) on delete restrict,
  patient_id   uuid references patients(id) on delete cascade,
  scheduled_at timestamptz,
  type         text,
  status       text not null default 'scheduled'
                 check (status in ('scheduled','completed','canceled','no_show')),
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_appts_owner   on patient_appointments (owner_uid);
create index if not exists idx_appts_patient on patient_appointments (patient_id);

-- ── consult sessions (PHI) ───────────────────────────────────────────────────
create table if not exists patient_sessions (
  id            uuid primary key default gen_random_uuid(),
  owner_uid     text not null references clinicians(uid) on delete restrict,
  patient_id    uuid references patients(id) on delete set null,
  title         text,
  session_type  text check (session_type in
                  ('initial_evaluation','follow_up','crisis','medication_management','therapy_session')),
  status        text not null default 'active' check (status in ('active','completed','archived')),
  conversation_id text,                           -- links to the AI conversation
  summary       text,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_sessions_owner   on patient_sessions (owner_uid);
create index if not exists idx_sessions_patient on patient_sessions (patient_id);

-- ── treatment goals (PHI) ────────────────────────────────────────────────────
create table if not exists patient_goals (
  id          uuid primary key default gen_random_uuid(),
  owner_uid   text not null references clinicians(uid) on delete restrict,
  patient_id  uuid references patients(id) on delete cascade,
  goal        text not null,
  target_date date,
  status      text not null default 'active' check (status in ('active','met','discontinued')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_goals_owner   on patient_goals (owner_uid);
create index if not exists idx_goals_patient on patient_goals (patient_id);

-- ── billing (codes + Stripe linkage ONLY — never clinical PHI in Stripe) ──────
create table if not exists patient_billing (
  id                        uuid primary key default gen_random_uuid(),
  owner_uid                 text not null references clinicians(uid) on delete restrict,
  patient_id                uuid references patients(id) on delete set null,
  cpt_code                  text,
  icd_codes                 text,
  amount_cents              integer,
  status                    text not null default 'draft'
                              check (status in ('draft','submitted','paid','void')),
  stripe_payment_intent_id  text,                 -- linkage only; no PHI sent to Stripe
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);
create index if not exists idx_billing_owner   on patient_billing (owner_uid);
create index if not exists idx_billing_patient on patient_billing (patient_id);

-- ── knowledge base (per-clinician reference: CPT, protocols, uploads) ─────────
create table if not exists knowledge_base (
  id         uuid primary key default gen_random_uuid(),
  owner_uid  text not null references clinicians(uid) on delete restrict,
  title      text not null,
  content    text not null,
  category   text not null default 'other'
               check (category in ('cpt_codes','clinical_reference','protocol','medication','billing','other')),
  tags       text,
  source     text,
  file_url   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_kb_owner on knowledge_base (owner_uid);

-- ── subscription / usage (billing plan, not PHI) ─────────────────────────────
create table if not exists user_subscriptions (
  owner_uid              text primary key references clinicians(uid) on delete cascade,
  plan                   text not null default 'free'
                           check (plan in ('free','professional','enterprise','promo_justin')),
  status                 text not null default 'active' check (status in ('active','canceled','past_due')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  consults_used          integer not null default 0,
  soap_notes_used        integer not null default 0,
  period_start           date,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array[
    'clinicians','patients','patient_notes','patient_medications','patient_appointments',
    'patient_sessions','patient_goals','patient_billing','knowledge_base','user_subscriptions'
  ] loop
    execute format('drop trigger if exists trg_%1$s_updated_at on %1$s;', t);
    execute format('create trigger trg_%1$s_updated_at before update on %1$s
                    for each row execute function set_updated_at();', t);
  end loop;
end $$;