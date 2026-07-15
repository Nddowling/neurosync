-- 0003_audit.sql — HIPAA audit trail.
--
-- Writes (INSERT/UPDATE/DELETE) on PHI tables are logged here by trigger. READS are
-- logged by the API layer (Postgres cannot fire triggers on SELECT), which records a
-- 'read' row per PHI fetch. The table is append-only for the app role.

create table if not exists audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor_uid   text,                         -- current_uid() at time of action
  action      text not null,                -- insert | update | delete | read | login | export
  table_name  text,
  row_id      text,
  patient_id  uuid,
  detail      jsonb,                         -- changed columns / query shape (NEVER note bodies)
  ip          text
);
create index if not exists idx_audit_at     on audit_log (at desc);
create index if not exists idx_audit_actor  on audit_log (actor_uid, at desc);
create index if not exists idx_audit_patient on audit_log (patient_id, at desc);

-- App role may INSERT (write-triggers + read logging) and SELECT its own actions,
-- but never UPDATE/DELETE — the trail is immutable to the application.
grant insert, select on audit_log to app_rw;

-- Trigger: record every write to a PHI table. Stores column NAMES that changed, never
-- their values, so the audit trail itself carries no PHI.
create or replace function audit_write() returns trigger as $$
declare
  rid text;
  pid uuid;
  changed jsonb;
begin
  if (tg_op = 'DELETE') then
    rid := old.id::text;
    pid := case when to_jsonb(old) ? 'patient_id' then (to_jsonb(old)->>'patient_id')::uuid else null end;
    changed := null;
  else
    rid := new.id::text;
    pid := case when to_jsonb(new) ? 'patient_id' then (to_jsonb(new)->>'patient_id')::uuid else null end;
    if (tg_op = 'UPDATE') then
      select jsonb_agg(key) into changed
      from jsonb_each(to_jsonb(new))
      where to_jsonb(new)->key is distinct from to_jsonb(old)->key;
    end if;
  end if;

  insert into audit_log (actor_uid, action, table_name, row_id, patient_id, detail)
  values (current_uid(), lower(tg_op), tg_table_name, rid, pid,
          case when changed is not null then jsonb_build_object('changed', changed) else null end);

  return case when tg_op = 'DELETE' then old else new end;
end;
$$ language plpgsql security definer;

-- Attach to every PHI table.
do $$
declare t text;
begin
  foreach t in array array[
    'patients','patient_notes','patient_medications','patient_appointments',
    'patient_sessions','patient_goals','patient_billing'
  ] loop
    execute format('drop trigger if exists trg_%1$s_audit on %1$s;', t);
    execute format('create trigger trg_%1$s_audit
                    after insert or update or delete on %1$s
                    for each row execute function audit_write();', t);
  end loop;
end $$;