alter table public.knowledge_base add constraint knowledge_id_owner_unique unique(id,owner_uid);
create table public.documents (
 id uuid primary key default gen_random_uuid(),owner_uid text not null references public.clinicians(uid),
 knowledge_id uuid not null, filename text not null,media_type text not null check(media_type='application/pdf'),
 bytes bytea not null check(octet_length(bytes)<=2097152),sha256 text not null,created_at timestamptz not null default now(),
 foreign key(knowledge_id,owner_uid) references public.knowledge_base(id,owner_uid) on delete cascade
);
create table public.knowledge_chunks (
 id uuid primary key default gen_random_uuid(),owner_uid text not null references public.clinicians(uid),
 knowledge_id uuid not null,ordinal integer not null,content text not null,
 search_vector tsvector generated always as (to_tsvector('english',content)) stored,
 foreign key(knowledge_id,owner_uid) references public.knowledge_base(id,owner_uid) on delete cascade,
 unique(knowledge_id,ordinal)
);
create index knowledge_chunks_search on public.knowledge_chunks using gin(search_vector);
create index knowledge_chunks_owner on public.knowledge_chunks(owner_uid,knowledge_id);
create index documents_owner on public.documents(owner_uid,knowledge_id);
do $$ declare t text; begin
 foreach t in array array['documents','knowledge_chunks'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('alter table public.%I force row level security',t);
 execute format('create policy owned_records on public.%I to app_rw using(owner_uid=public.current_uid()) with check(owner_uid=public.current_uid())',t);
 execute format('grant select,insert,update,delete on public.%I to app_rw',t);
 end loop;
end $$;
create function public.index_knowledge() returns trigger language plpgsql
set search_path=pg_catalog,public,pg_temp as $$
begin
 delete from public.knowledge_chunks where knowledge_id=new.id;
 insert into public.knowledge_chunks(owner_uid,knowledge_id,ordinal,content)
 select new.owner_uid,new.id,n,substring(new.content from n for 1800)
 from generate_series(1,length(new.content),1500) n;
 return new;
end $$;
create trigger index_knowledge after insert or update of content on public.knowledge_base
 for each row execute function public.index_knowledge();
create trigger documents_audit after insert or update or delete on public.documents for each row execute function public.audit_write();
alter policy audit_read_insert on public.audit_log with check (
 public.current_uid() is not null and actor_uid=public.current_uid() and action='read'
 and table_name in ('patients','patient_notes','patient_medications','patient_appointments','patient_sessions','patient_goals','patient_billing','knowledge_base','conversations','messages','note_versions','documents','knowledge_chunks') and row_id is not null
);
