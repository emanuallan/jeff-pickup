-- Rename org.activity → description (organizers use this as a group blurb on public pages).
alter table public.orgs rename column activity to description;
