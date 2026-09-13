-- ANC Tickets — marca propia del productor: logo y color personalizado para
-- su página pública, además de los 4 moods curados que ya existían.

alter table public.events
  add column if not exists organizer_logo_url text;

alter table public.events
  add column if not exists accent_color text
    check (accent_color is null or accent_color ~ '^#[0-9a-fA-F]{6}$');

-- 'custom' habilita accent_color como la fuente de verdad del color de la
-- página en vez de uno de los 4 moods curados.
alter table public.events drop constraint if exists events_theme_check;
alter table public.events add constraint events_theme_check
  check (theme in ('magenta', 'yellow', 'turquoise', 'charcoal', 'custom'));
