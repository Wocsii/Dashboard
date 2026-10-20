-- Recoverable task deletion, with a separate retention clock per task.
alter table public.tasks add column deleted_at timestamptz;
create index tasks_deleted_at_idx on public.tasks (deleted_at) where deleted_at is not null;

-- pg_cron runs even when nobody opens the dashboard.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
  'purge-expired-task-trash',
  '0 * * * *',
  $$delete from public.tasks where deleted_at <= now() - interval '14 days'$$
);
