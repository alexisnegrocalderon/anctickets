-- ANC Tickets — Fase 0: ventas seguras, reservas de stock, descuentos,
-- embajadores, staff de puerta y check-in atómico.
--
-- Compatible con 0001..0006. Pensada para ejecutarse una sola vez en el SQL
-- editor de Supabase (o `supabase db push`), pero escrita de forma que
-- re-ejecutarla no rompa nada (if not exists / drop ... if exists).
--
-- Principio: TODO lo que mueve dinero o stock pasa por funciones SECURITY
-- DEFINER que solo puede ejecutar el service role (el servidor de Next.js).
-- Ni compradores ni productores pueden escribir esas columnas desde el cliente.

-- =========================================================
-- 0. Helper: ¿quien ejecuta es el servidor / admin de la base?
-- =========================================================
-- Dentro de una función SECURITY DEFINER current_user es el dueño (postgres),
-- y con la service key auth.role() = 'service_role'. Un usuario normal
-- (rol 'authenticated' / 'anon') nunca cumple ninguna de las dos.
create or replace function public.is_privileged()
returns boolean
language sql
stable
as $$
  select coalesce(auth.role(), '') = 'service_role'
      or current_user in ('postgres', 'supabase_admin', 'service_role');
$$;

-- =========================================================
-- 1. ticket_types: stock reservado mientras se paga
-- =========================================================
alter table public.ticket_types
  add column if not exists reserved_count integer not null default 0;

-- Nota: NO se agrega un CHECK sold_count + reserved_count <= quantity a
-- propósito (una aprobación tardía de MP puede sobrevender y eso se registra
-- en orders.overbooked en vez de perder un pago real). El límite se hace
-- cumplir dentro de create_pending_order.

-- =========================================================
-- 2. orders: descuentos, embajadores, reserva y trazabilidad
-- =========================================================
alter table public.orders add column if not exists discount_code_id uuid;
alter table public.orders add column if not exists discount_amount integer not null default 0;
alter table public.orders add column if not exists ambassador_id uuid;
alter table public.orders add column if not exists reserved_until timestamptz;
alter table public.orders add column if not exists tickets_issued_at timestamptz;
alter table public.orders add column if not exists email_sent_at timestamptz;
alter table public.orders add column if not exists holder_name text;
alter table public.orders add column if not exists overbooked boolean not null default false;
-- true mientras la orden "tiene tomado" un uso del código de descuento
alter table public.orders add column if not exists discount_use_held boolean not null default false;
alter table public.orders
  add column if not exists kind text not null default 'sale';

alter table public.orders drop constraint if exists orders_kind_check;
alter table public.orders add constraint orders_kind_check
  check (kind in ('sale', 'free', 'courtesy'));

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled', 'expired', 'refunded', 'charged_back'));

-- Órdenes aprobadas antes de esta migración: ya tenían tickets y correo.
update public.orders
set tickets_issued_at = coalesce(tickets_issued_at, updated_at),
    email_sent_at = coalesce(email_sent_at, updated_at)
where status = 'approved';

create index if not exists idx_orders_pending_reserved
  on public.orders (reserved_until) where status = 'pending';
create index if not exists idx_orders_mp_payment on public.orders (mp_payment_id);
create index if not exists idx_mp_accounts_mp_user on public.mp_accounts (mp_user_id);

-- order_items: el precio unitario guardado es el FINAL (ya con descuento);
-- unit_discount deja registro de cuánto se descontó por entrada.
alter table public.order_items add column if not exists unit_discount integer not null default 0;

-- =========================================================
-- 3. discount_codes
-- =========================================================
create table if not exists public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  code text not null check (code = upper(code) and length(code) between 3 and 32),
  kind text not null check (kind in ('percent', 'fixed')),
  value integer not null check (value > 0),
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0,
  valid_from timestamptz,
  valid_until timestamptz,
  ticket_type_ids uuid[],
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint discount_codes_percent_range check (kind <> 'percent' or value <= 100)
);

create unique index if not exists discount_codes_event_code_key
  on public.discount_codes (event_id, code);

alter table public.orders drop constraint if exists orders_discount_code_fk;
alter table public.orders add constraint orders_discount_code_fk
  foreign key (discount_code_id) references public.discount_codes (id) on delete set null;

alter table public.discount_codes enable row level security;

-- Sin lectura pública: el comprador valida el código a través del servidor.
drop policy if exists "discount_codes: organizer manage" on public.discount_codes;
create policy "discount_codes: organizer manage" on public.discount_codes
  for all using (
    exists (select 1 from public.events e where e.id = discount_codes.event_id and e.organizer_id = auth.uid())
  ) with check (
    exists (select 1 from public.events e where e.id = discount_codes.event_id and e.organizer_id = auth.uid())
  );

-- =========================================================
-- 4. ambassadors
-- =========================================================
create table if not exists public.ambassadors (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid references public.events (id) on delete cascade, -- null = todos los eventos del productor
  name text not null,
  email text,
  code text not null check (code = upper(code) and length(code) between 3 and 32),
  commission_percent numeric(5, 2) check (commission_percent is null or (commission_percent >= 0 and commission_percent <= 100)),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists ambassadors_organizer_code_key
  on public.ambassadors (organizer_id, code);

alter table public.orders drop constraint if exists orders_ambassador_fk;
alter table public.orders add constraint orders_ambassador_fk
  foreign key (ambassador_id) references public.ambassadors (id) on delete set null;

alter table public.ambassadors enable row level security;

drop policy if exists "ambassadors: organizer manage" on public.ambassadors;
create policy "ambassadors: organizer manage" on public.ambassadors
  for all using (organizer_id = auth.uid()) with check (organizer_id = auth.uid());

-- =========================================================
-- 5. event_staff (personal de puerta)
-- =========================================================
create table if not exists public.event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  email text not null check (email = lower(email)),
  user_id uuid references auth.users (id) on delete set null,
  role text not null default 'scanner',
  created_at timestamptz not null default now(),
  unique (event_id, email)
);

alter table public.event_staff enable row level security;

drop policy if exists "event_staff: organizer manage" on public.event_staff;
create policy "event_staff: organizer manage" on public.event_staff
  for all using (
    exists (select 1 from public.events e where e.id = event_staff.event_id and e.organizer_id = auth.uid())
  ) with check (
    exists (select 1 from public.events e where e.id = event_staff.event_id and e.organizer_id = auth.uid())
  );

drop policy if exists "event_staff: staff read own" on public.event_staff;
create policy "event_staff: staff read own" on public.event_staff
  for select using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- =========================================================
-- 6. tickets: evento, titular, quién validó, número dentro de la orden
-- =========================================================
alter table public.tickets add column if not exists event_id uuid references public.events (id) on delete cascade;
alter table public.tickets add column if not exists holder_name text;
alter table public.tickets add column if not exists holder_email text;
alter table public.tickets add column if not exists checked_in_by uuid references auth.users (id) on delete set null;
alter table public.tickets add column if not exists seq integer;

update public.tickets t
set event_id = tt.event_id
from public.ticket_types tt
where t.ticket_type_id = tt.id and t.event_id is null;

update public.tickets t
set holder_name = coalesce(t.holder_name, p.full_name),
    holder_email = coalesce(t.holder_email, o.buyer_email)
from public.orders o
left join public.profiles p on p.id = o.buyer_id
where t.order_id = o.id and (t.holder_email is null or t.holder_name is null);

update public.tickets t
set seq = s.rn
from (
  select id, row_number() over (partition by order_id, ticket_type_id order by created_at, id) as rn
  from public.tickets
) s
where t.id = s.id and t.seq is null;

alter table public.tickets alter column event_id set not null;
alter table public.tickets alter column seq set not null;

create unique index if not exists tickets_order_type_seq_key
  on public.tickets (order_id, ticket_type_id, seq);
create index if not exists idx_tickets_event on public.tickets (event_id);

-- Ya no hay update directo: el check-in pasa por check_in_ticket().
drop policy if exists "tickets: organizer validate (mark used) for own events" on public.tickets;

-- =========================================================
-- 7. check_ins (bitácora de escaneos)
-- =========================================================
create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.tickets (id) on delete cascade, -- null si el código no existe
  event_id uuid not null references public.events (id) on delete cascade,
  scanned_by uuid references auth.users (id) on delete set null,
  qr_input text,
  result text not null check (result in ('ok', 'already_used', 'wrong_event', 'cancelled', 'not_found')),
  created_at timestamptz not null default now()
);

create index if not exists idx_check_ins_event on public.check_ins (event_id, created_at desc);

alter table public.check_ins enable row level security;

drop policy if exists "check_ins: organizer read" on public.check_ins;
create policy "check_ins: organizer read" on public.check_ins
  for select using (
    exists (select 1 from public.events e where e.id = check_ins.event_id and e.organizer_id = auth.uid())
  );

-- =========================================================
-- 8. Cerrar los huecos de RLS de 0001
-- =========================================================
-- Un comprador podía insertarse órdenes "approved" con cualquier monto.
-- Ahora las órdenes se crean solo desde el servidor (service role).
drop policy if exists "orders: buyer create own" on public.orders;
drop policy if exists "order_items: buyer create own" on public.order_items;

-- Columnas sensibles: solo las puede cambiar el servidor.
create or replace function public.guard_ticket_types()
returns trigger
language plpgsql
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.sold_count := 0;
    new.reserved_count := 0;
  elsif new.sold_count is distinct from old.sold_count
     or new.reserved_count is distinct from old.reserved_count then
    raise exception 'sold_count y reserved_count solo los puede modificar el servidor';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_ticket_types on public.ticket_types;
create trigger guard_ticket_types
  before insert or update on public.ticket_types
  for each row execute function public.guard_ticket_types();

create or replace function public.guard_tickets()
returns trigger
language plpgsql
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    raise exception 'Los tickets solo los emite el servidor';
  end if;
  if new.qr_code is distinct from old.qr_code
     or new.status is distinct from old.status
     or new.used_at is distinct from old.used_at
     or new.order_id is distinct from old.order_id
     or new.event_id is distinct from old.event_id
     or new.ticket_type_id is distinct from old.ticket_type_id
     or new.checked_in_by is distinct from old.checked_in_by then
    raise exception 'Los tickets solo los modifica el servidor';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_tickets on public.tickets;
create trigger guard_tickets
  before insert or update on public.tickets
  for each row execute function public.guard_tickets();

create or replace function public.guard_profiles()
returns trigger
language plpgsql
as $$
begin
  if public.is_privileged() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.mp_connected := false;
  elsif new.mp_connected is distinct from old.mp_connected then
    raise exception 'mp_connected solo lo modifica el servidor';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profiles on public.profiles;
create trigger guard_profiles
  before insert or update on public.profiles
  for each row execute function public.guard_profiles();

-- No se puede borrar un evento con ventas aprobadas (se borrarían órdenes y
-- tickets en cascada). Hay que cancelarlo en vez de borrarlo.
create or replace function public.guard_event_delete()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.orders o
    where o.event_id = old.id and o.status in ('approved', 'refunded', 'charged_back')
  ) then
    raise exception 'EVENT_HAS_SALES: el evento tiene ventas; cancélalo en vez de borrarlo';
  end if;
  return old;
end;
$$;

drop trigger if exists guard_event_delete on public.events;
create trigger guard_event_delete
  before delete on public.events
  for each row execute function public.guard_event_delete();

-- =========================================================
-- 9. RPCs (SECURITY DEFINER; solo service_role)
-- =========================================================

-- Libera la reserva de stock y el uso de descuento de una orden pendiente.
-- Interna: la llaman expire_stale_orders y fail_order con la orden ya bloqueada.
create or replace function public._release_order_hold(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_code uuid;
  v_held boolean;
begin
  for v_item in select ticket_type_id, quantity from public.order_items where order_id = p_order_id loop
    update public.ticket_types
    set reserved_count = greatest(reserved_count - v_item.quantity, 0)
    where id = v_item.ticket_type_id;
  end loop;

  select discount_code_id, discount_use_held into v_code, v_held
  from public.orders where id = p_order_id;

  if v_code is not null and v_held then
    update public.discount_codes set used_count = greatest(used_count - 1, 0) where id = v_code;
    update public.orders set discount_use_held = false where id = p_order_id;
  end if;
end;
$$;

-- d) Expira las órdenes pendientes cuya reserva venció.
create or replace function public.expire_stale_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_count integer := 0;
begin
  for v_order in
    select id from public.orders
    where status = 'pending' and reserved_until is not null and reserved_until < now()
    for update skip locked
  loop
    perform public._release_order_hold(v_order.id);
    update public.orders set status = 'expired', updated_at = now() where id = v_order.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- a) Crea una orden pendiente reservando stock (y el uso del código) de forma atómica.
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

    update public.ticket_types
    set reserved_count = reserved_count + v_qty, updated_at = now()
    where id = v_ticket_type
      and event_id = p_event_id
      and sold_count + reserved_count + v_qty <= quantity;

    if not found then
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

-- b) Aprueba una orden (idempotente): mueve stock reservado a vendido y emite los tickets.
create or replace function public.approve_order(p_order_id uuid, p_payment_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_item record;
  v_was_pending boolean;
  v_overbooked boolean := false;
  v_holder_name text;
  i integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  -- Ya aprobada (notificación repetida) o cerrada por devolución: no tocar nada.
  if v_order.status in ('approved', 'refunded', 'charged_back') then
    return jsonb_build_object('newly_approved', false, 'status', v_order.status);
  end if;

  v_was_pending := v_order.status = 'pending';

  for v_item in select ticket_type_id, quantity from public.order_items where order_id = p_order_id loop
    if v_was_pending then
      update public.ticket_types
      set sold_count = sold_count + v_item.quantity,
          reserved_count = greatest(reserved_count - v_item.quantity, 0),
          updated_at = now()
      where id = v_item.ticket_type_id;
    else
      -- La reserva ya se había liberado (expirada/rechazada): volver a tomar stock.
      update public.ticket_types
      set sold_count = sold_count + v_item.quantity, updated_at = now()
      where id = v_item.ticket_type_id
        and sold_count + reserved_count + v_item.quantity <= quantity;
      if not found then
        -- Sin stock: el pago ya está hecho, se aprueba igual y se deja marcado.
        update public.ticket_types
        set sold_count = sold_count + v_item.quantity, updated_at = now()
        where id = v_item.ticket_type_id;
        v_overbooked := true;
      end if;
    end if;
  end loop;

  if not v_was_pending and v_order.discount_code_id is not null and not v_order.discount_use_held then
    update public.discount_codes set used_count = used_count + 1 where id = v_order.discount_code_id;
  end if;

  select coalesce(v_order.holder_name, p.full_name) into v_holder_name
  from public.profiles p where p.id = v_order.buyer_id;
  v_holder_name := coalesce(v_order.holder_name, v_holder_name);

  -- Emisión idempotente: (order_id, ticket_type_id, seq) es único.
  for v_item in select ticket_type_id, quantity from public.order_items where order_id = p_order_id loop
    for i in 1 .. v_item.quantity loop
      insert into public.tickets (order_id, ticket_type_id, event_id, holder_name, holder_email, seq)
      values (p_order_id, v_item.ticket_type_id, v_order.event_id, v_holder_name, v_order.buyer_email, i)
      on conflict (order_id, ticket_type_id, seq) do nothing;
    end loop;
  end loop;

  update public.orders
  set status = 'approved',
      mp_payment_id = coalesce(p_payment_id, mp_payment_id),
      tickets_issued_at = coalesce(tickets_issued_at, now()),
      overbooked = overbooked or v_overbooked,
      discount_use_held = discount_code_id is not null,
      updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('newly_approved', true, 'overbooked', v_overbooked, 'status', 'approved');
end;
$$;

-- Pago rechazado / cancelado: la orden pendiente suelta su reserva.
create or replace function public.fail_order(p_order_id uuid, p_new_status text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if p_new_status not in ('rejected', 'cancelled') then
    raise exception 'INVALID_STATUS';
  end if;

  select status into v_status from public.orders where id = p_order_id for update;
  if not found or v_status <> 'pending' then
    return false;
  end if;

  perform public._release_order_hold(p_order_id);
  update public.orders set status = p_new_status, updated_at = now() where id = p_order_id;
  return true;
end;
$$;

-- c) Reembolso / contracargo: anula los tickets válidos y devuelve el stock.
create or replace function public.revert_order(p_order_id uuid, p_new_status text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_type record;
  v_cancelled integer := 0;
begin
  if p_new_status not in ('refunded', 'charged_back') then
    raise exception 'INVALID_STATUS';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.status = p_new_status then
    return jsonb_build_object('reverted', false, 'cancelled_tickets', 0);
  end if;

  -- Ya revertida por otro motivo: solo actualizar el estado.
  if v_order.status in ('refunded', 'charged_back') then
    update public.orders set status = p_new_status, updated_at = now() where id = p_order_id;
    return jsonb_build_object('reverted', false, 'cancelled_tickets', 0);
  end if;

  if v_order.status <> 'approved' then
    return jsonb_build_object('reverted', false, 'cancelled_tickets', 0);
  end if;

  -- Tickets ya usados se quedan como usados; solo se anulan los válidos.
  for v_type in
    select ticket_type_id, count(*) as n
    from public.tickets
    where order_id = p_order_id and status = 'valid'
    group by ticket_type_id
  loop
    update public.ticket_types
    set sold_count = greatest(sold_count - v_type.n, 0), updated_at = now()
    where id = v_type.ticket_type_id;
    v_cancelled := v_cancelled + v_type.n;
  end loop;

  update public.tickets set status = 'cancelled' where order_id = p_order_id and status = 'valid';

  if v_order.discount_code_id is not null and v_order.discount_use_held then
    update public.discount_codes set used_count = greatest(used_count - 1, 0) where id = v_order.discount_code_id;
  end if;

  update public.orders
  set status = p_new_status, discount_use_held = false, updated_at = now()
  where id = p_order_id;

  return jsonb_build_object('reverted', true, 'cancelled_tickets', v_cancelled);
end;
$$;

-- ¿Puede este usuario escanear en este evento? (organizador o staff por email)
create or replace function public.can_scan_event(p_event_id uuid, p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if p_user_id is null then
    return false;
  end if;

  if exists (select 1 from public.events where id = p_event_id and organizer_id = p_user_id) then
    return true;
  end if;

  select lower(email) into v_email from auth.users where id = p_user_id;

  return exists (
    select 1 from public.event_staff s
    where s.event_id = p_event_id
      and (s.user_id = p_user_id or (v_email is not null and s.email = v_email))
  );
end;
$$;

-- e) Check-in atómico.
create or replace function public.check_in_ticket(p_qr text, p_event_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code uuid;
  v_ticket record;
  v_updated integer;
  v_result text;
  v_counts jsonb;
  v_other_title text;
  v_used_at timestamptz;
begin
  if not public.can_scan_event(p_event_id, p_user_id) then
    return jsonb_build_object('result', 'forbidden');
  end if;

  begin
    v_code := trim(p_qr)::uuid;
  exception when others then
    v_code := null;
  end;

  -- Se ejecuta siempre (con v_code nulo no encuentra filas y deja v_ticket en nulls).
  select t.id, t.status, t.used_at, t.event_id, t.holder_name, t.holder_email, tt.name as type_name
  into v_ticket
  from public.tickets t
  join public.ticket_types tt on tt.id = t.ticket_type_id
  where t.qr_code = v_code;

  if v_ticket.id is null then
    v_result := 'not_found';
  elsif v_ticket.event_id <> p_event_id then
    v_result := 'wrong_event';
    select title into v_other_title from public.events where id = v_ticket.event_id;
  elsif v_ticket.status = 'cancelled' then
    v_result := 'cancelled';
  else
    -- UPDATE condicional: si dos puertas escanean a la vez, solo una gana.
    update public.tickets
    set status = 'used', used_at = now(), checked_in_by = p_user_id
    where id = v_ticket.id and status = 'valid'
    returning used_at into v_used_at;
    get diagnostics v_updated = row_count;

    if v_updated = 1 then
      v_result := 'ok';
    else
      v_result := 'already_used';
      select used_at into v_used_at from public.tickets where id = v_ticket.id;
    end if;
  end if;

  insert into public.check_ins (ticket_id, event_id, scanned_by, qr_input, result)
  values (v_ticket.id, p_event_id, p_user_id, left(p_qr, 200), v_result);

  select jsonb_build_object(
    'checked_in', count(*) filter (where status = 'used'),
    'total', count(*) filter (where status <> 'cancelled')
  ) into v_counts
  from public.tickets where event_id = p_event_id;

  return jsonb_build_object(
    'result', v_result,
    'ticket_id', v_ticket.id,
    'holder_name', v_ticket.holder_name,
    'holder_email', v_ticket.holder_email,
    'ticket_type', v_ticket.type_name,
    'used_at', v_used_at,
    'other_event_title', v_other_title,
    'counts', v_counts
  );
end;
$$;

-- f) Latido para el cron diario (evita que el proyecto gratuito se pause).
create or replace function public.keep_alive()
returns integer
language sql
security definer
set search_path = public
as $$
  select 1;
$$;

-- Permisos: solo el service role ejecuta las RPCs.
do $$
declare
  fn text;
begin
  foreach fn in array array[
    'public._release_order_hold(uuid)',
    'public.expire_stale_orders()',
    'public.create_pending_order(uuid, uuid, text, jsonb, uuid, uuid, jsonb, text, integer, text)',
    'public.approve_order(uuid, text)',
    'public.fail_order(uuid, text)',
    'public.revert_order(uuid, text)',
    'public.can_scan_event(uuid, uuid)',
    'public.check_in_ticket(text, uuid, uuid)',
    'public.keep_alive()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end;
$$;
