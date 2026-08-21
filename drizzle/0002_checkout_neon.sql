-- Requires 0000 and 0001. Apply in a temporary branch before production promotion.
create table mp_accounts (
  organization_id uuid primary key references organizations(id) on delete cascade,
  mp_user_id text not null,
  access_token text not null,
  refresh_token text,
  public_key text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
