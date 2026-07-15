-- 0002_rls.sql — Row-Level Security: the database enforces per-clinician isolation.
--
-- Contract: the backend connects as the non-owner role `app_rw` and, at the start of
-- every request transaction, runs:  SET LOCAL app.uid = '<Identity Platform sub>';
-- (and optionally  SET LOCAL app.role = 'admin'  for admin users).
--
-- current_setting('app.uid', true) returns NULL when unset → policies fail CLOSED
-- (NULL never equals owner_uid), so a query with no identity sees zero rows. This is
-- the defense-in-depth layer: even if application code forgets a filter, the DB
-- refuses cross-clinician access.

-- Application role the API connects as (NOT the table owner → RLS applies to it).
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_rw') then
    create role app_rw login;   -- password set out-of-band via Secret Manager
  end if;
end $$;

grant usage on schema public to app_rw;
grant select, insert, update, delete on all tables in schema public to app_rw;
alter default privileges in schema public
  grant select, insert, update, delete on tables to app_rw;

-- Helper: is the current request an admin?
create or replace function current_is_admin() returns boolean as $$
  select coalesce(current_setting('app.role', true) = 'admin', false);
$$ language sql stable;

-- Helper: the current request's clinician uid (NULL when unset → fail closed).
create or replace function current_uid() returns text as $$
  select current_setting('app.uid', true);
$$ language sql stable;

-- Enable + define owner-scoped policies on every owner_uid table.
do $$
declare t text;
begin
  foreach t in array array[
    'patients','patient_notes','patient_medications','patient_appointments',
    'patient_sessions','patient_goals','patient_billing','knowledge_base','user_subscriptions'
  ] loop
    execute format('alter table %I enable row level security;', t);
    -- (owner is NOT forced-subject so migrations/admin scripts run as owner still work)

    execute format('drop policy if exists %1$s_select on %1$s;', t);
    execute format($p$create policy %1$s_select on %1$s for select
        using (owner_uid = current_uid() or current_is_admin());$p$, t);

    execute format('drop policy if exists %1$s_insert on %1$s;', t);
    execute format($p$create policy %1$s_insert on %1$s for insert
        with check (owner_uid = current_uid());$p$, t);

    execute format('drop policy if exists %1$s_update on %1$s;', t);
    execute format($p$create policy %1$s_update on %1$s for update
        using (owner_uid = current_uid() or current_is_admin())
        with check (owner_uid = current_uid() or current_is_admin());$p$, t);

    execute format('drop policy if exists %1$s_delete on %1$s;', t);
    execute format($p$create policy %1$s_delete on %1$s for delete
        using (owner_uid = current_uid() or current_is_admin());$p$, t);
  end loop;
end $$;

-- clinicians: a user sees/edits only their own profile; admins see all.
alter table clinicians enable row level security;

drop policy if exists clinicians_select on clinicians;
create policy clinicians_select on clinicians for select
  using (uid = current_uid() or current_is_admin());

drop policy if exists clinicians_insert on clinicians;
create policy clinicians_insert on clinicians for insert
  with check (uid = current_uid());

drop policy if exists clinicians_update on clinicians;
create policy clinicians_update on clinicians for update
  using (uid = current_uid() or current_is_admin())
  with check (uid = current_uid() or current_is_admin());