-- Award +5 aura per guest added on signup, and remove on unregister.
-- Updates the signup insert/delete aura trigger functions.

create or replace function public.signups_aura_after_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  nk text;
  ws date;
  others int;
  guests int;
begin
  nk := lower(trim(new.player_name));
  if nk = '' then
    return new;
  end if;

  perform public.bump_aura(
    nk,
    5,
    'register',
    jsonb_build_object('signup_id', new.id, 'play_date', new.play_date::text)
  );

  guests := greatest(0, least(20, coalesce(new.guest_count, 0)));
  if guests > 0 then
    perform public.bump_aura(
      nk,
      (guests * 5)::bigint,
      'guest_bonus',
      jsonb_build_object('signup_id', new.id, 'play_date', new.play_date::text, 'guest_count', guests)
    );
  end if;

  ws := date_trunc('week', new.play_date::timestamp)::date;
  select count(*)::int into others
  from public.signups s
  where lower(trim(s.player_name)) = nk
    and s.id <> new.id
    and date_trunc('week', s.play_date::timestamp)::date = ws;

  if others = 0 then
    perform public.bump_aura(
      nk,
      2,
      'week_proxy',
      jsonb_build_object('week_start', ws::text, 'signup_id', new.id, 'play_date', new.play_date::text)
    );
  end if;

  return new;
end;
$$;

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
  guests int;
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

  guests := greatest(0, least(20, coalesce(old.guest_count, 0)));
  if guests > 0 then
    perform public.bump_aura(
      nk,
      -(guests * 5)::bigint,
      'guest_bonus_undo',
      jsonb_build_object('signup_id', old.id, 'play_date', old.play_date::text, 'guest_count', guests)
    );
  end if;

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
        jsonb_build_object('week_start', ws::text, 'signup_id', old.id, 'play_date', old.play_date::text, 'undo', true)
      );
    end if;
  end if;

  return old;
end;
$$;

