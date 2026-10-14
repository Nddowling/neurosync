alter table public.knowledge_chunks add column embedding double precision[],add column embedding_model text;
create table public.document_versions (
 id uuid primary key default gen_random_uuid(),owner_uid text not null references public.clinicians(uid),knowledge_id uuid not null,
 title text not null,content text not null,created_at timestamptz not null default now(),
 foreign key(knowledge_id,owner_uid) references public.knowledge_base(id,owner_uid) on delete cascade
);
alter table public.document_versions enable row level security;
alter table public.document_versions force row level security;
create policy version_owner on public.document_versions to app_rw using(owner_uid=public.current_uid()) with check(owner_uid=public.current_uid());
grant select,insert on public.document_versions to app_rw;
create index document_versions_owner on public.document_versions(owner_uid,knowledge_id,created_at);
create function public.version_knowledge() returns trigger language plpgsql set search_path=pg_catalog,public,pg_temp as $$
begin
 insert into public.document_versions(owner_uid,knowledge_id,title,content) values(new.owner_uid,new.id,new.title,new.content);
 return new;
end $$;
create trigger version_knowledge after insert or update of title,content on public.knowledge_base for each row execute function public.version_knowledge();
