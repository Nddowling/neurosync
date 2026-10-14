-- Additive correction to the original proposal. Apply only with a migration role.
-- Existing 0001–0003 stay immutable. Preflight existing data before any real cutover.
alter role app_rw nosuperuser nocreatedb nocreaterole noreplication nobypassrls;
revoke create on schema public from public, app_rw;
alter default privileges in schema public revoke select, insert, update, delete on tables from app_rw;

-- Routine clinical access is owner-scoped, including users with application admin roles.
-- A future clinic-sharing/break-glass policy must be explicit, not a GUC bypass.
create or replace function public.current_uid() returns text as $$
  select nullif(current_setting('app.uid', true), '');
$$ language sql stable set search_path = pg_catalog;
create or replace function public.current_is_admin() returns boolean as $$
  select false;
$$ language sql stable set search_path = pg_catalog;

do $$
declare t text;
begin
  foreach t in array array[
    'patients','patient_notes','patient_medications','patient_appointments',
    'patient_sessions','patient_goals','patient_billing','knowledge_base','user_subscriptions'
  ] loop
    execute format('alter table public.%I force row level security', t);
    execute format('alter policy %I on public.%I to app_rw using (owner_uid = public.current_uid())', t || '_select', t);
    execute format('alter policy %I on public.%I to app_rw with check (owner_uid = public.current_uid())', t || '_insert', t);
    execute format('alter policy %I on public.%I to app_rw using (owner_uid = public.current_uid()) with check (owner_uid = public.current_uid())', t || '_update', t);
    execute format('alter policy %I on public.%I to app_rw using (owner_uid = public.current_uid())', t || '_delete', t);
  end loop;
end $$;
alter table public.clinicians force row level security;
alter policy clinicians_select on public.clinicians to app_rw using (uid = public.current_uid());
alter policy clinicians_update on public.clinicians to app_rw
  using (uid = public.current_uid()) with check (uid = public.current_uid());
revoke insert, update, delete on public.clinicians from app_rw;
grant update (full_name, credentials, tos_accepted_at) on public.clinicians to app_rw;
-- Provisioning and commerce writes will have separate bounded authority.
revoke insert, update, delete on public.user_subscriptions from app_rw;

-- Foreign keys enforce tenant relationships even if the API forgets to check a parent.
alter table public.patients add constraint patients_id_owner_unique unique (id, owner_uid);
alter table public.patient_sessions add constraint sessions_id_owner_unique unique (id, owner_uid);
do $$
declare t text;
begin
  foreach t in array array[
    'patient_notes','patient_medications','patient_appointments','patient_sessions','patient_goals','patient_billing'
  ] loop
    execute format('alter table public.%I add constraint %I foreign key (patient_id, owner_uid) references public.patients(id, owner_uid) deferrable initially immediate', t, t || '_patient_owner_fk');
  end loop;
end $$;
alter table public.patient_notes add constraint notes_session_owner_fk
  foreign key (session_id, owner_uid) references public.patient_sessions(id, owner_uid)
  deferrable initially immediate;

-- Audit contains sensitive linkage. The original default grant was not append-only.
revoke all on public.audit_log from public, app_rw;
grant select on public.audit_log to app_rw;
grant insert (actor_uid, action, table_name, row_id) on public.audit_log to app_rw;
grant usage on sequence public.audit_log_id_seq to app_rw;
alter table public.audit_log enable row level security;
create policy audit_select on public.audit_log for select to app_rw
  using (actor_uid = public.current_uid());
create policy audit_read_insert on public.audit_log for insert to app_rw with check (
  public.current_uid() is not null and actor_uid = public.current_uid()
  and action = 'read' and table_name in (
    'patients','patient_notes','patient_medications','patient_appointments',
    'patient_sessions','patient_goals','patient_billing','knowledge_base'
  ) and row_id is not null
);
-- The definer's owner bypass is deliberate: write triggers append immutable events.
-- This role is never used by the API. Protect against temporary/public object shadowing.
alter function public.audit_write() set search_path = pg_catalog, public, pg_temp;
revoke all on function public.audit_write() from public, app_rw;
create trigger trg_knowledge_base_audit after insert or update or delete on public.knowledge_base
  for each row execute function public.audit_write();
