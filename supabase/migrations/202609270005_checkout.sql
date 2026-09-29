-- ============================================================
-- 23. CHECKOUT: HOLD -> PAYMENT (XENDIT INVOICE, TEST MODE) -> CONFIRMED
--
-- Clients still have no write grants on any table. Every state change
-- goes through the functions below:
--   create_checkout / cancel_checkout / get_checkout  -> authenticated user
--   attach_payment / apply_payment_event / expire_holds -> service_role only
--     (called by Edge Functions after the Xendit x-callback-token check)
-- Inventory is locked per room type before capacity is checked, so two
-- requests for the last unit serialize and exactly one gets the hold.
-- ============================================================
alter table public.payments add column redirect_url text;

create function public.expire_holds() returns integer
language plpgsql security definer set search_path='' as $$
declare a record; n integer := 0;
begin
  for a in
    select al.id, al.booking_id, al.room_type_id
    from public.inventory_allocations al
    where al.kind='HOLD' and al.released_at is null and al.expires_at <= now()
    order by al.room_type_id, al.id
    for update of al
  loop
    update public.inventory_allocations set released_at=now() where id=a.id;
    update public.payments set status='EXPIRED', expired_at=now(), updated_at=now()
      where booking_id=a.booking_id and status='PENDING';
    update public.bookings
      set status='CANCELLED', cancel_reason='HOLD_EXPIRED', cancelled_at=now()
      where id=a.booking_id and status in ('HELD','PENDING_PAYMENT');
    if found then
      insert into public.booking_events(booking_id,from_status,to_status,reason)
      values (a.booking_id,'HELD','CANCELLED','HOLD_EXPIRED');
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;

create function public.create_checkout(p_plan_id uuid, p_move_in date default null)
returns uuid
language plpgsql security definer set search_path='' as $$
declare
  uid uuid := auth.uid();
  pl public.pricing_plans; rt public.room_types; pr public.properties;
  inv public.room_type_inventory; allocated bigint;
  dp bigint; dep bigint; existing record; bid uuid;
  hold_minutes constant integer := 15;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  select * into pl from public.pricing_plans where id=p_plan_id and is_active;
  if not found then raise exception 'PLAN_UNAVAILABLE'; end if;
  select * into rt from public.room_types where id=pl.room_type_id and is_active;
  if not found or not private.is_public_property(rt.property_id) then
    raise exception 'PLAN_UNAVAILABLE'; end if;
  select * into pr from public.properties where id=rt.property_id;
  if exists (select 1 from public.user_restrictions
             where owner_id=pr.owner_id and user_id=uid
               and status='ACTIVE' and block_booking) then
    raise exception 'BOOKING_RESTRICTED'; end if;
  if pr.owner_id = uid then raise exception 'OWN_PROPERTY'; end if;

  dp := case pl.down_payment_type when 'NONE' then 0 when 'FIXED' then pl.down_payment_value
        else round(pl.price*pl.down_payment_value/100.0)::bigint end;
  dep := case pl.security_deposit_type when 'NONE' then 0 when 'FIXED' then pl.security_deposit_value
        else round(pl.price*pl.security_deposit_value/100.0)::bigint end;
  if dp > pl.price then raise exception 'INVALID_PRICING'; end if;
  if dp + dep <= 0 then raise exception 'NO_UPFRONT_PAYMENT'; end if;

  -- Serialize everything that touches this room type's capacity.
  perform 1 from public.room_type_inventory where room_type_id=rt.id for update;
  perform public.expire_holds();

  select b.id, b.pricing_plan_id into existing
  from public.bookings b join public.inventory_allocations a on a.booking_id=b.id
  where b.user_id=uid and b.room_type_id=rt.id and b.status in ('HELD','PENDING_PAYMENT')
    and a.kind='HOLD' and a.released_at is null and a.expires_at > now();
  if found then
    if existing.pricing_plan_id = pl.id then return existing.id; end if;
    raise exception 'ACTIVE_CHECKOUT_EXISTS';
  end if;

  select * into inv from public.room_type_inventory where room_type_id=rt.id;
  select coalesce(sum(quantity),0) into allocated from public.inventory_allocations
   where room_type_id=rt.id and released_at is null and (kind='RESERVED' or expires_at > now());
  if inv.total is null
     or inv.occupied+inv.cleaning+inv.maintenance+inv.inactive+allocated+1 > inv.total then
    raise exception 'SOLD_OUT'; end if;

  insert into public.bookings(booking_code,user_id,room_type_id,pricing_plan_id,status,
    planned_move_in_date,property_name_snapshot,room_type_name_snapshot,pricing_plan_name_snapshot,
    rent_price_snapshot,down_payment_snapshot,security_deposit_snapshot,pay_now_snapshot,
    remaining_rent_snapshot,deposit_refundable_snapshot,deposit_terms_snapshot)
  values ('KSK-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)),uid,rt.id,pl.id,'HELD',
    p_move_in,pr.name,rt.name,pl.name,pl.price,dp,dep,dp+dep,pl.price-dp,
    pl.deposit_refundable,pl.deposit_terms)
  returning id into bid;
  insert into public.inventory_allocations(booking_id,room_type_id,kind,quantity,expires_at)
  values (bid,rt.id,'HOLD',1,now()+make_interval(mins=>hold_minutes));
  insert into public.booking_events(booking_id,from_status,to_status,actor_id,reason)
  values (bid,'DRAFT','HELD',uid,'CHECKOUT_STARTED');
  return bid;
end $$;

create function public.get_checkout(p_booking_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare b public.bookings; a public.inventory_allocations; p public.payments;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  perform public.expire_holds();
  select * into b from public.bookings where id=p_booking_id and user_id=auth.uid();
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  select * into a from public.inventory_allocations where booking_id=b.id order by created_at desc limit 1;
  select * into p from public.payments where booking_id=b.id order by created_at desc limit 1;
  return jsonb_build_object(
    'booking_id',b.id,'booking_code',b.booking_code,'status',b.status,
    'cancel_reason',b.cancel_reason,'property_name',b.property_name_snapshot,
    'room_type_name',b.room_type_name_snapshot,'plan_name',b.pricing_plan_name_snapshot,
    'rent',b.rent_price_snapshot,'down_payment',b.down_payment_snapshot,
    'security_deposit',b.security_deposit_snapshot,'pay_now',b.pay_now_snapshot,
    'remaining_rent',b.remaining_rent_snapshot,
    'hold_expires_at',case when a.kind='HOLD' and a.released_at is null then a.expires_at end,
    'server_now',now(),
    'payment_status',p.status,'payment_method',p.payment_method,
    'redirect_url',case when p.status='PENDING' then p.redirect_url end);
end $$;

create function public.cancel_checkout(p_booking_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare b public.bookings;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  select * into b from public.bookings where id=p_booking_id and user_id=auth.uid() for update;
  if not found then raise exception 'BOOKING_NOT_FOUND'; end if;
  if b.status = 'CANCELLED' then return; end if;
  if b.status not in ('HELD','PENDING_PAYMENT')
     or exists (select 1 from public.payments where booking_id=b.id and status in ('SUCCESS','REFUND_PENDING','REFUNDED')) then
    raise exception 'CANNOT_CANCEL_HERE'; end if;
  perform 1 from public.room_type_inventory where room_type_id=b.room_type_id for update;
  update public.inventory_allocations set released_at=now() where booking_id=b.id and released_at is null;
  update public.payments set status='CANCELLED', updated_at=now() where booking_id=b.id and status='PENDING';
  update public.bookings set status='CANCELLED', cancel_reason='USER_CANCELLED', cancelled_at=now() where id=b.id;
  insert into public.booking_events(booking_id,from_status,to_status,actor_id,reason)
  values (b.id,b.status,'CANCELLED',auth.uid(),'USER_CANCELLED');
end $$;

-- Idempotent per order_id (= Xendit external_id). Amount always comes from
-- the booking snapshot, never from the provider response.
create function public.attach_payment(
  p_booking_id uuid, p_order_id text, p_redirect_url text, p_provider_transaction_id text default null)
returns uuid
language plpgsql security definer set search_path='' as $$
declare b public.bookings; pid uuid;
begin
  select id into pid from public.payments where order_id=p_order_id;
  if found then return pid; end if;
  select * into b from public.bookings where id=p_booking_id for update;
  if not found or b.status not in ('HELD','PENDING_PAYMENT') then raise exception 'BOOKING_NOT_PAYABLE'; end if;
  if not exists (select 1 from public.inventory_allocations
                 where booking_id=b.id and kind='HOLD' and released_at is null and expires_at>now()) then
    raise exception 'HOLD_EXPIRED'; end if;
  insert into public.payments(booking_id,order_id,provider_transaction_id,gross_amount,dp_amount,
    deposit_amount,platform_fee,owner_amount,status,expired_at,redirect_url)
  values (b.id,p_order_id,p_provider_transaction_id,b.pay_now_snapshot,b.down_payment_snapshot,
    b.security_deposit_snapshot,0,b.down_payment_snapshot,'PENDING',
    (select expires_at from public.inventory_allocations where booking_id=b.id and released_at is null limit 1),
    p_redirect_url)
  returning id into pid;
  if b.status='HELD' then
    update public.bookings set status='PENDING_PAYMENT' where id=b.id;
    insert into public.booking_events(booking_id,from_status,to_status,reason)
    values (b.id,'HELD','PENDING_PAYMENT','PAYMENT_SESSION_CREATED');
  end if;
  return pid;
end $$;

-- Applies a provider notification that the Edge Function has already
-- signature-verified. Returns a result code; never lowers a final status.
-- p_status is Xendit's invoice status (PAID/SETTLED/EXPIRED/PENDING),
-- already read from a request whose x-callback-token the Edge Function
-- has verified. p_event_key is Xendit's own "webhook-id" header, which
-- is unique per delivery and repeats verbatim on a retried delivery.
create function public.apply_payment_event(
  p_order_id text, p_event_key text, p_status text,
  p_payment_method text, p_amount text, p_provider_transaction_id text, p_payload jsonb)
returns text
language plpgsql security definer set search_path='' as $$
declare p public.payments; b public.bookings; mapped public.payment_status; a public.inventory_allocations; ev uuid;
begin
  select * into p from public.payments where order_id=p_order_id for update;
  if not found then
    insert into public.payment_events(provider_event_key,provider_status,payload,signature_valid)
    values (p_event_key,p_status,p_payload,true) on conflict do nothing;
    return 'UNKNOWN_ORDER';
  end if;
  insert into public.payment_events(payment_id,provider_event_key,provider_status,payload,signature_valid)
  values (p.id,p_event_key,p_status,p_payload,true)
  on conflict (provider_event_key) do nothing returning id into ev;
  if ev is null then return 'DUPLICATE'; end if;
  if p_amount::numeric <> p.gross_amount then return 'AMOUNT_MISMATCH'; end if;

  mapped := case
    when p_status in ('PAID','SETTLED') then 'SUCCESS'
    when p_status='PENDING' then 'PENDING'
    when p_status='EXPIRED' then 'EXPIRED'
    else null end;
  if mapped is null then return 'UNKNOWN_STATUS'; end if;
  if p_provider_transaction_id is not null then
    update public.payments set provider_transaction_id=p_provider_transaction_id where id=p.id; end if;
  update public.payments set provider_status=p_status,
    payment_method=coalesce(p_payment_method,payment_method), updated_at=now() where id=p.id;
  update public.payment_events set processed_at=now() where id=ev;

  if p.status in ('SUCCESS','REFUND_PENDING','REFUNDED') then return 'IGNORED_FINAL'; end if;
  select * into b from public.bookings where id=p.booking_id for update;

  if mapped = 'SUCCESS' then
    perform 1 from public.room_type_inventory where room_type_id=b.room_type_id for update;
    select * into a from public.inventory_allocations
     where booking_id=b.id and kind='HOLD' and released_at is null and expires_at>now();
    if found and b.status in ('HELD','PENDING_PAYMENT') then
      update public.payments set status='SUCCESS', paid_at=now(), updated_at=now() where id=p.id;
      update public.inventory_allocations set kind='RESERVED', expires_at=null where id=a.id;
      update public.bookings set status='CONFIRMED' where id=b.id;
      insert into public.booking_events(booking_id,from_status,to_status,reason)
      values (b.id,b.status,'CONFIRMED','PAYMENT_SUCCESS');
      return 'CONFIRMED';
    end if;
    -- Late payment: never take capacity that may belong to someone else.
    update public.payments set status='REFUND_PENDING', paid_at=now(), updated_at=now() where id=p.id;
    if b.status in ('HELD','PENDING_PAYMENT') then
      update public.inventory_allocations set released_at=now() where booking_id=b.id and released_at is null;
      update public.bookings set status='CANCELLED', cancel_reason='LATE_PAYMENT', cancelled_at=now() where id=b.id;
      insert into public.booking_events(booking_id,from_status,to_status,reason)
      values (b.id,b.status,'CANCELLED','LATE_PAYMENT');
    end if;
    insert into public.refunds(payment_id,amount,reason,status,idempotency_key)
    values (p.id,p.gross_amount,'Late payment after hold release','PENDING','late:'||p.id)
    on conflict (idempotency_key) do nothing;
    return 'LATE_PAYMENT_REFUND_PENDING';
  end if;

  if p.status <> 'PENDING' then return 'IGNORED_FINAL'; end if;
  if mapped = 'PENDING' then return 'PENDING'; end if;
  update public.payments set status=mapped, updated_at=now() where id=p.id;
  if mapped = 'EXPIRED' and b.status in ('HELD','PENDING_PAYMENT') then
    update public.inventory_allocations set released_at=now() where booking_id=b.id and released_at is null;
    update public.bookings set status='CANCELLED', cancel_reason='PAYMENT_EXPIRED', cancelled_at=now() where id=b.id;
    insert into public.booking_events(booking_id,from_status,to_status,reason)
    values (b.id,b.status,'CANCELLED','PAYMENT_EXPIRED');
  end if;
  return mapped::text;
end $$;

revoke all on function public.expire_holds(), public.create_checkout(uuid,date),
  public.get_checkout(uuid), public.cancel_checkout(uuid),
  public.attach_payment(uuid,text,text,text),
  public.apply_payment_event(text,text,text,text,text,text,jsonb)
  from public, anon, authenticated;
grant execute on function public.create_checkout(uuid,date), public.get_checkout(uuid),
  public.cancel_checkout(uuid) to authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname='service_role') then
    grant execute on function public.expire_holds(), public.attach_payment(uuid,text,text,text),
      public.apply_payment_event(text,text,text,text,text,text,jsonb) to service_role;
  end if;
end $$;
