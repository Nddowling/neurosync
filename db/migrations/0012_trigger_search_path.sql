-- Pin the inherited timestamp trigger helper without changing historical SQL.
alter function public.set_updated_at() set search_path = pg_catalog;
