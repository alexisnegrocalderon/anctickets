-- 0009_tandas.sql
-- Tandas de entradas: pausa manual por tanda y reserva atómica que hace cumplir
-- la ventana de venta (sales_start / sales_end) y la pausa.
-- NO aplicada: el dueño la ejecuta tras revisarla. Idempotente.

-- 1. Pausa manual. guard_ticket_types (0007) solo protege sold_count y
--    reserved_count, así que el productor puede cambiar `paused` con su RLS normal.
alter table public.ticket_types add column if not exists paused boolean not null default false;

-- 2. create_pending_order: misma firma y comportamiento que en 0007, más la
--    validación de ventana y pausa dentro del UPDATE que reserva el stock.
--    `create or replace` conserva los privilegios existentes (revoke a
--    public/anon/authenticated y grant a service_role de 0007 sección 9), así
--    que no se repiten aquí; la verificación está al final.
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

-- =========================================================
-- 3. Verificación (ejecutar a mano; cada bloque dentro de una transacción con rollback)
-- =========================================================
-- Reemplaza <EVENT>, <USER> y <TIER> por ids reales (o crea datos dentro de la transacción).
--
-- a) Columna y privilegios intactos:
--   select column_name, data_type, is_nullable, column_default
--     from information_schema.columns
--    where table_schema='public' and table_name='ticket_types' and column_name='paused';
--   select has_function_privilege('anon',        'public.create_pending_order(uuid,uuid,text,jsonb,uuid,uuid,jsonb,text,integer,text)','execute') as anon,
--          has_function_privilege('authenticated','public.create_pending_order(uuid,uuid,text,jsonb,uuid,uuid,jsonb,text,integer,text)','execute') as auth,
--          has_function_privilege('service_role', 'public.create_pending_order(uuid,uuid,text,jsonb,uuid,uuid,jsonb,text,integer,text)','execute') as service;
--   -- esperado: false, false, true
--
-- b) Tanda pausada rechaza venta (NOT_ON_SALE) y la cortesía pasa:
--   begin;
--   update public.ticket_types set paused = true where id = '<TIER>';
--   select public.create_pending_order('<USER>','<EVENT>','t@example.com',
--     '[{"ticket_type_id":"<TIER>","quantity":1,"unit_base_price":1000,"unit_discount":0}]'::jsonb,
--     null,null,'{"total":1100}'::jsonb,'sale');            -- esperado: NOT_ON_SALE:<TIER>
--   select public.create_pending_order('<USER>','<EVENT>','t@example.com',
--     '[{"ticket_type_id":"<TIER>","quantity":1,"unit_base_price":0,"unit_discount":0}]'::jsonb,
--     null,null,'{"total":0}'::jsonb,'courtesy');           -- esperado: devuelve un uuid
--   rollback;
--
-- c) Ventana: aún no abre / ya cerró -> NOT_ON_SALE; dentro de la ventana -> ok:
--   begin;
--   update public.ticket_types set paused=false, sales_start = now() + interval '1 hour', sales_end = null where id='<TIER>';
--   select public.create_pending_order(... 'sale');         -- esperado: NOT_ON_SALE
--   update public.ticket_types set sales_start = now() - interval '1 hour', sales_end = now() - interval '1 second' where id='<TIER>';
--   select public.create_pending_order(... 'free');         -- esperado: NOT_ON_SALE (cierre exacto)
--   update public.ticket_types set sales_end = now() + interval '1 hour' where id='<TIER>';
--   select public.create_pending_order(... 'sale');         -- esperado: uuid
--   rollback;
--
-- d) Sin cupo sigue siendo SOLD_OUT (también en cortesía):
--   begin;
--   update public.ticket_types set paused=false, sales_start=null, sales_end=null, quantity = sold_count + reserved_count where id='<TIER>';
--   select public.create_pending_order(... 'sale');         -- esperado: SOLD_OUT:<TIER>
--   select public.create_pending_order(... 'courtesy');     -- esperado: SOLD_OUT:<TIER>
--   rollback;
--
-- e) Tanda de otro evento sigue dando SOLD_OUT (no filtra existencia):
--   select public.create_pending_order('<USER>','<OTRO_EVENTO>','t@example.com', '[{"ticket_type_id":"<TIER>","quantity":1,"unit_base_price":0,"unit_discount":0}]'::jsonb, null,null,'{"total":0}'::jsonb,'free');
--   -- esperado: SOLD_OUT:<TIER> (dentro de begin; ... rollback;)
--
-- f) El productor puede pausar con su sesión (no la bloquea guard_ticket_types):
--   -- como usuario autenticado dueño del evento: update public.ticket_types set paused = true where id = '<TIER>';  -- esperado: 1 fila
