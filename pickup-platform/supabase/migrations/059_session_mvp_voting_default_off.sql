-- Session MVP voting is opt-in (default off), matching goals/assists.

create or replace function public.org_session_mvp_voting_enabled(p_org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select (o.settings->'features'->>'session_mvp_voting')::boolean from public.orgs o where o.id = p_org_id),
    false
  );
$$;
