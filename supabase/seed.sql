-- Ejecuta esto UNA vez en el SQL Editor de Supabase. Solo estos emails de Google
-- pueden iniciar sesión (cada persona ve únicamente sus propios datos).
insert into public.allowed_emails (email) values
  ('pepayehila@gmail.com'),
  ('samotegea@gmail.com')
on conflict do nothing;
