alter table public.patient_notes add column generation_input_hash text;
create function public.protect_final_note() returns trigger language plpgsql set search_path=pg_catalog as $$
begin
 if old.status='finalized' then raise check_violation using message='Finalized notes are immutable'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $$;
create trigger protect_final_note before update or delete on public.patient_notes for each row execute function public.protect_final_note();
