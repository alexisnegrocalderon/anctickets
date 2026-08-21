-- Requires 0000 through 0002. Validate each function in a temporary branch before promotion.
create or replace function create_checkout_order(
  p_buyer_id text,
  p_event_id uuid,
  p_items jsonb,
  p_total_amount numeric,
  p_service_fee_amount numeric,
  p_mp_fee_amount numeric,
  p_anc_fee_amount numeric,
  p_buyer_email text,
  p_expires_at timestamptz
) returns table(order_id uuid, reservation_id uuid)
language plpgsql security definer set search_path = public as $checkout$
declare v_reservation_id uuid; v_order_id uuid := gen_random_uuid();
begin
  v_reservation_id := reserve_ticket_inventory(p_buyer_id, p_event_id, p_items, p_expires_at);
  insert into orders (id,buyer_id,event_id,reservation_id,total_amount,service_fee_amount,mp_fee_amount,anc_fee_amount,buyer_email,status)
  values (v_order_id,p_buyer_id,p_event_id,v_reservation_id,p_total_amount,p_service_fee_amount,p_mp_fee_amount,p_anc_fee_amount,p_buyer_email,'pending');
  insert into order_items (order_id,ticket_type_id,quantity,unit_base_price)
  select v_order_id,ri.ticket_type_id,ri.quantity,ri.unit_base_price from reservation_items ri where ri.reservation_id = v_reservation_id;
  return query select v_order_id,v_reservation_id;
end; $checkout$;

create or replace function cancel_checkout_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $cancel$
declare v_order orders%rowtype; v_item reservation_items%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found or v_order.status <> 'pending' then return; end if;
  for v_item in select * from reservation_items where reservation_id = v_order.reservation_id loop
    update ticket_types set reserved_count = reserved_count - v_item.quantity, updated_at = now()
      where id = v_item.ticket_type_id and reserved_count >= v_item.quantity;
  end loop;
  update reservations set status = 'cancelled', updated_at = now() where id = v_order.reservation_id and status = 'active';
  update orders set status = 'cancelled', updated_at = now() where id = p_order_id;
end; $cancel$;

create or replace function finalize_paid_order(p_order_id uuid, p_payment_id text)
returns table(ticket_id uuid, ticket_type_id uuid, qr_code uuid)
language plpgsql security definer set search_path = public as $finalize$
declare v_order orders%rowtype; v_item order_items%rowtype; v_ticket_type ticket_types%rowtype;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_order.status = 'approved' then return; end if;
  if v_order.status <> 'pending' then raise exception 'order_not_pending'; end if;
  for v_item in select * from order_items where order_id = p_order_id loop
    update ticket_types set reserved_count = reserved_count - v_item.quantity, sold_count = sold_count + v_item.quantity, updated_at = now()
      where id = v_item.ticket_type_id and reserved_count >= v_item.quantity
      returning * into v_ticket_type;
    if not found then raise exception 'reserved_inventory_missing'; end if;
    insert into tickets (order_id,ticket_type_id) select p_order_id,v_item.ticket_type_id from generate_series(1,v_item.quantity);
  end loop;
  update reservations set status = 'converted', updated_at = now() where id = v_order.reservation_id and status = 'active';
  update orders set status = 'approved', mp_payment_id = p_payment_id, updated_at = now() where id = p_order_id;
  return query select t.id,t.ticket_type_id,t.qr_code from tickets t where t.order_id = p_order_id;
end; $finalize$;
