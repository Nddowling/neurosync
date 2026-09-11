alter table public.messages add column sequence bigint generated always as identity;
grant usage on sequence public.messages_sequence_seq to app_rw;
alter table public.patient_notes add column generation_request_id uuid;
create unique index notes_generation_request on public.patient_notes(owner_uid,generation_request_id) where generation_request_id is not null;
