create or replace function mark_attended(p_booking_id uuid, p_mark boolean)
returns void as $func$
declare
  b bookings%rowtype;
  cp customer_passes%rowtype;
begin
  select * into b from bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found'; end if;

  if p_mark then
    update bookings set status='attended', attended_at=now(), updated_at=now() where id = p_booking_id;
    if b.customer_pass_id is not null then
      select * into cp from customer_passes where id = b.customer_pass_id for update;
      if cp.status <> 'active' then raise exception 'Pass not active (%)', cp.status; end if;
      if cp.visits_remaining <= 0 then raise exception 'No visits remaining'; end if;
      update customer_passes
        set visits_remaining = visits_remaining - 1,
            visits_used = visits_used + 1,
            status = case when visits_remaining - 1 = 0 then 'exhausted' else status end
        where id = cp.id;
    end if;
  else
    update bookings set status='confirmed', updated_at=now() where id = p_booking_id;
  end if;
end;
$func$ language plpgsql security definer;

create or replace function refund_pass_visit(p_pass_id uuid)
returns void as $func$
declare
  cp customer_passes%rowtype;
begin
  select * into cp from customer_passes where id = p_pass_id for update;
  if not found then raise exception 'Pass not found'; end if;
  if cp.visits_used > 0 then
    update customer_passes
      set visits_used = visits_used - 1,
          visits_remaining = visits_remaining + 1,
          status = case when status = 'exhausted' then 'active' else status end
      where id = p_pass_id;
  end if;
end;
$func$ language plpgsql security definer;

create or replace function expire_old_passes()
returns void as $func$
begin
  update customer_passes
  set status = 'expired'
  where status = 'active'
    and expires_at is not null
    and expires_at < now();
end;
$func$ language plpgsql security definer;