begin;
create table public.petro_resets(person text not null references public.petro_people(person),training_id text not null,reset_at text not null,admin_email text not null,primary key(person,training_id));
alter table public.petro_resets enable row level security;
revoke all on public.petro_resets from anon,authenticated;
grant select,insert,update on public.petro_resets to service_role;

create or replace function public.petro_attempt_summary(p_person text) returns table(training_id text,training_revision integer,ratio numeric) language sql stable set search_path='' as $$
 select a.training_id,a.training_revision,max(a.score::numeric/a.total) from public.petro_attempts a
 where a.person=p_person and not exists(select 1 from public.petro_resets r where r.person=a.person and r.training_id in ('*',a.training_id) and a.date<=r.reset_at)
 group by a.training_id,a.training_revision;
$$;
revoke all on function public.petro_attempt_summary(text) from public,anon,authenticated;
grant execute on function public.petro_attempt_summary(text) to service_role;
commit;
