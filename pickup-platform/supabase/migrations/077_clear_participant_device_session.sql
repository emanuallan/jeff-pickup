-- "Not you?" must invalidate the device session server-side. Clearing only the
-- hc_session cookie is flaky across hosts; without a DB revoke, a leftover cookie
-- still resolves the old persona after refresh.

create or replace function public.clear_participant_device_session(
  p_session_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
begin
  if p_session_token is null then
    return false;
  end if;

  delete from public.participant_sessions
  where token = p_session_token;

  get diagnostics v_deleted = row_count;
  return v_deleted > 0;
end;
$$;

revoke all on function public.clear_participant_device_session(uuid) from public;
grant execute on function public.clear_participant_device_session(uuid) to anon, authenticated;

comment on function public.clear_participant_device_session(uuid) is
  'Deletes a participant_sessions row by token so "Not you?" cannot be revived by a leftover cookie.';
