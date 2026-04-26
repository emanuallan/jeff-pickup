-- Increase unregister penalty to -10 aura (was -5).
-- This updates the signups delete trigger function in place.

create or replace function public.signups_aura_after_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nk text;
  ws date;
  rem int;
  had_week_grant boolean;
begin
  nk := lower(trim(old.player_name));
  if nk = '' then
    return old;
  end if;

  perform public.bump_aura(
    nk,
    -10,
    'register_undo',
    jsonb_build_object('signup_id', old.id, 'play_date', old.play_date::text)
  );

  ws := date_trunc('week', old.play_date::timestamp)::date;
  select count(*)::int into rem
  from public.signups s
  where lower(trim(s.player_name)) = nk
    and date_trunc('week', s.play_date::timestamp)::date = ws;

  if rem = 0 then
    select exists(
      select 1
      from public.aura_ledger l
      where l.name_key = nk
        and l.reason = 'week_proxy'
        and l.delta > 0
        and (l.ref->>'week_start') = ws::text
    ) into had_week_grant;

    if had_week_grant then
      perform public.bump_aura(
        nk,
        -2,
        'week_proxy',
        jsonb_build_object(
          'week_start',
          ws::text,
          'signup_id',
          old.id,
          'play_date',
          old.play_date::text,
          'undo',
          true
        )
      );
    end if;
  end if;

  return old;
end;
$$;

