-- Credenciales de iCloud solo para el servidor. Ningún cliente puede leerlas.
create table public.apple_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  apple_email text not null,
  password_encrypted text not null,
  status text not null default 'ok' check (status in ('ok', 'needs_reauth')),
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.apple_connections enable row level security;
revoke all on public.apple_connections from public, anon, authenticated;
grant all on public.apple_connections to service_role;
create trigger apple_conn_updated_at before update on public.apple_connections
  for each row execute function public.set_updated_at();
alter table public.user_settings add column visible_apple_calendar_ids text[] default null;
