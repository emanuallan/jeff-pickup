-- Track how many additional players someone is bringing (counts toward roster goal)

alter table public.signups
  add column if not exists guest_count integer not null default 0;

alter table public.signups
  add constraint signups_guest_count_range
  check (guest_count >= 0 and guest_count <= 20);
