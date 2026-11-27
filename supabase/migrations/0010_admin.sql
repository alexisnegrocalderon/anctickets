-- 0010_admin.sql
-- Panel de administración de ANC (/admin): suspensión de productoras, auditoría,
-- estado del sistema y funciones de lectura solo para el servidor.
-- NO aplicada: el dueño la ejecuta tras revisarla y probarla. Idempotente.
--
-- Principio: nada de esto es visible ni ejecutable por anon / authenticated.
-- Las tablas nuevas tienen RLS activado SIN políticas y las funciones son
-- SECURITY DEFINER con GRANT solo a service_role (el servidor de Next.js).

-- =========================================================
-- a) Suspensión de productoras
-- =========================================================
alter table public.profiles
  add column if not exists suspended_at timestamptz,
  add column if not exists suspended_reason text;

-- =========================================================
-- b) guard_profiles: una productora no puede (re)activarse sola
-- =========================================================
-- Copia de la versión de 0007 (con el search_path que 0008 le fijó) más:
-- un usuario no privilegiado NO puede cambiar suspended_at ni suspended_reason.
-- Sin esto, la política RLS "profiles: update own" dejaría que una productora
-- suspendida se reactive sola con un UPDATE sobre su propio perfil.
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
  else
    if new.mp_connected is distinct from old.mp_connected then
      raise exception 'mp_connected solo lo modifica el servidor';
    end if;
    if new.suspended_at is distinct from old.suspended_at
       or new.suspended_reason is distinct from old.suspended_reason then
      raise exception 'la suspensión solo la modifica el servidor';
    end if;
  end if;
  return new;
end;
$$;

-- El trigger ya existe desde 0007; se recrea igual para que 0010 sea autosuficiente.
drop trigger if exists guard_profiles on public.profiles;
create trigger guard_profiles
  before insert or update on public.profiles
  for each row execute function public.guard_profiles();

-- =========================================================
-- c) create_pending_order: rechaza ventas de una productora suspendida
-- =========================================================
-- Copia EXACTA de la versión de 0009 (misma firma y comportamiento). Único
-- cambio: tras validar p_kind, si el organizador del evento tiene suspended_at
-- no nulo se lanza ORGANIZER_SUSPENDED (aplica a 'sale', 'free' y 'courtesy').
-- Las entradas ya emitidas siguen siendo válidas y escaneables: la suspensión
-- solo impide nuevas ventas, entradas gratis y cortesías.
create or replace function public.create_pending_order(
  p_buyer_id uuid,
  p_event_id uuid,
  p_buyer_email text,
  p_items jsonb,       -- [{ticket_type_id, quantity, unit_base_price, unit_discount}]
  p_discount_code_id uuid,
  p_ambassador_id uuid,
  p_amounts jsonb,     -- {total, service_fee, mp_fee, anc_fee, discount}
  p_kind text,
  p_ttl_minutes integer default 20,
  p_holder_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_order_id uuid;
  v_ticket_type uuid;
  v_qty integer;
  v_seen uuid[] := '{}';
begin
  perform public.expire_stale_orders();

  if p_kind not in ('sale', 'free', 'courtesy') then
    raise exception 'INVALID_KIND';
  end if;

  -- Productora suspendida: no se crean órdenes nuevas de ningún tipo.
  if exists (
    select 1
    from public.events e
    join public.profiles p on p.id = e.organizer_id
    where e.id = p_event_id
      and p.suspended_at is not null
  ) then
    raise exception 'ORGANIZER_SUSPENDED';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ORDER';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_ticket_type := (v_item ->> 'ticket_type_id')::uuid;
    v_qty := (v_item ->> 'quantity')::integer;

    if v_qty is null or v_qty <= 0 then
      raise exception 'INVALID_QUANTITY';
    end if;
    if v_ticket_type = any (v_seen) then
      raise exception 'DUPLICATE_ITEM:%', v_ticket_type;
    end if;
    v_seen := v_seen || v_ticket_type;

    -- Ventas y entradas gratis respetan pausa y ventana (apertura inclusiva,
    -- cierre exacto: desde sales_end ya no se vende). Las cortesías las emite
    -- el productor: ignoran pausa y ventana, pero respetan el cupo.
    update public.ticket_types
    set reserved_count = reserved_count + v_qty, updated_at = now()
    where id = v_ticket_type
      and event_id = p_event_id
      and sold_count + reserved_count + v_qty <= quantity
      and (
        p_kind = 'courtesy'
        or (
          not paused
          and (sales_start is null or sales_start <= now())
          and (sales_end is null or sales_end > now())
        )
      );

    if not found then
      -- Distingue "sin cupo" de "fuera de ventana o pausada".
      if exists (
        select 1 from public.ticket_types
        where id = v_ticket_type
          and event_id = p_event_id
          and sold_count + reserved_count + v_qty <= quantity
      ) then
        raise exception 'NOT_ON_SALE:%', v_ticket_type;
      end if;
      raise exception 'SOLD_OUT:%', v_ticket_type;
    end if;
  end loop;

  if p_discount_code_id is not null then
    update public.discount_codes
    set used_count = used_count + 1
    where id = p_discount_code_id
      and event_id = p_event_id
      and active
      and (max_uses is null or used_count < max_uses);

    if not found then
      raise exception 'CODE_EXHAUSTED';
    end if;
  end if;

  insert into public.orders (
    buyer_id, event_id, total_amount, service_fee_amount, mp_fee_amount, anc_fee_amount,
    discount_amount, discount_code_id, discount_use_held, ambassador_id,
    status, buyer_email, kind, holder_name, reserved_until
  ) values (
    p_buyer_id, p_event_id,
    coalesce((p_amounts ->> 'total')::numeric, 0),
    coalesce((p_amounts ->> 'service_fee')::numeric, 0),
    coalesce((p_amounts ->> 'mp_fee')::numeric, 0),
    coalesce((p_amounts ->> 'anc_fee')::numeric, 0),
    coalesce((p_amounts ->> 'discount')::integer, 0),
    p_discount_code_id, p_discount_code_id is not null, p_ambassador_id,
    'pending', p_buyer_email, p_kind, p_holder_name,
    now() + make_interval(mins => greatest(coalesce(p_ttl_minutes, 20), 1))
  ) returning id into v_order_id;

  insert into public.order_items (order_id, ticket_type_id, quantity, unit_base_price, unit_discount)
  select v_order_id,
         (e ->> 'ticket_type_id')::uuid,
         (e ->> 'quantity')::integer,
         coalesce((e ->> 'unit_base_price')::numeric, 0),
         coalesce((e ->> 'unit_discount')::integer, 0)
  from jsonb_array_elements(p_items) e;

  return v_order_id;
end;
$$;

-- `create or replace` conserva los privilegios; se reafirman por si acaso (idempotente).
revoke execute on function public.create_pending_order(uuid, uuid, text, jsonb, uuid, uuid, jsonb, text, integer, text)
  from public, anon, authenticated;
grant execute on function public.create_pending_order(uuid, uuid, text, jsonb, uuid, uuid, jsonb, text, integer, text)
  to service_role;

-- =========================================================
-- d) Tablas admin_audit y system_status (RLS sin políticas: solo service_role)
-- =========================================================
create table if not exists public.admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action text not null,                       -- p. ej. 'organizer.suspend' / 'organizer.reactivate'
  target_type text not null,                  -- p. ej. 'organizer'
  target_id text,                             -- id del objeto afectado
  detail jsonb not null default '{}'::jsonb,  -- motivo, estado anterior, etc.
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_audit_created on public.admin_audit (created_at desc);

alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from public, anon, authenticated;

create table if not exists public.system_status (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.system_status enable row level security;
revoke all on public.system_status from public, anon, authenticated;

-- =========================================================
-- e) Funciones SQL del panel (SECURITY DEFINER, solo service_role)
-- =========================================================
-- Todas llevan además una guarda: si la petición llega por la API con rol anon o
-- authenticated devuelven vacío / error aunque alguien rompiera los GRANT.
-- (is_privileged() no sirve aquí: dentro de una función SECURITY DEFINER
-- current_user es el dueño y siempre daría true; auth.role() sí conserva el rol
-- de la petición.)

-- admin_organizers(): una fila por productora (perfil con organizer_name, o que
-- tenga eventos). FÓRMULAS:
--   eventos_total / eventos_publicados : count de events del organizador / con status = 'published'.
--   ordenes_aprobadas : órdenes con status = 'approved' (de cualquier kind: venta, gratis y cortesía)
--                       de sus eventos.
--   entradas_emitidas : tickets del organizador con status <> 'cancelled' (incluye gratis y cortesías;
--                       excluye las anuladas por reembolso/contracargo).
--   entradas_ingresadas : tickets con status = 'used'.
--   venta_base : lo que recibe la productora = sum(order_items.unit_base_price * order_items.quantity)
--                de órdenes approved con kind = 'sale'. OJO: unit_base_price YA es el precio final
--                con el descuento aplicado (ver 0007 sección 2 y priceOrder en pricing.ts), así que
--                NO se resta unit_discount otra vez (se descontaría dos veces). Reembolsadas y
--                contracargos quedan fuera porque su status ya no es 'approved'.
--   comision_anc : sum(orders.anc_fee_amount) de órdenes approved (lo que le queda a ANC tras
--                  la comisión de Mercado Pago; las gratis/cortesía aportan 0).
--   ultimo_evento_en : max(events.event_date) (fecha del evento más reciente o próximo).
create or replace function public.admin_organizers()
returns table (
  id uuid,
  organizer_name text,
  email text,
  created_at timestamptz,
  mp_connected boolean,
  suspended_at timestamptz,
  suspended_reason text,
  eventos_total bigint,
  eventos_publicados bigint,
  ordenes_aprobadas bigint,
  entradas_emitidas bigint,
  entradas_ingresadas bigint,
  venta_base numeric,
  comision_anc numeric,
  ultimo_evento_en timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with ev as (
    select e.organizer_id,
           count(*) as total,
           count(*) filter (where e.status = 'published') as publicados,
           max(e.event_date) as ultimo
    from public.events e
    group by e.organizer_id
  ),
  ord as (
    select e.organizer_id,
           count(*) as aprobadas,
           coalesce(sum(o.anc_fee_amount), 0) as comision
    from public.orders o
    join public.events e on e.id = o.event_id
    where o.status = 'approved'
    group by e.organizer_id
  ),
  base as (
    select e.organizer_id,
           coalesce(sum(oi.unit_base_price * oi.quantity), 0) as venta
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.events e on e.id = o.event_id
    where o.status = 'approved' and o.kind = 'sale'
    group by e.organizer_id
  ),
  tk as (
    select e.organizer_id,
           count(*) filter (where t.status <> 'cancelled') as emitidas,
           count(*) filter (where t.status = 'used') as ingresadas
    from public.tickets t
    join public.events e on e.id = t.event_id
    group by e.organizer_id
  )
  select p.id,
         p.organizer_name,
         p.email,
         p.created_at,
         p.mp_connected,
         p.suspended_at,
         p.suspended_reason,
         coalesce(ev.total, 0)::bigint,
         coalesce(ev.publicados, 0)::bigint,
         coalesce(ord.aprobadas, 0)::bigint,
         coalesce(tk.emitidas, 0)::bigint,
         coalesce(tk.ingresadas, 0)::bigint,
         coalesce(base.venta, 0)::numeric,
         coalesce(ord.comision, 0)::numeric,
         ev.ultimo
  from public.profiles p
  left join ev on ev.organizer_id = p.id
  left join ord on ord.organizer_id = p.id
  left join base on base.organizer_id = p.id
  left join tk on tk.organizer_id = p.id
  where (p.organizer_name is not null or ev.organizer_id is not null)
    and coalesce(auth.role(), '') not in ('anon', 'authenticated')
  order by p.created_at;
$$;

-- admin_sales_by_day(p_days): ventas por día de Chile (America/Santiago) de los
-- últimos p_days días (incluido hoy; se limita a 1..3650). Solo órdenes
-- approved con kind = 'sale'. Los días sin ventas no aparecen (la app los rellena).
--   dia : fecha de Chile de coalesce(tickets_issued_at, created_at), es decir, cuándo se aprobó el pago
--         (tickets_issued_at se fija al aprobar); created_at solo como respaldo.
--   ordenes : count de órdenes.   entradas : sum(order_items.quantity).
--   total_cobrado : sum(total_amount) (lo que pagó el comprador, con cargo de servicio).
--   cargo_servicio : sum(service_fee_amount).   comision_anc : sum(anc_fee_amount).
create or replace function public.admin_sales_by_day(p_days integer)
returns table (
  dia date,
  ordenes bigint,
  entradas bigint,
  total_cobrado numeric,
  cargo_servicio numeric,
  comision_anc numeric
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with o as (
    select x.id,
           (coalesce(x.tickets_issued_at, x.created_at) at time zone 'America/Santiago')::date as dia,
           x.total_amount, x.service_fee_amount, x.anc_fee_amount
    from public.orders x
    where x.status = 'approved' and x.kind = 'sale'
  ),
  q as (
    select oi.order_id, sum(oi.quantity) as qty
    from public.order_items oi
    group by oi.order_id
  )
  select o.dia,
         count(*)::bigint,
         coalesce(sum(q.qty), 0)::bigint,
         coalesce(sum(o.total_amount), 0)::numeric,
         coalesce(sum(o.service_fee_amount), 0)::numeric,
         coalesce(sum(o.anc_fee_amount), 0)::numeric
  from o
  left join q on q.order_id = o.id
  where o.dia >= (now() at time zone 'America/Santiago')::date - (greatest(1, least(coalesce(p_days, 30), 3650)) - 1)
    and coalesce(auth.role(), '') not in ('anon', 'authenticated')
  group by o.dia
  order by o.dia;
$$;

-- admin_health(): una fila por indicador (clave, cantidad, detalle). Siempre
-- devuelve las 8 claves. `detalle` es texto corto con ejemplos (ids parciales)
-- para ubicar el problema; nunca datos personales.
--   ordenes_sin_entradas : approved sin tickets_issued_at (pagó y no recibió entradas).
--   correos_sin_enviar   : approved con tickets_issued_at pero sin email_sent_at tras más de 10 min
--                          (se mide desde tickets_issued_at, o updated_at si faltara).
--   pendientes_vencidas  : pending con reserved_until < now() - 30 min (el cron no las expiró).
--   sobreventa           : órdenes con overbooked = true.
--   rechazadas_24h       : rejected / cancelled actualizadas en las últimas 24 h.
--   reembolsos_7d        : refunded / charged_back actualizadas en los últimos 7 días.
--   mp_por_vencer        : mp_accounts con expires_at < now() + 30 días (detalle cuenta las ya vencidas).
--   productoras_sin_mp   : perfiles con eventos publicados y mp_connected = false.
create or replace function public.admin_health()
returns table (
  clave text,
  cantidad bigint,
  detalle text
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select h.clave, h.cantidad, h.detalle
  from (
    select 'ordenes_sin_entradas'::text as clave,
           count(*)::bigint as cantidad,
           coalesce('ej.: ' || string_agg(left(s.id::text, 8), ', ') filter (where s.rn <= 5), '') as detalle
    from (
      select o.id, row_number() over (order by o.created_at) as rn
      from public.orders o
      where o.status = 'approved' and o.tickets_issued_at is null
    ) s
    union all
    select 'correos_sin_enviar', count(*)::bigint,
           coalesce('ej.: ' || string_agg(left(s.id::text, 8), ', ') filter (where s.rn <= 5), '')
    from (
      select o.id, row_number() over (order by o.created_at) as rn
      from public.orders o
      where o.status = 'approved'
        and o.tickets_issued_at is not null
        and o.email_sent_at is null
        and coalesce(o.tickets_issued_at, o.updated_at) < now() - interval '10 minutes'
    ) s
    union all
    select 'pendientes_vencidas', count(*)::bigint,
           coalesce('ej.: ' || string_agg(left(s.id::text, 8), ', ') filter (where s.rn <= 5), '')
    from (
      select o.id, row_number() over (order by o.created_at) as rn
      from public.orders o
      where o.status = 'pending' and o.reserved_until < now() - interval '30 minutes'
    ) s
    union all
    select 'sobreventa', count(*)::bigint,
           coalesce('ej.: ' || string_agg(left(s.id::text, 8), ', ') filter (where s.rn <= 5), '')
    from (
      select o.id, row_number() over (order by o.created_at) as rn
      from public.orders o
      where o.overbooked
    ) s
    union all
    select 'rechazadas_24h', count(*)::bigint, ''
    from public.orders o
    where o.status in ('rejected', 'cancelled') and o.updated_at > now() - interval '24 hours'
    union all
    select 'reembolsos_7d', count(*)::bigint, ''
    from public.orders o
    where o.status in ('refunded', 'charged_back') and o.updated_at > now() - interval '7 days'
    union all
    select 'mp_por_vencer', count(*)::bigint,
           count(*) filter (where m.expires_at < now())::text || ' ya vencidas'
    from public.mp_accounts m
    where m.expires_at is not null and m.expires_at < now() + interval '30 days'
    union all
    select 'productoras_sin_mp', count(*)::bigint, ''
    from public.profiles p
    where not p.mp_connected
      and exists (select 1 from public.events e where e.organizer_id = p.id and e.status = 'published')
  ) h
  where coalesce(auth.role(), '') not in ('anon', 'authenticated');
$$;

-- admin_set_suspension(...): suspende o reactiva una productora Y deja la fila de
-- auditoría en la MISMA transacción (si una falla, ninguna queda). Solo la llama
-- el servidor tras requireAdmin(). p_suspend = true suspende (p_reason obligatorio),
-- false reactiva. Idempotente: si ya estaba en ese estado no cambia nada ni audita.
-- Devuelve { changed, suspended_at }.
create or replace function public.admin_set_suspension(
  p_organizer_id uuid,
  p_suspend boolean,
  p_reason text,
  p_admin_email text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current timestamptz;
  v_prev_reason text;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'FORBIDDEN';
  end if;
  if coalesce(btrim(p_admin_email), '') = '' then
    raise exception 'ADMIN_EMAIL_REQUIRED';
  end if;
  if p_suspend and v_reason is null then
    raise exception 'REASON_REQUIRED';
  end if;

  select p.suspended_at, p.suspended_reason
    into v_current, v_prev_reason
  from public.profiles p
  where p.id = p_organizer_id
  for update;

  if not found then
    raise exception 'ORGANIZER_NOT_FOUND';
  end if;

  if p_suspend = (v_current is not null) then
    return jsonb_build_object('changed', false, 'suspended_at', v_current);
  end if;

  if p_suspend then
    update public.profiles
       set suspended_at = now(), suspended_reason = v_reason
     where id = p_organizer_id
     returning suspended_at into v_current;
  else
    update public.profiles
       set suspended_at = null, suspended_reason = null
     where id = p_organizer_id;
    v_current := null;
  end if;

  insert into public.admin_audit (admin_email, action, target_type, target_id, detail)
  values (
    lower(btrim(p_admin_email)),
    case when p_suspend then 'organizer.suspend' else 'organizer.reactivate' end,
    'organizer',
    p_organizer_id::text,
    case when p_suspend
      then jsonb_build_object('reason', v_reason)
      else jsonb_build_object('previous_reason', v_prev_reason)
    end
  );

  return jsonb_build_object('changed', true, 'suspended_at', v_current);
end;
$$;

-- Privilegios: solo service_role puede ejecutar las funciones del panel.
revoke execute on function public.admin_organizers() from public, anon, authenticated;
revoke execute on function public.admin_sales_by_day(integer) from public, anon, authenticated;
revoke execute on function public.admin_health() from public, anon, authenticated;
revoke execute on function public.admin_set_suspension(uuid, boolean, text, text) from public, anon, authenticated;
grant execute on function public.admin_organizers() to service_role;
grant execute on function public.admin_sales_by_day(integer) to service_role;
grant execute on function public.admin_health() to service_role;
grant execute on function public.admin_set_suspension(uuid, boolean, text, text) to service_role;

-- =========================================================
-- f) Verificación (ejecutar a mano; cada bloque dentro de una transacción con rollback)
-- =========================================================
-- Reemplaza <ORG> (id de una productora), <EVENT> (un evento suyo), <TIER> (una tanda
-- en venta de ese evento) y <USER> (cualquier id de profiles) por valores reales.
--
-- 1) Columnas, tablas y RLS:
--   select column_name from information_schema.columns
--    where table_schema='public' and table_name='profiles' and column_name in ('suspended_at','suspended_reason');
--   -- esperado: 2 filas
--   select relname, relrowsecurity from pg_class
--    where oid in ('public.admin_audit'::regclass, 'public.system_status'::regclass);
--   -- esperado: relrowsecurity = true en ambas
--   select count(*) from pg_policies where schemaname='public' and tablename in ('admin_audit','system_status');
--   -- esperado: 0 (sin políticas: solo service_role)
--
-- 2) Suspender impide create_pending_order (sale, free y courtesy); reactivar lo permite:
--   begin;
--   select public.admin_set_suspension('<ORG>', true, 'prueba', 'admin@test.cl');   -- changed = true
--   select public.create_pending_order('<USER>','<EVENT>','t@example.com',
--     '[{"ticket_type_id":"<TIER>","quantity":1,"unit_base_price":0,"unit_discount":0}]'::jsonb,
--     null,null,'{"total":0}'::jsonb,'sale');        -- esperado: ERROR ORGANIZER_SUSPENDED
--   -- repetir con 'free' y con 'courtesy' (en bloques separados: tras un error la transacción
--   -- queda abortada; usa savepoint o un begin/rollback por cada llamada): mismo ERROR.
--   rollback;
--   begin;
--   select public.admin_set_suspension('<ORG>', true, 'prueba', 'admin@test.cl');
--   select public.admin_set_suspension('<ORG>', false, null, 'admin@test.cl');      -- reactiva
--   select public.create_pending_order('<USER>','<EVENT>','t@example.com',
--     '[{"ticket_type_id":"<TIER>","quantity":1,"unit_base_price":0,"unit_discount":0}]'::jsonb,
--     null,null,'{"total":0}'::jsonb,'courtesy');    -- esperado: devuelve un uuid
--   select action, target_id, detail from public.admin_audit order by created_at desc limit 2;
--   -- esperado: 'organizer.reactivate' y 'organizer.suspend'
--   rollback;
--
-- 3) Una productora autenticada no puede modificar su suspensión (ni mp_connected):
--   begin;
--   select public.admin_set_suspension('<ORG>', true, 'prueba', 'admin@test.cl');
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"<ORG>","role":"authenticated"}', true);
--   update public.profiles set suspended_at = null, suspended_reason = null where id = '<ORG>';
--   -- esperado: ERROR la suspensión solo la modifica el servidor
--   rollback;
--   (misma prueba con un perfil no suspendido: update ... set suspended_at = now()  -> mismo ERROR)
--
-- 4) Las funciones admin_* no son ejecutables por anon ni authenticated:
--   select p.proname,
--          has_function_privilege('anon',         p.oid, 'execute') as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as auth,
--          has_function_privilege('service_role',  p.oid, 'execute') as service
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('admin_organizers','admin_sales_by_day','admin_health','admin_set_suspension');
--   -- esperado: anon = false, auth = false, service = true en las 4 filas
--   begin;
--   set local role authenticated;
--   select * from public.admin_organizers();   -- esperado: ERROR permission denied for function
--   rollback;
--   begin;
--   set local role anon;
--   select * from public.admin_health();       -- esperado: ERROR permission denied for function
--   rollback;
--   begin;
--   set local role authenticated;
--   select * from public.admin_audit;          -- esperado: ERROR permission denied for table
--   rollback;
--
-- 5) Las funciones de lectura devuelven datos coherentes (como postgres / service_role):
--   select * from public.admin_organizers() order by venta_base desc limit 5;
--   select * from public.admin_sales_by_day(7);
--   select * from public.admin_health();       -- siempre 8 filas
--   -- cruce de venta_base con el panel de la productora (Recaudado) y con las órdenes:
--   select sum(o.total_amount - o.service_fee_amount) as base_por_orden
--     from public.orders o join public.events e on e.id = o.event_id
--    where e.organizer_id = '<ORG>' and o.status = 'approved' and o.kind = 'sale';
--   -- esperado: igual a venta_base de admin_organizers() para <ORG>
