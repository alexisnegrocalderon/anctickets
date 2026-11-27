-- 0011_correos.sql
-- Correos con la marca de cada productora: textos editables por evento y por
-- tipo de entrada, aviso de venta a la productora, resumen diario y avisos de
-- cambio o cancelación a los compradores.
-- NO aplicada: el dueño la ejecuta tras revisarla y probarla. Idempotente.
--
-- Principio: nada de HTML libre. La validación completa vive en el servidor
-- (server actions), pero como la RLS deja que la productora actualice su propio
-- evento directo desde el navegador, la base se defiende sola con CHECK de
-- largo y de "una sola línea" donde corresponde.
--
-- El código tolera que esta migración aún no esté aplicada: si falta una
-- columna, el correo sale con la plantilla base.

-- =========================================================
-- a) events: textos y contacto del correo
-- =========================================================
alter table public.events
  add column if not exists email_welcome text,
  add column if not exists email_access text,
  add column if not exists email_rules text,
  add column if not exists email_directions text,
  add column if not exists contact_email text,
  add column if not exists contact_instagram text,
  add column if not exists contact_whatsapp text,
  add column if not exists email_use_event_image boolean not null default true;

-- Límites de largo (los mismos que usa el servidor). char_length cuenta caracteres, no bytes.
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'events_email_welcome_len') then
    alter table public.events add constraint events_email_welcome_len
      check (email_welcome is null or char_length(email_welcome) <= 280);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_email_access_len') then
    alter table public.events add constraint events_email_access_len
      check (email_access is null or char_length(email_access) <= 600);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_email_rules_len') then
    alter table public.events add constraint events_email_rules_len
      check (email_rules is null or char_length(email_rules) <= 600);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'events_email_directions_len') then
    alter table public.events add constraint events_email_directions_len
      check (email_directions is null or char_length(email_directions) <= 400);
  end if;
  -- Correo de contacto: formato simple, <= 254, sin espacios ni saltos de línea ni caracteres de cabecera.
  if not exists (select 1 from pg_constraint where conname = 'events_contact_email_fmt') then
    alter table public.events add constraint events_contact_email_fmt
      check (contact_email is null or (
        char_length(contact_email) <= 254
        and contact_email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
      ));
  end if;
  -- Instagram: solo el usuario (el servidor normaliza @usuario y URLs a usuario).
  if not exists (select 1 from pg_constraint where conname = 'events_contact_instagram_fmt') then
    alter table public.events add constraint events_contact_instagram_fmt
      check (contact_instagram is null or contact_instagram ~ '^[A-Za-z0-9._]{1,30}$');
  end if;
  -- WhatsApp: dígitos (8 a 15) con "+" opcional al inicio.
  if not exists (select 1 from pg_constraint where conname = 'events_contact_whatsapp_fmt') then
    alter table public.events add constraint events_contact_whatsapp_fmt
      check (contact_whatsapp is null or contact_whatsapp ~ '^\+?[0-9]{8,15}$');
  end if;
end
$$;

-- =========================================================
-- b) ticket_types: mensaje por tipo de entrada
-- =========================================================
alter table public.ticket_types
  add column if not exists email_note text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'ticket_types_email_note_len') then
    alter table public.ticket_types add constraint ticket_types_email_note_len
      check (email_note is null or char_length(email_note) <= 300);
  end if;
end
$$;

-- =========================================================
-- c) profiles: preferencia de aviso de ventas
-- =========================================================
alter table public.profiles
  add column if not exists notify_sales text not null default 'each',
  add column if not exists sales_summary_on date;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_notify_sales_chk') then
    alter table public.profiles add constraint profiles_notify_sales_chk
      check (notify_sales in ('each', 'daily', 'off'));
  end if;
end
$$;

-- =========================================================
-- d) orders: reclamo del aviso de venta (evita duplicados)
-- =========================================================
-- Las productoras NO pueden modificar orders desde el cliente: no existe ninguna
-- política de UPDATE sobre orders (solo SELECT), así que producer_notified_at
-- solo lo escribe el servidor con service_role.
alter table public.orders
  add column if not exists producer_notified_at timestamptz;

-- =========================================================
-- e) guard_profiles: sales_summary_on solo lo escribe el servidor
-- =========================================================
-- Copia de la versión VIGENTE (0010: protege mp_connected, suspended_at y
-- suspended_reason; search_path fijado) y solo se agrega sales_summary_on.
-- notify_sales sí lo puede cambiar la productora (es su preferencia; el CHECK
-- limita los valores).
create or replace function public.guard_profiles()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.mp_connected := false;
    new.suspended_at := null;
    new.suspended_reason := null;
    new.sales_summary_on := null;
  else
    if new.mp_connected is distinct from old.mp_connected then
      raise exception 'mp_connected solo lo modifica el servidor';
    end if;
    if new.suspended_at is distinct from old.suspended_at
       or new.suspended_reason is distinct from old.suspended_reason then
      raise exception 'la suspensión solo la modifica el servidor';
    end if;
    if new.sales_summary_on is distinct from old.sales_summary_on then
      raise exception 'sales_summary_on solo lo modifica el servidor';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profiles on public.profiles;
create trigger guard_profiles
  before insert or update on public.profiles
  for each row execute function public.guard_profiles();

-- =========================================================
-- f) email_test_log: límite de correos de prueba (1 por minuto por usuario y evento)
-- =========================================================
create table if not exists public.email_test_log (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_test_log_lookup
  on public.email_test_log (event_id, user_id, created_at desc);

-- RLS activado SIN políticas: solo service_role (el servidor) la usa.
alter table public.email_test_log enable row level security;
revoke all on public.email_test_log from public, anon, authenticated;

-- =========================================================
-- g) event_notices: avisos de cambio o cancelación enviados a los compradores
-- =========================================================
create table if not exists public.event_notices (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  kind text not null check (kind in ('cancelled', 'changed')),
  -- Solo texto, sin enlaces: el servidor lo sanea; aquí se limita el largo.
  message text not null check (char_length(message) between 1 and 500),
  recipients integer not null default 0 check (recipients >= 0),
  sent integer not null default 0 check (sent >= 0),
  failed integer not null default 0 check (failed >= 0),
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_notices_event
  on public.event_notices (event_id, created_at desc);

alter table public.event_notices enable row level security;

-- El dueño del evento puede LEER sus avisos. Sin escritura desde el cliente.
drop policy if exists "event_notices: organizer read" on public.event_notices;
create policy "event_notices: organizer read" on public.event_notices
  for select using (
    exists (
      select 1 from public.events e
      where e.id = event_notices.event_id and e.organizer_id = auth.uid()
    )
  );

revoke all on public.event_notices from public, anon, authenticated;
grant select on public.event_notices to authenticated;

-- (Sin funciones SQL nuevas: todo el reclamo atómico se hace con UPDATE ... WHERE
--  columna IS NULL desde el servidor con service_role.)

-- =========================================================
-- h) Verificación (ejecutar a mano; cada bloque dentro de una transacción con rollback)
-- =========================================================
-- Reemplaza <ORG> (id de una productora), <EVENT> (un evento suyo) y <OTRA> (otra productora).
--
-- 1) Columnas nuevas y RLS:
--   select table_name, column_name from information_schema.columns
--    where table_schema='public' and (
--      (table_name='events' and column_name in ('email_welcome','email_access','email_rules','email_directions','contact_email','contact_instagram','contact_whatsapp','email_use_event_image'))
--      or (table_name='ticket_types' and column_name='email_note')
--      or (table_name='profiles' and column_name in ('notify_sales','sales_summary_on'))
--      or (table_name='orders' and column_name='producer_notified_at'));
--   -- esperado: 12 filas
--   select relname, relrowsecurity from pg_class
--    where oid in ('public.event_notices'::regclass, 'public.email_test_log'::regclass);
--   -- esperado: relrowsecurity = true en ambas
--   select tablename, policyname, cmd from pg_policies
--    where schemaname='public' and tablename in ('event_notices','email_test_log');
--   -- esperado: solo "event_notices: organizer read" (select); email_test_log sin políticas
--
-- 2) Los CHECK de largo y formato rechazan basura (cada uno por separado: tras el error se hace rollback):
--   begin;
--   update public.events set email_welcome = repeat('a', 281) where id = '<EVENT>';
--   -- esperado: ERROR events_email_welcome_len
--   rollback;
--   begin;
--   update public.events set contact_email = E'a@b.cl\nBcc: x@y.cl' where id = '<EVENT>';
--   -- esperado: ERROR events_contact_email_fmt
--   rollback;
--   begin;
--   update public.events set contact_instagram = 'https://evil.com' where id = '<EVENT>';
--   -- esperado: ERROR events_contact_instagram_fmt
--   rollback;
--   begin;
--   update public.events set contact_whatsapp = '12345' where id = '<EVENT>';
--   -- esperado: ERROR events_contact_whatsapp_fmt
--   rollback;
--   begin;
--   update public.ticket_types set email_note = repeat('a', 301) where event_id = '<EVENT>';
--   -- esperado: ERROR ticket_types_email_note_len
--   rollback;
--   begin;
--   update public.profiles set notify_sales = 'siempre' where id = '<ORG>';
--   -- esperado: ERROR profiles_notify_sales_chk
--   rollback;
--
-- 3) Una productora autenticada NO puede tocar sales_summary_on, pero sí su preferencia:
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"<ORG>","role":"authenticated"}', true);
--   update public.profiles set sales_summary_on = current_date where id = '<ORG>';
--   -- esperado: ERROR sales_summary_on solo lo modifica el servidor
--   rollback;
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"<ORG>","role":"authenticated"}', true);
--   update public.profiles set notify_sales = 'daily' where id = '<ORG>';
--   -- esperado: UPDATE 1
--   rollback;
--   -- (mp_connected y suspended_* siguen protegidos: ver verificación 3 de 0010)
--
-- 4) La productora no puede modificar orders ni escribir avisos / registros de prueba:
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"<ORG>","role":"authenticated"}', true);
--   update public.orders set producer_notified_at = null where event_id = '<EVENT>';
--   -- esperado: UPDATE 0 (sin política de UPDATE: no afecta filas)
--   insert into public.event_notices (event_id, kind, message, created_by) values ('<EVENT>', 'changed', 'x', '<ORG>');
--   -- esperado: ERROR permission denied for table event_notices
--   rollback;
--   begin;
--   set local role authenticated;
--   select * from public.email_test_log;
--   -- esperado: ERROR permission denied for table email_test_log
--   rollback;
--
-- 5) Solo el dueño del evento lee sus avisos (se prueba como service_role insertando uno):
--   begin;
--   insert into public.event_notices (event_id, kind, message, created_by) values ('<EVENT>', 'changed', 'prueba', '<ORG>');
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"<ORG>","role":"authenticated"}', true);
--   select count(*) from public.event_notices where event_id = '<EVENT>';   -- esperado: 1
--   select set_config('request.jwt.claims', '{"sub":"<OTRA>","role":"authenticated"}', true);
--   select count(*) from public.event_notices where event_id = '<EVENT>';   -- esperado: 0
--   rollback;
--
-- 6) El reclamo atómico de orders.producer_notified_at (como service_role): solo una de dos gana:
--   begin;
--   update public.orders set producer_notified_at = now() where id = '<ORDER>' and producer_notified_at is null;  -- UPDATE 1
--   update public.orders set producer_notified_at = now() where id = '<ORDER>' and producer_notified_at is null;  -- UPDATE 0
--   rollback;
