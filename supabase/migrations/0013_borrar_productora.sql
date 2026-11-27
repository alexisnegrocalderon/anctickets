-- 0013_borrar_productora.sql
-- Panel de administración: "Eliminar productora" (borra la productora Y su cuenta de
-- acceso de Auth, con todo lo que cuelga). Acción DESTRUCTIVA e irreversible.
-- NO aplicada: el dueño la prueba con rollback y la ejecuta. Idempotente.
--
-- Funciones nuevas (SECURITY DEFINER, search_path fijo, GRANT solo a service_role,
-- guarda por auth.role() igual que el resto de funciones admin_* de 0010):
--   admin_organizer_delete_preview(p_organizer_id, p_protected_emails) -> jsonb (solo lectura)
--   admin_delete_organizer(p_organizer_id, p_confirm, p_admin_email, p_protected_emails) -> jsonb
-- y un ayudante interno de enmascarado de correo.
--
-- ---------------------------------------------------------------------------
-- REVISIÓN DE LLAVES FORÁNEAS (migraciones 0001 a 0012 del directorio)
-- ---------------------------------------------------------------------------
--  auth.users
--    <- profiles.id                    ON DELETE CASCADE
--    <- event_staff.user_id            SET NULL   (personal de puerta: la fila del OTRO evento se conserva)
--    <- tickets.checked_in_by          SET NULL
--    <- check_ins.scanned_by           SET NULL
--  profiles
--    <- mp_accounts.organizer_id       CASCADE    (se borra la fila guardada; NO se llama a Mercado Pago)
--    <- events.organizer_id            CASCADE
--    <- orders.buyer_id                CASCADE    (compras de la persona COMO comprador)
--    <- ambassadors.organizer_id       CASCADE
--  events
--    <- ticket_types.event_id          CASCADE
--    <- orders.event_id                CASCADE
--    <- discount_codes.event_id        CASCADE
--    <- ambassadors.event_id           CASCADE
--    <- event_staff.event_id           CASCADE
--    <- tickets.event_id               CASCADE
--    <- check_ins.event_id             CASCADE
--  orders
--    <- order_items.order_id           CASCADE
--    <- tickets.order_id               CASCADE
--  tickets
--    <- check_ins.ticket_id            CASCADE
--  ticket_types
--    <- order_items.ticket_type_id     SIN CASCADE (NO ACTION)   <-- LA ÚNICA SIN CASCADE
--    <- tickets.ticket_type_id         CASCADE
--  discount_codes <- orders.discount_code_id   SET NULL
--  ambassadors    <- orders.ambassador_id      SET NULL
--  admin_audit y system_status no tienen llaves foráneas (target_id es texto), así
--  que la fila de auditoría sobrevive al borrado.
--
-- order_items.ticket_type_id (0001) no tiene ON DELETE: el borrado en cascada de
-- events -> ticket_types solo prospera porque las order_items caen antes por
-- orders; con NO ACTION la comprobación se hace al final de la sentencia, pero
-- depender de ese orden implícito es frágil. Por eso admin_delete_organizer borra
-- EXPLÍCITAMENTE y en orden: check_ins -> tickets -> order_items -> orders ->
-- events (que arrastra ticket_types, códigos, embajadores del evento y staff) ->
-- auth.users (que arrastra profiles, mp_accounts y embajadores restantes).
-- Ninguna tabla queda con filas huérfanas.
--
-- guard_event_delete (0007) corta el borrado de un evento solo si alguna orden
-- suya está approved / refunded / charged_back. La regla 1 ya excluyó esos casos
-- antes de borrar, y las órdenes que sí se borran son pending vencidas, expired,
-- rejected o cancelled: el trigger no estorba.
--
-- Pendientes vencidas: antes de revalidar se llama a expire_stale_orders() (la
-- misma función que usa create_pending_order) para que la reserva de cupo
-- (reserved_count) y el uso de códigos de descuento se liberen en vez de
-- desaparecer con la orden; sobre todo para las compras que la persona hizo como
-- compradora en eventos de OTRAS productoras, que sí siguen vivos.
--
-- Carreras con una compra que entra a la vez: create_pending_order inserta en
-- orders (FK a events y profiles => bloqueo FOR KEY SHARE de esas filas). Esta
-- función toma FOR UPDATE sobre el perfil y sobre TODOS los eventos del
-- organizador y revalida DESPUÉS: una compra en vuelo o bien se confirmó antes
-- (y la revalidación la ve y bloquea) o bien espera y luego falla por FK porque
-- el evento ya no existe. Ninguna orden nueva puede crearse a mitad del borrado.

-- =========================================================
-- a) Ayudante: enmascarar un correo (3 primeras letras + *** + dominio)
-- =========================================================
create or replace function public._admin_mask_email(p_email text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_email is null or btrim(p_email) = '' or position('@' in p_email) = 0 then null
    else left(split_part(btrim(p_email), '@', 1), 3) || '***@' ||
         substr(btrim(p_email), position('@' in btrim(p_email)) + 1)
  end;
$$;

-- =========================================================
-- b) Vista previa (solo lectura)
-- =========================================================
-- Devuelve:
--   existe, nombre, correo_enmascarado, puede_borrar, bloqueos (array de claves:
--   'no_existe','cuenta_protegida','con_ventas','con_ventas_como_comprador',
--   'compras_pendientes'), conteos { eventos, tandas, codigos, embajadores, staff,
--   ordenes_vencidas, tiene_mp, entradas, ventas, ventas_comprador, pendientes,
--   pendientes_vence_en }.
-- Una orden pending con reserved_until nulo se trata como VIGENTE (bloquea): es
-- el caso más seguro. Las pending con reserved_until pasado no bloquean.
create or replace function public.admin_organizer_delete_preview(
  p_organizer_id uuid,
  p_protected_emails text[]
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_email text;
  v_auth_email text;
  v_bloqueos text[] := '{}';
  v_prot text[];
  v_events uuid[];
  v_ventas bigint;
  v_ventas_comp bigint;
  v_pend bigint;
  v_pend_vence timestamptz;
  v_tandas bigint;
  v_codigos bigint;
  v_embaj bigint;
  v_staff bigint;
  v_ordenes bigint;
  v_entradas bigint := 0;
  v_mp boolean;
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'FORBIDDEN';
  end if;

  select p.organizer_name, p.email into v_name, v_email
  from public.profiles p where p.id = p_organizer_id;

  if not found then
    return jsonb_build_object(
      'existe', false, 'nombre', null, 'correo_enmascarado', null,
      'puede_borrar', false, 'bloqueos', jsonb_build_array('no_existe'),
      'conteos', '{}'::jsonb
    );
  end if;

  select u.email into v_auth_email from auth.users u where u.id = p_organizer_id;

  select coalesce(array_agg(lower(btrim(x))), '{}') into v_prot
  from unnest(coalesce(p_protected_emails, '{}')) x where btrim(coalesce(x, '')) <> '';

  select coalesce(array_agg(e.id), '{}') into v_events
  from public.events e where e.organizer_id = p_organizer_id;

  if lower(btrim(coalesce(v_email, ''))) = any (v_prot)
     or lower(btrim(coalesce(v_auth_email, ''))) = any (v_prot) then
    v_bloqueos := v_bloqueos || 'cuenta_protegida';
  end if;

  select count(*) into v_ventas
  from public.orders o
  where o.event_id = any (v_events) and o.status in ('approved', 'refunded', 'charged_back');
  if v_ventas > 0 then v_bloqueos := v_bloqueos || 'con_ventas'; end if;

  select count(*) into v_ventas_comp
  from public.orders o
  where o.buyer_id = p_organizer_id and o.status in ('approved', 'refunded', 'charged_back');
  if v_ventas_comp > 0 then v_bloqueos := v_bloqueos || 'con_ventas_como_comprador'; end if;

  select count(*), max(o.reserved_until) into v_pend, v_pend_vence
  from public.orders o
  where (o.event_id = any (v_events) or o.buyer_id = p_organizer_id)
    and o.status = 'pending'
    and (o.reserved_until is null or o.reserved_until > now());
  if v_pend > 0 then v_bloqueos := v_bloqueos || 'compras_pendientes'; end if;

  select count(*) into v_tandas from public.ticket_types t where t.event_id = any (v_events);
  select count(*) into v_codigos from public.discount_codes c where c.event_id = any (v_events);
  select count(*) into v_embaj from public.ambassadors a where a.organizer_id = p_organizer_id;
  select count(*) into v_staff from public.event_staff s where s.event_id = any (v_events);
  select count(*) into v_ordenes
  from public.orders o
  where o.event_id = any (v_events) or o.buyer_id = p_organizer_id;
  v_mp := exists (select 1 from public.mp_accounts m where m.organizer_id = p_organizer_id)
          or exists (select 1 from public.profiles p where p.id = p_organizer_id and p.mp_connected);

  -- Entradas emitidas: solo tiene sentido contarlas si NO hay bloqueo de ventas (0 en ese caso).
  if v_ventas = 0 and v_ventas_comp = 0 then
    select count(*) into v_entradas from public.tickets t
    where t.event_id = any (v_events) and t.status <> 'cancelled';
  end if;

  return jsonb_build_object(
    'existe', true,
    'nombre', v_name,
    'correo_enmascarado', public._admin_mask_email(coalesce(v_email, v_auth_email)),
    'puede_borrar', cardinality(v_bloqueos) = 0,
    'bloqueos', to_jsonb(v_bloqueos),
    'conteos', jsonb_build_object(
      'eventos', cardinality(v_events),
      'tandas', v_tandas,
      'codigos', v_codigos,
      'embajadores', v_embaj,
      'staff', v_staff,
      'ordenes_vencidas', v_ordenes,
      'tiene_mp', v_mp,
      'entradas', v_entradas,
      'ventas', v_ventas,
      'ventas_comprador', v_ventas_comp,
      'pendientes', v_pend,
      'pendientes_vence_en', v_pend_vence
    )
  );
end;
$$;

-- =========================================================
-- c) Borrado (atómico)
-- =========================================================
-- Excepciones con nombre estable: FORBIDDEN, ADMIN_EMAIL_REQUIRED, ORGANIZER_NOT_FOUND,
-- PROTECTED_ACCOUNT, HAS_SALES, HAS_PENDING_ORDERS, CONFIRMATION_MISMATCH.
-- Si cualquier paso falla, la transacción entera se revierte (nada queda a medias).
create or replace function public.admin_delete_organizer(
  p_organizer_id uuid,
  p_confirm text,
  p_admin_email text,
  p_protected_emails text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_admin text := lower(btrim(coalesce(p_admin_email, '')));
  v_name text;
  v_email text;
  v_auth_email text;
  v_mp boolean;
  v_prot text[];
  v_events uuid[];
  v_expected text;
  v_tandas bigint;
  v_codigos bigint;
  v_embaj bigint;
  v_staff bigint;
  v_ordenes bigint;
  v_orders uuid[];
  v_n bigint;
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    raise exception 'FORBIDDEN';
  end if;
  if v_admin = '' then
    raise exception 'ADMIN_EMAIL_REQUIRED';
  end if;

  -- 1) Bloqueo del perfil (evita dos borrados a la vez y compras como comprador en curso).
  select p.organizer_name, p.email, p.mp_connected into v_name, v_email, v_mp
  from public.profiles p
  where p.id = p_organizer_id
  for update;
  if not found then
    raise exception 'ORGANIZER_NOT_FOUND';
  end if;

  -- 2) Bloqueo de TODOS los eventos del organizador: create_pending_order inserta en
  --    orders (FK a events), así que ninguna orden nueva puede crearse mientras dure esto.
  select coalesce(array_agg(x.id), '{}') into v_events from (
    select e.id from public.events e where e.organizer_id = p_organizer_id order by e.id for update
  ) x;

  -- 3) Libera reservas y usos de código de las pendientes vencidas (pasan a 'expired').
  perform public.expire_stale_orders();

  -- 4) Revalida las reglas 1 a 3 DESPUÉS del bloqueo.
  select u.email into v_auth_email from auth.users u where u.id = p_organizer_id;
  select coalesce(array_agg(lower(btrim(x))), '{}') into v_prot
  from unnest(coalesce(p_protected_emails, '{}')) x where btrim(coalesce(x, '')) <> '';

  if lower(btrim(coalesce(v_email, ''))) = any (v_prot)
     or lower(btrim(coalesce(v_auth_email, ''))) = any (v_prot)
     or lower(btrim(coalesce(v_email, ''))) = v_admin
     or lower(btrim(coalesce(v_auth_email, ''))) = v_admin then
    raise exception 'PROTECTED_ACCOUNT';
  end if;

  if exists (
    select 1 from public.orders o
    where (o.event_id = any (v_events) or o.buyer_id = p_organizer_id)
      and o.status in ('approved', 'refunded', 'charged_back')
  ) then
    raise exception 'HAS_SALES';
  end if;

  if exists (
    select 1 from public.orders o
    where (o.event_id = any (v_events) or o.buyer_id = p_organizer_id)
      and o.status = 'pending'
      and (o.reserved_until is null or o.reserved_until > now())
  ) then
    raise exception 'HAS_PENDING_ORDERS';
  end if;

  -- 5) Confirmación: nombre exacto (o el correo completo si no tiene nombre), tras
  --    recortar espacios y normalizar Unicode (tildes compuestas/descompuestas).
  v_expected := coalesce(nullif(btrim(v_name), ''), nullif(btrim(coalesce(v_email, v_auth_email)), ''));
  if v_expected is null
     or normalize(btrim(coalesce(p_confirm, '')), NFC) is distinct from normalize(v_expected, NFC) then
    raise exception 'CONFIRMATION_MISMATCH';
  end if;

  -- 6) Conteos para la auditoría y para la respuesta.
  select count(*) into v_tandas from public.ticket_types t where t.event_id = any (v_events);
  select count(*) into v_codigos from public.discount_codes c where c.event_id = any (v_events);
  select count(*) into v_embaj from public.ambassadors a where a.organizer_id = p_organizer_id;
  select count(*) into v_staff from public.event_staff s where s.event_id = any (v_events);
  select coalesce(array_agg(o.id), '{}') into v_orders
  from public.orders o
  where o.event_id = any (v_events) or o.buyer_id = p_organizer_id;
  v_ordenes := cardinality(v_orders);
  v_mp := coalesce(v_mp, false)
          or exists (select 1 from public.mp_accounts m where m.organizer_id = p_organizer_id);

  -- 7) Auditoría (misma transacción). Sin correo completo ni datos de compradores.
  insert into public.admin_audit (admin_email, action, target_type, target_id, detail)
  values (
    v_admin, 'organizer.delete', 'organizer', p_organizer_id::text,
    jsonb_build_object(
      'nombre', v_name,
      'correo_enmascarado', public._admin_mask_email(coalesce(v_email, v_auth_email)),
      'eventos', cardinality(v_events),
      'tandas', v_tandas,
      'codigos', v_codigos,
      'embajadores', v_embaj,
      'staff', v_staff,
      'ordenes_borradas', v_ordenes,
      'tenia_mercado_pago', v_mp,
      'admin_email', v_admin
    )
  );

  -- 8) Borrados explícitos, en orden (ver la nota de llaves foráneas arriba).
  delete from public.check_ins ci where ci.event_id = any (v_events);
  delete from public.tickets t where t.event_id = any (v_events) or t.order_id = any (v_orders);
  delete from public.order_items oi where oi.order_id = any (v_orders);
  delete from public.orders o where o.id = any (v_orders);
  delete from public.events e where e.id = any (v_events);   -- guard_event_delete: sin ventas, no corta

  -- 9) La cuenta de acceso: el cascade borra profiles, mp_accounts y embajadores.
  delete from auth.users u where u.id = p_organizer_id;
  get diagnostics v_n = row_count;
  if v_n <> 1 then
    raise exception 'ORGANIZER_NOT_FOUND';   -- revierte todo lo anterior
  end if;

  return jsonb_build_object(
    'borrada', true,
    'nombre', v_name,
    'eventos', cardinality(v_events),
    'tandas', v_tandas,
    'codigos', v_codigos,
    'embajadores', v_embaj,
    'staff', v_staff,
    'ordenes_borradas', v_ordenes,
    'tenia_mercado_pago', v_mp
  );
end;
$$;

-- Privilegios: solo service_role (el servidor de Next.js, tras requireAdmin()).
revoke execute on function public._admin_mask_email(text) from public, anon, authenticated;
revoke execute on function public.admin_organizer_delete_preview(uuid, text[]) from public, anon, authenticated;
revoke execute on function public.admin_delete_organizer(uuid, text, text, text[]) from public, anon, authenticated;
grant execute on function public._admin_mask_email(text) to service_role;
grant execute on function public.admin_organizer_delete_preview(uuid, text[]) to service_role;
grant execute on function public.admin_delete_organizer(uuid, text, text, text[]) to service_role;

-- =========================================================
-- d) Verificación (ejecutar a mano; CADA bloque dentro de begin ... rollback)
-- =========================================================
-- Reemplaza los valores ficticios. Se usan estos ids de prueba (créalos dentro de la
-- transacción; auth.users necesita al menos id, aud, role, email):
--   ORG  = '00000000-0000-4000-8000-0000000000a1'   productora de prueba "Prueba Borrar"
--   BUY  = '00000000-0000-4000-8000-0000000000b1'   comprador ficticio
-- Preparación común (pégala al inicio de cada bloque, después del begin):
--   insert into auth.users (id, aud, role, email) values
--     ('00000000-0000-4000-8000-0000000000a1','authenticated','authenticated','prueba.borrar@example.com'),
--     ('00000000-0000-4000-8000-0000000000b1','authenticated','authenticated','comprador.prueba@example.com');
--   -- si tienes un trigger que crea el perfil, quita estos dos inserts de profiles
--   insert into public.profiles (id, email, organizer_name) values
--     ('00000000-0000-4000-8000-0000000000a1','prueba.borrar@example.com','Prueba Borrar')
--     on conflict (id) do update set organizer_name = 'Prueba Borrar';
--   insert into public.profiles (id, email) values
--     ('00000000-0000-4000-8000-0000000000b1','comprador.prueba@example.com')
--     on conflict (id) do nothing;
--   insert into public.events (id, organizer_id, title, slug, event_date, status) values
--     ('00000000-0000-4000-8000-0000000000e1','00000000-0000-4000-8000-0000000000a1','Evento Prueba','evento-prueba-borrar', now() + interval '10 days','published');
--   insert into public.ticket_types (id, event_id, name, base_price, quantity) values
--     ('00000000-0000-4000-8000-0000000000f1','00000000-0000-4000-8000-0000000000e1','General',1000,10);
--   insert into public.discount_codes (event_id, code, kind, value) values
--     ('00000000-0000-4000-8000-0000000000e1','PRUEBA10','percent',10);
--   insert into public.ambassadors (organizer_id, name, code) values
--     ('00000000-0000-4000-8000-0000000000a1','Embajadora Prueba','EMBPRUEBA');
--   insert into public.event_staff (event_id, email) values
--     ('00000000-0000-4000-8000-0000000000e1','puerta.prueba@example.com');
--   (ajusta columnas obligatorias si tu esquema pide otras: revisa \d de cada tabla)
-- Orden de prueba (cambia status según el caso):
--   insert into public.orders (id, buyer_id, event_id, total_amount, status, buyer_email, kind, reserved_until) values
--     ('00000000-0000-4000-8000-0000000000c1','00000000-0000-4000-8000-0000000000b1',
--      '00000000-0000-4000-8000-0000000000e1', 1000, '<STATUS>', 'comprador.prueba@example.com', 'sale', <RESERVED_UNTIL>);
--   insert into public.order_items (order_id, ticket_type_id, quantity, unit_base_price) values
--     ('00000000-0000-4000-8000-0000000000c1','00000000-0000-4000-8000-0000000000f1',1,1000);
--
-- 1) Bloqueo por venta aprobada (repetir con <STATUS> = 'refunded' y con 'charged_back'):
--   begin;  -- preparación común + orden con <STATUS>='approved', reserved_until null
--   select public.admin_organizer_delete_preview('00000000-0000-4000-8000-0000000000a1', array['admin@example.com']);
--   -- esperado: puede_borrar=false, bloqueos ["con_ventas"]
--   select public.admin_delete_organizer('00000000-0000-4000-8000-0000000000a1','Prueba Borrar','admin@example.com', array['admin@example.com']);
--   -- esperado: ERROR HAS_SALES
--   rollback;
--
-- 2) Bloqueo por venta COMO COMPRADOR (la productora compró en el evento de otra):
--   begin;  -- preparación común, pero la orden con <STATUS>='approved' y buyer_id = ORG (a1)
--   --        sobre el evento e1 de OTRA productora (crea una segunda productora y su evento)
--   select public.admin_organizer_delete_preview('00000000-0000-4000-8000-0000000000a1', '{}');
--   -- esperado: bloqueos ["con_ventas_como_comprador"]
--   select public.admin_delete_organizer('00000000-0000-4000-8000-0000000000a1','Prueba Borrar','admin@example.com','{}');
--   -- esperado: ERROR HAS_SALES
--   rollback;
--
-- 3) Bloqueo por pendiente vigente (y una vencida NO bloquea):
--   begin;  -- preparación común + orden status='pending', reserved_until = now() + interval '10 minutes'
--   select public.admin_organizer_delete_preview('00000000-0000-4000-8000-0000000000a1', '{}');
--   -- esperado: bloqueos ["compras_pendientes"], pendientes_vence_en con la hora
--   select public.admin_delete_organizer('00000000-0000-4000-8000-0000000000a1','Prueba Borrar','admin@example.com','{}');
--   -- esperado: ERROR HAS_PENDING_ORDERS
--   rollback;
--   begin;  -- igual pero reserved_until = now() - interval '5 minutes'
--   select public.admin_organizer_delete_preview('00000000-0000-4000-8000-0000000000a1', '{}');
--   -- esperado: puede_borrar=true (la vencida no bloquea)
--   rollback;
--
-- 4) Bloqueo por cuenta protegida (correo en minúsculas / mayúsculas) y por ser el propio admin:
--   begin;  -- preparación común, sin órdenes
--   select public.admin_organizer_delete_preview('00000000-0000-4000-8000-0000000000a1', array['PRUEBA.borrar@example.com']);
--   -- esperado: bloqueos ["cuenta_protegida"]
--   select public.admin_delete_organizer('00000000-0000-4000-8000-0000000000a1','Prueba Borrar','otro@example.com', array['prueba.borrar@example.com']);
--   -- esperado: ERROR PROTECTED_ACCOUNT
--   rollback;
--   begin;  -- preparación común
--   select public.admin_delete_organizer('00000000-0000-4000-8000-0000000000a1','Prueba Borrar','prueba.borrar@example.com','{}');
--   -- esperado: ERROR PROTECTED_ACCOUNT (el admin no puede borrarse a sí mismo)
--   rollback;
--
-- 5) Confirmación errónea (también: vacía, otra capitalización, nombre con tilde distinta):
--   begin;  -- preparación común, sin órdenes
--   select public.admin_delete_organizer('00000000-0000-4000-8000-0000000000a1','prueba borrar','admin@example.com','{}');
--   -- esperado: ERROR CONFIRMATION_MISMATCH
--   select count(*) from public.profiles where id = '00000000-0000-4000-8000-0000000000a1';  -- (en transacción abortada: haz rollback y repite) esperado 1
--   rollback;
--
-- 6) Borrado exitoso (con eventos, tandas, códigos, embajadores, staff y órdenes vencidas):
--   begin;  -- preparación común + 1 orden status='pending' vencida (reserved_until = now() - interval '1 hour')
--           -- + 1 orden status='expired' y 1 'rejected'
--   select public.admin_organizer_delete_preview('00000000-0000-4000-8000-0000000000a1', array['admin@example.com']);
--   -- esperado: puede_borrar=true, conteos eventos=1, tandas=1, codigos=1, embajadores=1, staff=1, ordenes_vencidas=3
--   select public.admin_delete_organizer('00000000-0000-4000-8000-0000000000a1','  Prueba Borrar  ','admin@example.com', array['admin@example.com']);
--   -- esperado: {"borrada": true, "nombre": "Prueba Borrar", "eventos": 1, "tandas": 1, ... "ordenes_borradas": 3}
--   select
--     (select count(*) from auth.users        where id = '00000000-0000-4000-8000-0000000000a1') as auth_users,
--     (select count(*) from public.profiles   where id = '00000000-0000-4000-8000-0000000000a1') as profiles,
--     (select count(*) from public.mp_accounts where organizer_id = '00000000-0000-4000-8000-0000000000a1') as mp,
--     (select count(*) from public.events     where organizer_id = '00000000-0000-4000-8000-0000000000a1') as events,
--     (select count(*) from public.ticket_types where event_id = '00000000-0000-4000-8000-0000000000e1') as tandas,
--     (select count(*) from public.discount_codes where event_id = '00000000-0000-4000-8000-0000000000e1') as codigos,
--     (select count(*) from public.ambassadors where organizer_id = '00000000-0000-4000-8000-0000000000a1') as embajadores,
--     (select count(*) from public.event_staff where event_id = '00000000-0000-4000-8000-0000000000e1') as staff,
--     (select count(*) from public.orders where event_id = '00000000-0000-4000-8000-0000000000e1' or buyer_id = '00000000-0000-4000-8000-0000000000a1') as ordenes,
--     (select count(*) from public.order_items where order_id in ('00000000-0000-4000-8000-0000000000c1')) as order_items,
--     (select count(*) from public.tickets where event_id = '00000000-0000-4000-8000-0000000000e1') as tickets,
--     (select count(*) from public.check_ins where event_id = '00000000-0000-4000-8000-0000000000e1') as check_ins;
--   -- esperado: todo 0
--   select count(*) from public.profiles where id = '00000000-0000-4000-8000-0000000000b1';  -- esperado 1 (el comprador de otro perfil no se toca)
--   select action, target_id, detail from public.admin_audit where action = 'organizer.delete' order by created_at desc limit 2;
--   -- esperado: 1 fila; detail con nombre, correo_enmascarado = 'pru***@example.com', conteos,
--   --           tenia_mercado_pago, admin_email; SIN el correo completo ni correos de compradores
--   rollback;
--
-- 7) Una productora autenticada (y anon) no puede ejecutar ni la vista previa ni el borrado:
--   select p.proname,
--          has_function_privilege('anon',         p.oid, 'execute') as anon,
--          has_function_privilege('authenticated', p.oid, 'execute') as auth,
--          has_function_privilege('service_role',  p.oid, 'execute') as service
--     from pg_proc p
--    where p.pronamespace = 'public'::regnamespace
--      and p.proname in ('admin_organizer_delete_preview','admin_delete_organizer','_admin_mask_email');
--   -- esperado: anon = false, auth = false, service = true en las 3 filas
--   begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-0000000000a1","role":"authenticated"}', true);
--   select public.admin_organizer_delete_preview('00000000-0000-4000-8000-0000000000a1', '{}');
--   -- esperado: ERROR permission denied for function admin_organizer_delete_preview
--   select public.admin_delete_organizer('00000000-0000-4000-8000-0000000000a1','Prueba Borrar','x@example.com','{}');
--   -- esperado: ERROR permission denied for function admin_delete_organizer
--   rollback;
--   begin;
--   set local role anon;
--   select public.admin_organizer_delete_preview('00000000-0000-4000-8000-0000000000a1', '{}');   -- esperado: ERROR permission denied
--   select public.admin_delete_organizer('00000000-0000-4000-8000-0000000000a1','Prueba Borrar','x@example.com','{}');  -- idem
--   rollback;
--
-- 8) Compra como comprador en evento ajeno, vencida: se libera el cupo antes de borrar
--    (la orden pending vencida de ORG como compradora en el evento de OTRA productora):
--   begin;  -- preparación + otra productora con evento y tanda (reserved_count = 1) + orden pending vencida de ORG
--   select public.admin_delete_organizer('00000000-0000-4000-8000-0000000000a1','Prueba Borrar','admin@example.com','{}');
--   select reserved_count from public.ticket_types where id = '<TANDA_AJENA>';   -- esperado 0 (se liberó)
--   rollback;
