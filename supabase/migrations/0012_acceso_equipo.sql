-- 0012_acceso_equipo.sql
-- Acceso alternativo del administrador (/acceso-equipo): correo + clave + código
-- de 6 dígitos. Esta migración:
--   a) bloquea en la base el alta de cuentas nuevas por correo y clave
--      (solo Google crea cuentas);
--   b) crea la tabla del limitador de intentos (solo hashes, sin políticas).
-- NO aplicada: el dueño la ejecuta tras revisarla y probarla. Idempotente.

-- =========================================================
-- a) Bloqueo de altas por correo y clave en auth.users
-- =========================================================
-- GoTrue inserta usuarios nuevos con raw_app_meta_data = {"provider": "<proveedor>", ...}.
-- Los usuarios de Google entran con provider = 'google' y NO se tocan. Solo se
-- rechaza provider = 'email' (registro con correo y clave, invitaciones y
-- "Add user" del panel de Supabase). Filas insertadas sin provider (p. ej. las
-- de nuestras pruebas) también pasan.
-- Condición de la que depende: que GoTrue inserte a los usuarios de Google con
-- provider 'google'. Si algún día no lo hiciera, el ingreso con Google seguiría
-- funcionando (el trigger solo rechaza 'email'). Poner clave a una cuenta YA
-- existente es un UPDATE y no pasa por este trigger.
create or replace function public.block_email_signup()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'provider', '') = 'email' then
    raise exception 'EMAIL_SIGNUP_DISABLED';
  end if;
  return new;
end;
$$;

revoke all on function public.block_email_signup() from public, anon, authenticated;

drop trigger if exists block_email_signup on auth.users;
create trigger block_email_signup
  before insert on auth.users
  for each row execute function public.block_email_signup();

-- =========================================================
-- b) Intentos de ingreso con clave (limitador)
-- =========================================================
-- Solo hashes (sha256 con sal): ni el correo ni la IP se guardan en claro.
-- RLS activado SIN políticas y sin permisos para anon/authenticated: solo el
-- servidor (service_role) la lee y escribe.
create table if not exists public.admin_login_attempts (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  ip_hash text not null,
  ok boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_login_attempts_email
  on public.admin_login_attempts (email_hash, created_at);
create index if not exists idx_admin_login_attempts_ip
  on public.admin_login_attempts (ip_hash, created_at);

alter table public.admin_login_attempts enable row level security;
revoke all on public.admin_login_attempts from public, anon, authenticated;

-- =========================================================
-- c) Consultas de verificación (NO se ejecutan solas; correr una a una)
-- =========================================================
-- Cada bloque termina en rollback: no deja nada en la base.
--
-- 1) Alta por correo y clave: debe fallar con EMAIL_SIGNUP_DISABLED
--    begin;
--      insert into auth.users (id, email, raw_app_meta_data)
--      values (gen_random_uuid(), 'bloqueado@test.cl', '{"provider":"email"}'::jsonb);
--    rollback;
--
-- 2) Alta de Google: debe funcionar
--    begin;
--      insert into auth.users (id, email, raw_app_meta_data)
--      values (gen_random_uuid(), 'google@test.cl', '{"provider":"google","providers":["google"]}'::jsonb);
--    rollback;
--
-- 3) Alta sin provider: debe funcionar
--    begin;
--      insert into auth.users (id, email) values (gen_random_uuid(), 'sinprovider@test.cl');
--    rollback;
--
-- 4) La tabla de intentos no es legible por anon ni authenticated: debe dar
--    "permission denied for table admin_login_attempts" en ambos
--    begin;
--      set local role anon;
--      select count(*) from public.admin_login_attempts;
--    rollback;
--    begin;
--      set local role authenticated;
--      select count(*) from public.admin_login_attempts;
--    rollback;
--
-- 5) Estado: debe devolver rls = true y 0 políticas
--    select c.relrowsecurity as rls,
--           (select count(*) from pg_policies p
--             where p.schemaname = 'public' and p.tablename = 'admin_login_attempts') as politicas
--      from pg_class c
--     where c.oid = 'public.admin_login_attempts'::regclass;
