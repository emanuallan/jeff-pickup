-- Support groups that meet online (Zoom, Google Meet, etc.).
-- An online location carries a meeting_url instead of a physical address/map.

alter table public.locations
  add column is_online boolean not null default false,
  add column meeting_url text not null default '';
