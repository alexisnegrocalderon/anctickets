-- Organizer onboarding, promotions, ambassadors and audit trail.
create type organization_status as enum ('draft','review','active','suspended');
create type activation_request_status as enum ('pending','approved','rejected');
create type discount_type as enum ('percentage','fixed');
create type ambassador_commission_type as enum ('none','percentage','fixed');

alter table organizations add column status organization_status not null default 'draft';
alter table organizations add column description text;
alter table organizations add column logo_url text;
alter table organizations add column support_email text;
alter table organizations add column contact_name text;
alter table organizations add column contact_phone text;
alter table organizations add column website_url text;
alter table events add column category text;

create table organization_activation_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references organizations(id) on delete cascade,
  requested_by text not null references "user"(id),
  status activation_request_status not null default 'pending',
  note text,
  reviewed_by text references "user"(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table discount_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  code text not null,
  internal_name text not null,
  type discount_type not null,
  value numeric(12,2) not null check (value >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  max_redemptions integer check (max_redemptions is null or max_redemptions > 0),
  max_per_buyer integer not null default 1 check (max_per_buyer > 0),
  is_active boolean not null default true,
  created_by text not null references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, code)
);

create table ambassadors (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  name text not null,
  email text,
  code text not null,
  commission_type ambassador_commission_type not null default 'none',
  commission_value numeric(12,2) not null default 0 check (commission_value >= 0),
  is_active boolean not null default true,
  created_by text not null references "user"(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(event_id, code)
);

create table discount_code_redemptions (
  id uuid primary key default gen_random_uuid(),
  discount_code_id uuid not null references discount_codes(id),
  order_id uuid not null unique references orders(id),
  buyer_id text not null references "user"(id),
  discount_amount numeric(12,2) not null check (discount_amount >= 0),
  created_at timestamptz not null default now()
);

create table ambassador_attributions (
  id uuid primary key default gen_random_uuid(),
  ambassador_id uuid not null references ambassadors(id),
  order_id uuid not null unique references orders(id),
  commission_amount numeric(12,2) not null default 0 check (commission_amount >= 0),
  settled_at timestamptz,
  created_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete set null,
  actor_user_id text references "user"(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  before jsonb not null default '{}'::jsonb,
  after jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index discount_codes_event_idx on discount_codes(event_id);
create index ambassadors_event_idx on ambassadors(event_id);
create index discount_redemptions_code_buyer_idx on discount_code_redemptions(discount_code_id,buyer_id);
create index ambassador_attributions_ambassador_idx on ambassador_attributions(ambassador_id);
create index audit_log_org_created_idx on audit_log(organization_id,created_at);
create index audit_log_entity_idx on audit_log(entity_type,entity_id);
