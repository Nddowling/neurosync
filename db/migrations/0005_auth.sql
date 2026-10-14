create schema auth_private;
revoke all on schema auth_private from public;
grant usage on schema auth_private to app_rw;
create table auth_private.identities (
  provider text not null, external_subject text not null, owner_uid text not null references public.clinicians(uid),
  password_hash text, enabled boolean not null default true,
  primary key(provider,external_subject)
);
create table auth_private.sessions (
  token_hash text primary key check(length(token_hash)=64),
  owner_uid text not null references public.clinicians(uid), csrf_hash text not null check(length(csrf_hash)=64),
  assurance text not null, created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(), expires_at timestamptz not null,
  revoked_at timestamptz
);
create index sessions_owner on auth_private.sessions(owner_uid);
create table auth_private.login_states (
  state_hash text primary key check(length(state_hash)=64), payload jsonb not null,
  expires_at timestamptz not null default now()+interval '5 minutes'
);
-- Bounded authentication operations, not generic cross-clinician database authority.
create function auth_private.identity_lookup(p_provider text,p_subject text)
returns table(owner_uid text,password_hash text) language sql security definer
set search_path=pg_catalog,auth_private,pg_temp as $$
 select i.owner_uid,i.password_hash from auth_private.identities i
 where i.provider=p_provider and i.external_subject=p_subject and i.enabled;
$$;
create function auth_private.session_create(p_token text,p_csrf text,p_assurance text)
returns void language plpgsql security definer set search_path=pg_catalog,auth_private,pg_temp as $$
begin
 if public.current_uid() is null then raise insufficient_privilege; end if;
 insert into auth_private.sessions(token_hash,owner_uid,csrf_hash,assurance,expires_at)
 values(p_token,public.current_uid(),p_csrf,left(p_assurance,200),now()+interval '8 hours');
 insert into public.audit_log(actor_uid,action,table_name) values(public.current_uid(),'login','sessions');
end;
$$;
create function auth_private.session_resolve(p_token text)
returns table(owner_uid text,csrf_hash text) language sql security definer
set search_path=pg_catalog,auth_private,pg_temp as $$
 update auth_private.sessions s set last_seen_at=now()
 where s.token_hash=p_token and s.revoked_at is null and s.expires_at>now()
 and s.last_seen_at>now()-interval '30 minutes'
 and exists(select 1 from auth_private.identities i where i.owner_uid=s.owner_uid and i.enabled)
 returning s.owner_uid,s.csrf_hash;
$$;
create function auth_private.session_revoke(p_token text) returns void language plpgsql security definer
set search_path=pg_catalog,auth_private,pg_temp as $$
begin
 update auth_private.sessions set revoked_at=now() where token_hash=p_token and owner_uid=public.current_uid();
 insert into public.audit_log(actor_uid,action,table_name) values(public.current_uid(),'logout','sessions');
end;
$$;
create function auth_private.state_save(p_state text,p_payload jsonb) returns void language plpgsql security definer
set search_path=pg_catalog,auth_private,pg_temp as $$
begin
 if octet_length(p_payload::text)>4096 then raise check_violation; end if;
 delete from auth_private.login_states where expires_at<now();
 insert into auth_private.login_states(state_hash,payload) values(p_state,p_payload);
end;
$$;
create function auth_private.state_consume(p_state text) returns jsonb language sql security definer
set search_path=pg_catalog,auth_private,pg_temp as $$
 delete from auth_private.login_states where state_hash=p_state and expires_at>now() returning payload;
$$;
revoke all on all tables in schema auth_private from public,app_rw;
revoke all on all functions in schema auth_private from public;
grant execute on all functions in schema auth_private to app_rw;
