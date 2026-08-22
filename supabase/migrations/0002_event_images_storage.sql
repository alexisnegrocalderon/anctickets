-- ANC Tickets — bucket de Storage para imágenes de eventos
-- Ejecutar en el SQL editor de Supabase (o via supabase db push)

insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true)
on conflict (id) do nothing;

-- Convención de path: {organizer_id}/{event_id}/{filename} — así las políticas
-- pueden verificar dueño sin tocar la tabla events.

create policy "event-images: public read"
  on storage.objects for select
  using (bucket_id = 'event-images');

create policy "event-images: organizer upload own"
  on storage.objects for insert
  with check (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "event-images: organizer update own"
  on storage.objects for update
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "event-images: organizer delete own"
  on storage.objects for delete
  using (
    bucket_id = 'event-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
