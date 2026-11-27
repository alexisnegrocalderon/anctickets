-- 0015_reacciones.sql
-- Reacciones con emoji en la Cartelera (/eventos): 🔥 🙌 😍 🎉.
--  - Una reacción por persona, evento y emoji (clave primaria).
--  - El emoji se guarda por clave de texto (fuego, manos, amor, fiesta), no por el carácter.
--  - RLS: cada persona solo ve, crea y borra LAS SUYAS (user_id = auth.uid()), y
--    solo en eventos publicados. Nadie puede ver quién más reaccionó.
--  - Los conteos públicos salen de event_reaction_counts(): solo totales por
--    evento y emoji de eventos publicados, nunca la lista de personas.
-- Idempotente.

create table if not exists public.event_reactions (
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null check (emoji in ('fuego', 'manos', 'amor', 'fiesta')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id, emoji)
);

create index if not exists idx_event_reactions_user on public.event_reactions (user_id);

alter table public.event_reactions enable row level security;

revoke all on table public.event_reactions from public, anon, authenticated;
grant select, insert, delete on table public.event_reactions to authenticated;
grant all on table public.event_reactions to service_role;

drop policy if exists "event_reactions: ver las propias" on public.event_reactions;
create policy "event_reactions: ver las propias" on public.event_reactions
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "event_reactions: crear las propias en eventos publicados" on public.event_reactions;
create policy "event_reactions: crear las propias en eventos publicados" on public.event_reactions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.events e where e.id = event_id and e.status = 'published')
  );

drop policy if exists "event_reactions: borrar las propias" on public.event_reactions;
create policy "event_reactions: borrar las propias" on public.event_reactions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Totales por evento y emoji (solo eventos publicados). Sin user_id.
create or replace function public.event_reaction_counts(p_event_ids uuid[])
returns table (event_id uuid, emoji text, total integer)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select r.event_id, r.emoji, count(*)::integer as total
  from public.event_reactions r
  join public.events e on e.id = r.event_id and e.status = 'published'
  where r.event_id = any (p_event_ids)
  group by r.event_id, r.emoji;
$$;

revoke all on function public.event_reaction_counts(uuid[]) from public;
grant execute on function public.event_reaction_counts(uuid[]) to anon, authenticated, service_role;
