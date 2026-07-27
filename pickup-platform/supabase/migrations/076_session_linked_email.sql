-- Soft-session lookup: if this device persona is already linked to an auth user,
-- return that account email so paid join can skip re-entering email.

create or replace function public.get_session_linked_email(
  p_session_token uuid,
  p_org_id uuid
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(lower(trim(u.email)), '')
  from public.participant_sessions ps
  join public.participants p on p.id = ps.participant_id
  join auth.users u on u.id = p.user_id
  where ps.token = p_session_token
    and ps.org_id = p_org_id
    and ps.expires_at > now()
    and p.user_id is not null;
$$;

revoke all on function public.get_session_linked_email(uuid, uuid) from public;
grant execute on function public.get_session_linked_email(uuid, uuid) to anon, authenticated;

comment on function public.get_session_linked_email(uuid, uuid) is
  'Returns the linked auth email for a soft-session participant, or null if unlinked.';
