-- Auto-promote waitlist when event capacity increases or is removed.

create or replace function public.promote_from_waitlist(p_event_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_capacity int;
  v_org_id uuid;
  v_spots int;
  v_mode text;
  r record;
  v_party_size int;
begin
  select e.capacity, e.org_id
  into v_capacity, v_org_id
  from public.events e
  where e.id = p_event_id;

  if v_capacity is null then
    -- No capacity limit — everyone on the waitlist can be confirmed.
    update public.signups
    set list_status = 'confirmed'
    where event_id = p_event_id
      and list_status = 'waitlisted';
    return;
  end if;

  v_spots := v_capacity - public.event_headcount(p_event_id);
  if v_spots <= 0 then
    return;
  end if;

  select coalesce(o.settings->'waitlist'->>'promotion_mode', 'strict_fifo')
  into v_mode
  from public.orgs o
  where o.id = v_org_id;

  for r in
    select s.id, s.guest_count
    from public.signups s
    where s.event_id = p_event_id
      and s.list_status = 'waitlisted'
    order by s.created_at asc
  loop
    v_party_size := 1 + r.guest_count;

    if v_party_size <= v_spots then
      update public.signups
      set list_status = 'confirmed'
      where id = r.id;

      v_spots := v_spots - v_party_size;
    elsif v_mode = 'strict_fifo' then
      exit;
    end if;
  end loop;
end;
$$;

create or replace function public.trg_promote_waitlist_on_capacity_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.capacity is not distinct from OLD.capacity then
    return NEW;
  end if;

  -- Promote when capacity is removed, raised, or newly set above current headcount.
  if NEW.capacity is null
    or OLD.capacity is null
    or NEW.capacity > OLD.capacity
  then
    perform public.promote_from_waitlist(NEW.id);
    perform public.maybe_promote_event(NEW.id);
  end if;

  return NEW;
end;
$$;

drop trigger if exists event_capacity_promote_waitlist on public.events;

create trigger event_capacity_promote_waitlist
  after update of capacity on public.events
  for each row
  execute function public.trg_promote_waitlist_on_capacity_change();

notify pgrst, 'reload schema';
