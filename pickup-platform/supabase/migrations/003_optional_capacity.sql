-- Headcount: make capacity optional (NULL = no limit / unlimited)

-- Drop the cross-column check that assumed capacity is always present.
alter table public.schedules drop constraint if exists schedules_check;
alter table public.events drop constraint if exists events_check;

-- schedules.capacity: nullable, no default
alter table public.schedules alter column capacity drop not null;
alter table public.schedules alter column capacity drop default;

-- events.capacity: nullable, no default
alter table public.events alter column capacity drop not null;
alter table public.events alter column capacity drop default;

-- Re-add the relationship check so it only applies when a capacity is set.
-- (A NULL capacity means "no limit", so the check is skipped for NULLs.)
alter table public.schedules
  add constraint schedules_min_players_le_capacity
  check (capacity is null or min_players <= capacity);

alter table public.events
  add constraint events_min_players_le_capacity
  check (capacity is null or min_players <= capacity);
