-- Run only after 0000_anc_tickets_foundation.sql is present.
create or replace function reserve_ticket_inventory(p_buyer_id text, p_event_id uuid, p_items jsonb, p_expires_at timestamptz)
returns uuid language plpgsql security definer set search_path = public as $reservation$
declare
  v_reservation_id uuid := gen_random_uuid();
  v_item record;
  v_type ticket_types%rowtype;
begin
  if p_expires_at <= now() then raise exception 'reservation_expiry_must_be_future'; end if;
  insert into reservations (id, buyer_id, event_id, expires_at) values (v_reservation_id, p_buyer_id, p_event_id, p_expires_at);
  for v_item in select * from jsonb_to_recordset(p_items) as x(ticket_type_id uuid, quantity integer) loop
    if v_item.quantity is null or v_item.quantity <= 0 then raise exception 'invalid_ticket_quantity'; end if;
    select * into v_type from ticket_types where id = v_item.ticket_type_id and event_id = p_event_id for update;
    if not found or v_type.capacity - v_type.sold_count - v_type.reserved_count < v_item.quantity then raise exception 'insufficient_inventory'; end if;
    update ticket_types set reserved_count = reserved_count + v_item.quantity, updated_at = now() where id = v_type.id;
    insert into reservation_items (reservation_id, ticket_type_id, quantity, unit_base_price) values (v_reservation_id, v_type.id, v_item.quantity, v_type.base_price);
  end loop;
  return v_reservation_id;
end; $reservation$;

create or replace function validate_ticket_checkin(p_qr_code uuid, p_event_id uuid, p_staff_user_id text)
returns table(result text, ticket_id uuid) language plpgsql security definer set search_path = public as $checkin$
declare v_ticket tickets%rowtype;
begin
  if not exists (select 1 from event_staff where event_id = p_event_id and user_id = p_staff_user_id and can_scan and revoked_at is null) then raise exception 'staff_not_authorized'; end if;
  select t.* into v_ticket from tickets t join orders o on o.id = t.order_id where t.qr_code = p_qr_code and o.event_id = p_event_id for update;
  if not found then return query select 'not_found'::text, null::uuid; return; end if;
  if v_ticket.status <> 'valid' then
    insert into ticket_checkins(ticket_id,event_id,staff_user_id,result) values(v_ticket.id,p_event_id,p_staff_user_id,'already_used');
    return query select 'already_used'::text,v_ticket.id;
    return;
  end if;
  update tickets set status = 'used', used_at = now() where id = v_ticket.id;
  insert into ticket_checkins(ticket_id,event_id,staff_user_id,result) values(v_ticket.id,p_event_id,p_staff_user_id,'accepted');
  return query select 'accepted'::text,v_ticket.id;
end; $checkin$;
