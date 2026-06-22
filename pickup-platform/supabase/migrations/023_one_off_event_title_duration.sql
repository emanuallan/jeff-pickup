-- One-off events can set their own name and duration; recurring sessions still inherit from schedules.

alter table public.events
  add column if not exists title text,
  add column if not exists duration_min int
    check (duration_min is null or (duration_min > 0 and duration_min <= 480));

create or replace function public.event_duration_min(p_event_id uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(e.duration_min, s.duration_min, 90)
  from public.events e
  left join public.schedules s on s.id = e.schedule_id
  where e.id = p_event_id;
$$;
