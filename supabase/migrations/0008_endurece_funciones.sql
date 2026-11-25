-- 0008_endurece_funciones.sql
-- Endurecimiento de funciones definidas en 0007 y 0001.
-- Idempotente: se puede ejecutar varias veces sin efectos adicionales.

-- 1. Fija un search_path explícito en las funciones de seguridad para evitar
--    que un search_path manipulado altere la resolución de objetos.
--    (is_privileged ya llama a auth.role() con el esquema calificado.)
alter function public.is_privileged()        set search_path = public, pg_temp;
alter function public.guard_ticket_types()   set search_path = public, pg_temp;
alter function public.guard_tickets()        set search_path = public, pg_temp;
alter function public.guard_profiles()       set search_path = public, pg_temp;
alter function public.guard_event_delete()   set search_path = public, pg_temp;

-- 2. handle_new_user es una función de trigger: no debe poder invocarse
--    mediante RPC desde la API (PostgREST).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
