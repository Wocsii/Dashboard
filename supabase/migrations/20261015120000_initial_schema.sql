-- ════════════════════════════════════════════════════════════════
--  Mi espacio · esquema inicial
--  Todas las tablas de usuario llevan user_id + RLS (user_id = auth.uid()).
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── Tipos ───────────────────────────────────────────────────────
create type public.task_status     as enum ('todo', 'in_progress', 'blocked', 'done');
create type public.task_priority   as enum ('low', 'medium', 'high', 'urgent');
create type public.project_status  as enum ('active', 'paused', 'completed');
create type public.focus_kind      as enum ('focus', 'short_break', 'long_break');
create type public.google_conn_status as enum ('ok', 'needs_reauth');

-- ── Utilidad: updated_at automático ─────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ── Lista blanca de acceso (app personal) ───────────────────────
-- Solo los emails de esta tabla pueden crear cuenta. Sin políticas RLS:
-- el cliente no puede leerla ni modificarla. Se gestiona desde el SQL Editor.
create table public.allowed_emails (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.allowed_emails enable row level security;

-- ── Perfil y ajustes ────────────────────────────────────────────
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  timezone     text not null default 'Europe/Madrid',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.user_settings (
  user_id                 uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  focus_minutes           int  not null default 25 check (focus_minutes between 1 and 180),
  short_break_minutes     int  not null default 5  check (short_break_minutes between 1 and 60),
  long_break_minutes      int  not null default 15 check (long_break_minutes between 1 and 90),
  long_break_every        int  not null default 4  check (long_break_every between 2 and 12),
  log_focus_sessions      boolean not null default true,
  week_starts_on          int  not null default 1 check (week_starts_on between 0 and 6),
  visible_calendar_ids    text[],              -- null = usar la selección de Google
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ── Proyectos ───────────────────────────────────────────────────
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name        text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  color       text not null default 'sun',
  status      public.project_status not null default 'active',
  start_date  date,
  due_date    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index projects_user_idx on public.projects (user_id, status);

-- ── Tareas (también son las tarjetas del Kanban) ────────────────
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade default auth.uid(),
  project_id   uuid references public.projects (id) on delete set null,
  title        text not null check (char_length(title) between 1 and 300),
  description  text not null default '',
  status       public.task_status   not null default 'todo',
  priority     public.task_priority not null default 'medium',
  due_date     date,
  tags         text[] not null default '{}',
  position     double precision not null default 0,  -- orden dentro de la columna Kanban
  is_focus     boolean not null default false,        -- "tarea prioritaria" del día
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index tasks_user_status_idx on public.tasks (user_id, status, position);
create index tasks_user_due_idx    on public.tasks (user_id, due_date);
create index tasks_project_idx     on public.tasks (project_id);

-- completed_at se mantiene coherente con status
create or replace function public.sync_task_completed_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.completed_at = coalesce(new.completed_at, now());
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end $$;

-- ── Notas ───────────────────────────────────────────────────────
create table public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title      text not null default '',
  content    text not null default '',
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_user_idx on public.notes (user_id, pinned desc, updated_at desc);

-- ── Sesiones de concentración ───────────────────────────────────
create table public.focus_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade default auth.uid(),
  task_id          uuid references public.tasks (id) on delete set null,
  kind             public.focus_kind not null default 'focus',
  started_at       timestamptz not null,
  ended_at         timestamptz not null,
  duration_seconds int not null check (duration_seconds >= 0),
  completed        boolean not null default true,
  created_at       timestamptz not null default now()
);
create index focus_sessions_user_idx on public.focus_sessions (user_id, started_at desc);

-- ── Conexión con Google Calendar (solo servidor) ────────────────
-- RLS activado y SIN políticas: el navegador no puede leer los tokens.
-- Solo las funciones /api (con la clave secreta) acceden a esta tabla.
create table public.google_connections (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  google_email            text,
  refresh_token_encrypted text not null,
  access_token_encrypted  text,
  access_token_expires_at timestamptz,
  scopes                  text[] not null default '{}',
  status                  public.google_conn_status not null default 'ok',
  connected_at            timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ── Triggers updated_at ─────────────────────────────────────────
create trigger profiles_updated_at      before update on public.profiles      for each row execute function public.set_updated_at();
create trigger user_settings_updated_at before update on public.user_settings for each row execute function public.set_updated_at();
create trigger projects_updated_at      before update on public.projects      for each row execute function public.set_updated_at();
create trigger tasks_updated_at         before update on public.tasks         for each row execute function public.set_updated_at();
create trigger notes_updated_at         before update on public.notes         for each row execute function public.set_updated_at();
create trigger google_conn_updated_at   before update on public.google_connections for each row execute function public.set_updated_at();
create trigger tasks_completed_at       before insert or update of status on public.tasks for each row execute function public.sync_task_completed_at();

-- ── Alta de usuarios: lista blanca + perfil + ajustes ───────────
create or replace function public.enforce_allowed_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.allowed_emails where email = lower(new.email)) then
    raise exception 'Este email no tiene acceso a la aplicación';
  end if;
  return new;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  insert into public.user_settings (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_before_insert before insert on auth.users
  for each row execute function public.enforce_allowed_email();
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Row Level Security ──────────────────────────────────────────
alter table public.profiles           enable row level security;
alter table public.user_settings      enable row level security;
alter table public.projects           enable row level security;
alter table public.tasks              enable row level security;
alter table public.notes              enable row level security;
alter table public.focus_sessions     enable row level security;
alter table public.google_connections enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own settings" on public.user_settings
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own projects" on public.projects
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own tasks" on public.tasks
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own notes" on public.notes
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "own focus sessions" on public.focus_sessions
  for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Un proyecto ajeno no puede asignarse a una tarea propia
create or replace function public.check_task_project_owner()
returns trigger language plpgsql security invoker as $$
begin
  if new.project_id is not null and not exists (
    select 1 from public.projects p where p.id = new.project_id and p.user_id = new.user_id
  ) then
    raise exception 'Proyecto no válido';
  end if;
  return new;
end $$;
create trigger tasks_project_owner before insert or update of project_id on public.tasks
  for each row execute function public.check_task_project_owner();
