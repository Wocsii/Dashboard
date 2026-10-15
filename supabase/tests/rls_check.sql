-- Comprobación manual de RLS (SQL Editor de Supabase).
-- Simula a un usuario cualquiera autenticado y verifica que no ve filas ajenas.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}';
  select 'tasks'          as tabla, count(*) as filas_visibles from public.tasks
  union all select 'projects',           count(*) from public.projects
  union all select 'notes',              count(*) from public.notes
  union all select 'focus_sessions',     count(*) from public.focus_sessions
  union all select 'google_connections', count(*) from public.google_connections
  union all select 'allowed_emails',     count(*) from public.allowed_emails;
  -- Todas deben ser 0.
rollback;
