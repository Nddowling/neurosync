-- Retain original columns; additive fields plus explicit DTO mapping preserve the UI.
alter table public.patients add column patient_code text, add column address text,
 add column emergency_contact text, add column insurance_info text,
 add column ec_name text, add column ec_relationship text, add column ec_phone text,
 add column insurance_carrier text, add column insurance_plan text, add column insurance_member_id text, add column insurance_group text;
alter table public.patient_notes add column risk_assessment text, add column patient_info text,
 add column prompt_version text, add column ai_provider text, add column ai_model text;
alter table public.patient_medications add column prescribing_provider text,
 add column status text not null default 'active' check(status in ('active','discontinued','completed','inactive'));
alter table public.patient_appointments add column appointment_date date, add column appointment_time time,
 add column timezone text not null default 'America/New_York', add column duration_minutes integer check(duration_minutes between 1 and 1440), add column location text;
alter table public.patient_goals add column description text, add column domain text;
alter table public.patient_billing add column service_date date, add column description text, add column notes text,
 add column insurance_billed_cents integer check(insurance_billed_cents>=0),
 add column insurance_paid_cents integer check(insurance_paid_cents>=0),
 add column patient_responsibility_cents integer check(patient_responsibility_cents>=0);
alter table public.patient_billing drop constraint patient_billing_status_check;
alter table public.patient_billing add constraint patient_billing_status_check check(status in ('draft','pending','submitted','paid','void','denied','partial'));

create table public.conversations (
 id uuid primary key default gen_random_uuid(), owner_uid text not null references public.clinicians(uid),
 session_id uuid not null, name text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,owner_uid), foreign key(session_id,owner_uid) references public.patient_sessions(id,owner_uid)
);
create table public.messages (
 id uuid primary key default gen_random_uuid(), owner_uid text not null references public.clinicians(uid),
 conversation_id uuid not null, role text not null check(role in ('user','assistant')),
 content text not null, request_id uuid not null, status text not null default 'complete' check(status in ('pending','complete','failed')),
 prompt_version text, provider text, model text, created_at timestamptz not null default now(),
 foreign key(conversation_id,owner_uid) references public.conversations(id,owner_uid) on delete cascade,
 unique(conversation_id,request_id,role)
);
create index messages_conversation on public.messages(conversation_id,created_at,id);
create index conversations_owner on public.conversations(owner_uid,created_at);
create table public.usage_events (
 id uuid primary key default gen_random_uuid(), owner_uid text not null references public.clinicians(uid),
 request_id uuid not null, action text not null check(action in ('consult','soap_note')),
 status text not null default 'reserved' check(status in ('reserved','complete','released')),
 created_at timestamptz not null default now(), unique(owner_uid,request_id,action)
);
create index usage_period on public.usage_events(owner_uid,created_at);
create table public.note_versions (
 id uuid primary key default gen_random_uuid(), owner_uid text not null references public.clinicians(uid),
 note_id uuid not null, body jsonb not null, created_at timestamptz not null default now()
);
alter table public.patient_notes add constraint notes_id_owner_unique unique(id,owner_uid);
alter table public.note_versions add constraint note_version_owner_fk foreign key(note_id,owner_uid) references public.patient_notes(id,owner_uid);
do $$ declare t text; begin
 foreach t in array array['conversations','messages','usage_events','note_versions'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('alter table public.%I force row level security',t);
 execute format('create policy owned_records on public.%I to app_rw using(owner_uid=public.current_uid()) with check(owner_uid=public.current_uid())',t);
 execute format('grant select,insert,update,delete on public.%I to app_rw',t);
 end loop;
end $$;
revoke update,delete on public.note_versions from app_rw;
create trigger conversations_updated before update on public.conversations for each row execute function public.set_updated_at();
create trigger conversations_audit after insert or update or delete on public.conversations for each row execute function public.audit_write();
create trigger messages_audit after insert or update or delete on public.messages for each row execute function public.audit_write();
alter policy audit_read_insert on public.audit_log with check (
 public.current_uid() is not null and actor_uid=public.current_uid() and action='read'
 and table_name in ('patients','patient_notes','patient_medications','patient_appointments','patient_sessions','patient_goals','patient_billing','knowledge_base','conversations','messages','note_versions') and row_id is not null
);
