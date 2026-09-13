-- ANC Tickets — mood/tema visual elegido por el productor en el asistente de creación,
-- usado por la página pública del evento para colorear su tarjeta de acceso.

alter table public.events add column if not exists theme text not null default 'magenta'
  check (theme in ('magenta', 'yellow', 'turquoise', 'charcoal'));
