-- Dedicated tables avoid collisions with other applications in this project.
begin;
create table public.petro_people(person text primary key, doc_type text not null, name text not null, created_at text not null, updated_at text not null);
create table public.petro_trainings(id text primary key,title text not null,description text not null,videos text not null,questions text not null,published integer not null default 0,starts_at text,ends_at text,revision integer not null default 1,updated_at text not null);
create table public.petro_attempts(id text primary key,person text not null,name text not null,score integer not null,total integer not null check(total>0),version integer not null,date text not null,consent integer not null default 0,answers text not null,training_id text not null,training_revision integer not null,snapshot text);
create index on public.petro_attempts(person,date desc);
create index on public.petro_attempts(training_id,date desc);
create table public.petro_roster_imports(id text primary key,source text not null,payload_hash text not null,stats text not null,created_at text not null);
create table public.petro_lookup_limits(key text primary key,count integer not null,bucket bigint not null);
alter table public.petro_people enable row level security;
alter table public.petro_trainings enable row level security;
alter table public.petro_attempts enable row level security;
alter table public.petro_roster_imports enable row level security;
alter table public.petro_lookup_limits enable row level security;
revoke all on public.petro_people,public.petro_trainings,public.petro_attempts,public.petro_roster_imports,public.petro_lookup_limits from anon,authenticated;
grant select,insert,update,delete on public.petro_people,public.petro_trainings,public.petro_attempts,public.petro_roster_imports,public.petro_lookup_limits to service_role;

create function public.petro_rate_limit(p_key text,p_bucket bigint) returns integer language plpgsql set search_path='' as $$
declare n integer;
begin
 delete from public.petro_lookup_limits where bucket<p_bucket-2;
 insert into public.petro_lookup_limits as l(key,count,bucket) values(p_key,1,p_bucket) on conflict(key) do update set count=l.count+1 returning count into n;
 return n;
end $$;

create function public.petro_attempt_summary(p_person text) returns table(training_id text,training_revision integer,ratio numeric) language sql stable set search_path='' as $$
 select a.training_id,a.training_revision,max(a.score::numeric/a.total) from public.petro_attempts a where person=p_person group by a.training_id,a.training_revision;
$$;

create function public.petro_save_training(p_expected integer,p_training jsonb) returns boolean language plpgsql set search_path='' as $$
declare n integer;
begin
 insert into public.petro_trainings as t(id,title,description,videos,questions,published,starts_at,ends_at,revision,updated_at)
 values(p_training->>'id',p_training->>'title',p_training->>'description',p_training->>'videos',p_training->>'questions',(p_training->>'published')::integer,p_training->>'starts_at',p_training->>'ends_at',(p_training->>'revision')::integer,p_training->>'updated_at')
 on conflict(id) do update set title=excluded.title,description=excluded.description,videos=excluded.videos,questions=excluded.questions,published=excluded.published,starts_at=excluded.starts_at,ends_at=excluded.ends_at,revision=excluded.revision,updated_at=excluded.updated_at where t.revision=p_expected;
 get diagnostics n=row_count;
 return n=1;
end $$;

create function public.petro_import_roster(p_id text,p_source text,p_hash text,p_stats jsonb,p_people jsonb) returns jsonb language plpgsql set search_path='' as $$
declare old public.petro_roster_imports%rowtype; n bigint; result jsonb; now_text text;
begin
 perform pg_catalog.pg_advisory_xact_lock(728194102);
 select * into old from public.petro_roster_imports where id=p_id;
 if found then
  if old.payload_hash<>p_hash then raise exception 'Import identifier conflict';end if;
  return old.stats::jsonb||jsonb_build_object('replayed',true);
 end if;
 select count(*) into n from public.petro_attempts;
 now_text=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
 insert into public.petro_people as p(person,doc_type,name,created_at,updated_at)
 select x->>'person',x->>'doc_type',x->>'name',now_text,now_text from jsonb_array_elements(p_people) x
 on conflict(person) do update set name=excluded.name,doc_type=excluded.doc_type,updated_at=excluded.updated_at where p.name<>excluded.name or p.doc_type<>excluded.doc_type;
 result=p_stats||jsonb_build_object('attemptsPreserved',true,'attemptsCount',n);
 insert into public.petro_roster_imports values(p_id,p_source,p_hash,result::text,now_text);
 return result;
end $$;

revoke all on function public.petro_rate_limit(text,bigint),public.petro_attempt_summary(text),public.petro_save_training(integer,jsonb),public.petro_import_roster(text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.petro_rate_limit(text,bigint),public.petro_attempt_summary(text),public.petro_save_training(integer,jsonb),public.petro_import_roster(text,text,text,jsonb,jsonb) to service_role;
commit;
