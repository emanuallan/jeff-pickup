-- Public roster view: security invoker so RLS applies to the querying role.
-- Clears Supabase "Security Definer View" lint on event_roster_public.
--
-- Anon access is scoped by new RLS policies (active orgs only) and a column
-- grant on participants (display_name only — not phone or legal names).

drop view if exists public.event_roster_public;

create view public.event_roster_public
with (security_invoker = true)
as
select
  s.id,
  s.event_id,
  s.org_id,
  s.guest_count,
  s.arrival_status,
  s.created_at,
  p.display_name,
  s.participant_id
from public.signups s
join public.participants p on p.id = s.participant_id;

grant select on public.event_roster_public to anon, authenticated;

-- Invoker view: anon needs table privileges; RLS policies below restrict rows.
grant select on public.signups to anon;
grant select (id, org_id, display_name) on public.participants to anon;

-- Anon-only policies — authenticated organizers keep existing admin policies.
create policy "Anon can view signups for active orgs"
  on public.signups for select
  to anon
  using (
    exists (
      select 1
      from public.orgs o
      where o.id = signups.org_id
        and o.status = 'active'
    )
  );

create policy "Anon can view roster participants for active orgs"
  on public.participants for select
  to anon
  using (
    exists (
      select 1
      from public.signups s
      inner join public.orgs o on o.id = s.org_id
      where s.participant_id = participants.id
        and o.status = 'active'
    )
  );
