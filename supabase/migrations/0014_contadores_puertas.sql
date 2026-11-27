-- 0014_contadores_puertas.sql
-- Contadores simples de las puertas de la raíz (/): cuántas veces se vio la
-- pantalla, cuántos tocaron cada puerta y cuántas productoras completaron el
-- alta. Un total por día y por clave: NO se guarda IP, correo, usuario ni nada
-- que identifique a una persona.
-- RLS activo SIN políticas y sin permisos para anon/authenticated: solo el
-- servidor (service_role) suma y lee. Idempotente.

create table if not exists public.entry_metrics (
  day date not null default ((now() at time zone 'America/Santiago')::date),
  metric text not null check (metric in (
    'puertas_vista',
    'puerta_eventos',
    'puerta_productor',
    'productor_crear',
    'productor_ver_como',
    'encabezado_crear',
    'alta_productora'
  )),
  total integer not null default 0 check (total >= 0),
  primary key (day, metric)
);

alter table public.entry_metrics enable row level security;
revoke all on table public.entry_metrics from public, anon, authenticated;
grant select, insert, update on table public.entry_metrics to service_role;

-- Suma 1 a la clave del día (hora de Chile) en una sola sentencia atómica.
create or replace function public.bump_entry_metric(p_metric text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  insert into public.entry_metrics (day, metric, total)
  values ((now() at time zone 'America/Santiago')::date, p_metric, 1)
  on conflict (day, metric) do update set total = public.entry_metrics.total + 1;
$$;

revoke all on function public.bump_entry_metric(text) from public, anon, authenticated;
grant execute on function public.bump_entry_metric(text) to service_role;
