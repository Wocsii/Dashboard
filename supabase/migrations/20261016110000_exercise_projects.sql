-- Exercise projects share the existing project/task system.
create or replace function public.valid_exercise_config(config jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare metric jsonb;
begin
  if config is null then return true; end if;
  if jsonb_typeof(config) <> 'object'
    or jsonb_typeof(config->'weeklyTarget') is distinct from 'number'
    or jsonb_typeof(config->'metrics') is distinct from 'array' then return false; end if;
  if (config->>'weeklyTarget')::numeric not between 1 and 7
    or (config->>'weeklyTarget')::numeric <> trunc((config->>'weeklyTarget')::numeric)
    or jsonb_array_length(config->'metrics') > 5 then return false; end if;
  for metric in select * from jsonb_array_elements(config->'metrics') loop
    if jsonb_typeof(metric) <> 'object' or metric->>'id' is null
      or metric->>'id' not in ('weight','repetitions','minutes','intensity','distance') then return false; end if;
    if metric ? 'target' then
      if jsonb_typeof(metric->'target') <> 'number' then return false; end if;
      if (metric->>'target')::numeric < 0 then return false; end if;
      if metric->>'id' = 'intensity' and (metric->>'target')::numeric > 10 then return false; end if;
      if metric->>'id' in ('repetitions','intensity') and (metric->>'target')::numeric <> trunc((metric->>'target')::numeric) then return false; end if;
    end if;
  end loop;
  return (select count(*) = count(distinct m->>'id') from jsonb_array_elements(config->'metrics') m);
end $$;

alter table public.projects add column exercise_config jsonb;
alter table public.projects add constraint valid_exercise_config check (public.valid_exercise_config(exercise_config));

create or replace function public.valid_exercise_values(metrics jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare metric record;
begin
  if jsonb_typeof(metrics) is distinct from 'object' then return false; end if;
  for metric in select * from jsonb_each(metrics) loop
    if metric.key not in ('weight','repetitions','minutes','intensity','distance')
      or jsonb_typeof(metric.value) <> 'number' then return false; end if;
    if metric.value::text::numeric < 0 then return false; end if;
    if metric.key = 'intensity' and metric.value::text::numeric > 10 then return false; end if;
    if metric.key in ('repetitions','intensity') and metric.value::text::numeric <> trunc(metric.value::text::numeric) then return false; end if;
  end loop;
  return true;
end $$;

create table public.exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  date date not null,
  status text not null check (status in ('exercise','rest')),
  "values" jsonb not null default '{}'::jsonb check (public.valid_exercise_values("values")),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id,date),
  check (status <> 'rest' or "values" = '{}'::jsonb)
);
create index exercise_logs_user_date_idx on public.exercise_logs(user_id,date);
create trigger exercise_logs_updated_at before update on public.exercise_logs
  for each row execute function public.set_updated_at();
alter table public.exercise_logs enable row level security;
create policy "own exercise logs" on public.exercise_logs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.projects p where p.id = project_id and p.user_id = (select auth.uid()) and p.exercise_config is not null
  ));
