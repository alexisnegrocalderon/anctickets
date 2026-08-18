-- ANC Tickets — esquema inicial
-- Ejecutar en el SQL editor de Supabase (o via supabase db push)

create extension if not exists "pgcrypto";

-- =========================================================
-- profiles: uno por usuario autenticado (organizador y/o comprador)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  mp_connected boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: select own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

-- Crea automáticamente el profile al registrarse un usuario (login con Google)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =========================================================
-- mp_accounts: credenciales de Mercado Pago del organizador
-- Nunca se exponen al cliente; solo accesibles server-side (service role)
-- =========================================================
create table if not exists public.mp_accounts (
  organizer_id uuid primary key references public.profiles (id) on delete cascade,
  mp_user_id text not null,
  access_token text not null,
  refresh_token text,
  public_key text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mp_accounts enable row level security;

-- Sin policies de select/update para el cliente: solo el service role (server) puede leer/escribir.
-- El organizador puede ver si está conectado a través de profiles.mp_connected.

-- =========================================================
-- events
-- =========================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  venue text,
  event_date timestamptz not null,
  image_url text,
  status text not null default 'draft' check (status in ('draft', 'published', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "events: public can view published" on public.events
  for select using (status = 'published' or organizer_id = auth.uid());

create policy "events: organizer manage own" on public.events
  for all using (organizer_id = auth.uid()) with check (organizer_id = auth.uid());

-- =========================================================
-- ticket_types
-- =========================================================
create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  name text not null,
  base_price numeric(12, 2) not null check (base_price >= 0),
  quantity integer not null check (quantity >= 0),
  sold_count integer not null default 0,
  sales_start timestamptz,
  sales_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ticket_types enable row level security;

create policy "ticket_types: public can view for published events" on public.ticket_types
  for select using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id
        and (e.status = 'published' or e.organizer_id = auth.uid())
    )
  );

create policy "ticket_types: organizer manage own" on public.ticket_types
  for all using (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.organizer_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.events e
      where e.id = ticket_types.event_id and e.organizer_id = auth.uid()
    )
  );

-- =========================================================
-- orders
-- total_amount = monto total cobrado al comprador (incluye cargo de servicio)
-- service_fee_amount = 10% de total_amount
-- mp_fee_amount = 3.9% de total_amount (comisión de Mercado Pago)
-- anc_fee_amount = service_fee_amount - mp_fee_amount (≈6.1% de total_amount, lo que recibe ANC)
-- =========================================================
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  total_amount numeric(12, 2) not null,
  service_fee_amount numeric(12, 2) not null,
  mp_fee_amount numeric(12, 2) not null,
  anc_fee_amount numeric(12, 2) not null,
  mp_preference_id text,
  mp_payment_id text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  buyer_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "orders: buyer view own" on public.orders
  for select using (buyer_id = auth.uid());

create policy "orders: organizer view for own events" on public.orders
  for select using (
    exists (
      select 1 from public.events e
      where e.id = orders.event_id and e.organizer_id = auth.uid()
    )
  );

create policy "orders: buyer create own" on public.orders
  for insert with check (buyer_id = auth.uid());

-- Actualizaciones de estado de orden (pago aprobado, etc.) las hace el webhook via service role.

-- =========================================================
-- order_items: detalle de qué tipos de entrada y cuántas componen la orden
-- =========================================================
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id),
  quantity integer not null check (quantity > 0),
  unit_base_price numeric(12, 2) not null,
  created_at timestamptz not null default now()
);

alter table public.order_items enable row level security;

create policy "order_items: buyer view own" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.buyer_id = auth.uid()
    )
  );

create policy "order_items: organizer view for own events" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      join public.events e on e.id = o.event_id
      where o.id = order_items.order_id and e.organizer_id = auth.uid()
    )
  );

create policy "order_items: buyer create own" on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.buyer_id = auth.uid()
    )
  );

-- =========================================================
-- tickets
-- =========================================================
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types (id) on delete cascade,
  qr_code uuid not null unique default gen_random_uuid(),
  status text not null default 'valid' check (status in ('valid', 'used', 'cancelled')),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.tickets enable row level security;

create policy "tickets: buyer view own" on public.tickets
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = tickets.order_id and o.buyer_id = auth.uid()
    )
  );

create policy "tickets: organizer view/update for own events" on public.tickets
  for select using (
    exists (
      select 1 from public.orders o
      join public.events e on e.id = o.event_id
      where o.id = tickets.order_id and e.organizer_id = auth.uid()
    )
  );

create policy "tickets: organizer validate (mark used) for own events" on public.tickets
  for update using (
    exists (
      select 1 from public.orders o
      join public.events e on e.id = o.event_id
      where o.id = tickets.order_id and e.organizer_id = auth.uid()
    )
  );

-- Índices útiles
create index if not exists idx_events_organizer on public.events (organizer_id);
create index if not exists idx_ticket_types_event on public.ticket_types (event_id);
create index if not exists idx_orders_buyer on public.orders (buyer_id);
create index if not exists idx_orders_event on public.orders (event_id);
create index if not exists idx_tickets_order on public.tickets (order_id);
create index if not exists idx_order_items_order on public.order_items (order_id);
