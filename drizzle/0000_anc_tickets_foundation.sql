-- ANC Tickets foundation: identity, organizations, ticket inventory, payments and access audit.
-- This migration is intended for isolated verification before any main-branch promotion.
create extension if not exists pgcrypto;

create type global_role as enum ('user', 'anc_admin');
create type membership_role as enum ('owner', 'manager', 'staff');
create type event_status as enum ('draft', 'published', 'cancelled');
create type order_status as enum ('pending', 'approved', 'rejected', 'cancelled', 'expired');
create type ticket_status as enum ('valid', 'used', 'cancelled');
create type reservation_status as enum ('active', 'converted', 'expired', 'cancelled');

create table "user" (id text primary key, name text not null, email text not null unique, email_verified boolean not null default false, image text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table session (id text primary key, user_id text not null references "user"(id) on delete cascade, token text not null unique, expires_at timestamptz not null, ip_address text, user_agent text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table account (id text primary key, user_id text not null references "user"(id) on delete cascade, account_id text not null, provider_id text not null, issuer text not null, access_token text, refresh_token text, access_token_expires_at timestamptz, refresh_token_expires_at timestamptz, scope text, id_token text, password text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(issuer, account_id));
create table verification (id text primary key, identifier text not null, value text not null, expires_at timestamptz not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table profiles (user_id text primary key references "user"(id) on delete cascade, global_role global_role not null default 'user', mp_connected boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table organizations (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table organization_memberships (id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade, user_id text not null references "user"(id) on delete cascade, role membership_role not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id, user_id));
create table events (id uuid primary key default gen_random_uuid(), organization_id uuid not null references organizations(id) on delete cascade, title text not null, slug text not null unique, description text, venue text, event_date timestamptz not null, image_url text, status event_status not null default 'draft', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table ticket_types (id uuid primary key default gen_random_uuid(), event_id uuid not null references events(id) on delete cascade, name text not null, base_price numeric(12,2) not null check (base_price >= 0), capacity integer not null check (capacity >= 0), reserved_count integer not null default 0 check (reserved_count >= 0), sold_count integer not null default 0 check (sold_count >= 0), sales_start timestamptz, sales_end timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), check (reserved_count + sold_count <= capacity));
create table event_staff (id uuid primary key default gen_random_uuid(), event_id uuid not null references events(id) on delete cascade, user_id text not null references "user"(id) on delete cascade, can_scan boolean not null default true, granted_by text not null references "user"(id), revoked_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(event_id, user_id));
create table reservations (id uuid primary key default gen_random_uuid(), buyer_id text not null references "user"(id), event_id uuid not null references events(id), status reservation_status not null default 'active', expires_at timestamptz not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table reservation_items (id uuid primary key default gen_random_uuid(), reservation_id uuid not null references reservations(id) on delete cascade, ticket_type_id uuid not null references ticket_types(id), quantity integer not null check (quantity > 0), unit_base_price numeric(12,2) not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(reservation_id, ticket_type_id));
create table orders (id uuid primary key default gen_random_uuid(), buyer_id text not null references "user"(id), event_id uuid not null references events(id), reservation_id uuid unique references reservations(id), total_amount numeric(12,2) not null, service_fee_amount numeric(12,2) not null, mp_fee_amount numeric(12,2) not null, anc_fee_amount numeric(12,2) not null, mp_preference_id text unique, mp_payment_id text unique, status order_status not null default 'pending', buyer_email text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade, ticket_type_id uuid not null references ticket_types(id), quantity integer not null check (quantity > 0), unit_base_price numeric(12,2) not null, created_at timestamptz not null default now());
create table tickets (id uuid primary key default gen_random_uuid(), order_id uuid not null references orders(id) on delete cascade, ticket_type_id uuid not null references ticket_types(id), qr_code uuid not null unique default gen_random_uuid(), status ticket_status not null default 'valid', used_at timestamptz, created_at timestamptz not null default now());
create table ticket_checkins (id uuid primary key default gen_random_uuid(), ticket_id uuid not null references tickets(id), event_id uuid not null references events(id), staff_user_id text not null references "user"(id), scanned_at timestamptz not null default now(), result text not null, metadata jsonb not null default '{}'::jsonb);
create table payment_events (id uuid primary key default gen_random_uuid(), provider text not null, external_event_id text not null, event_type text not null, payload jsonb not null, processed_at timestamptz, created_at timestamptz not null default now(), unique(provider, external_event_id));

create index session_user_id_idx on session(user_id);
create index verification_identifier_idx on verification(identifier);
create index events_organization_idx on events(organization_id);
create index events_status_date_idx on events(status, event_date);
create index ticket_types_event_idx on ticket_types(event_id);
create index event_staff_user_idx on event_staff(user_id);
create index reservations_event_status_idx on reservations(event_id, status);
create index reservations_expiry_idx on reservations(expires_at);
create index orders_buyer_idx on orders(buyer_id);
create index orders_event_idx on orders(event_id);
create index tickets_order_idx on tickets(order_id);
create index ticket_checkins_event_idx on ticket_checkins(event_id);
create index ticket_checkins_ticket_idx on ticket_checkins(ticket_id);
