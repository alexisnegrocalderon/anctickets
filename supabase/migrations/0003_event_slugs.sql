-- ANC Tickets — slugs legibles para el link público de cada evento
-- Ejecutar en el SQL editor de Supabase (o via supabase db push)

create extension if not exists unaccent;

alter table public.events add column if not exists slug text;

-- Backfill de eventos existentes: slug a partir del título + sufijo corto del id
-- para garantizar unicidad sin depender de lógica de aplicación.
update public.events
set slug = trim(both '-' from regexp_replace(lower(unaccent(title)), '[^a-z0-9]+', '-', 'g'))
           || '-' || substr(id::text, 1, 8)
where slug is null;

alter table public.events alter column slug set not null;
alter table public.events add constraint events_slug_key unique (slug);

create index if not exists idx_events_slug on public.events (slug);
