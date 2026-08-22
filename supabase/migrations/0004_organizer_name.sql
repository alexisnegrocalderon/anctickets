-- ANC Tickets — nombre de la productora, configurado la primera vez que el
-- productor entra al dashboard (ver /onboarding).

alter table public.profiles add column if not exists organizer_name text;
