-- Change poke limit to once per target per game day (sender can still meg others).

drop index if exists public.pokes_one_outgoing_per_from_per_day;

create unique index if not exists pokes_one_per_target_per_from_per_day
  on public.pokes (play_date, from_signup_id, to_signup_id);

create or replace function public.send_poke(
  p_from_signup_id uuid,
  p_delete_token uuid,
  p_to_signup_id uuid,
  p_kind text,
  p_today date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  d date;
  from_nk text;
  to_nk text;
  v_meg int;
  r1 double precision;
  r2 double precision;
begin
  if p_from_signup_id = p_to_signup_id then
    raise exception 'Cannot poke yourself';
  end if;

  if p_kind is null or p_kind not in ('meg', 'wave') then
    raise exception 'Invalid kind';
  end if;

  if p_today is null then
    raise exception 'Invalid today date';
  end if;

  select s.play_date, lower(trim(s.player_name)) into d, from_nk
  from public.signups s
  where s.id = p_from_signup_id
    and s.delete_token = p_delete_token;

  if d is null or from_nk = '' or from_nk is null then
    raise exception 'Not authorized';
  end if;

  if d < p_today then
    raise exception 'Play date is in the past';
  end if;

  if not exists (
    select 1
    from public.signups t
    where t.id = p_to_signup_id
      and t.play_date = d
  ) then
    raise exception 'Target not on this roster day';
  end if;

  select lower(trim(s.player_name)) into to_nk
  from public.signups s
  where s.id = p_to_signup_id
    and s.play_date = d;

  if to_nk = '' or to_nk is null then
    raise exception 'Target not on this roster day';
  end if;

  if exists (
    select 1
    from public.pokes p
    where p.from_signup_id = p_from_signup_id
      and p.to_signup_id = p_to_signup_id
      and p.play_date = d
  ) then
    raise exception 'Already poked this player today';
  end if;

  if p_kind = 'wave' then
    perform public.bump_aura(
      from_nk,
      5,
      'wave_send',
      jsonb_build_object('to_signup_id', p_to_signup_id::text, 'play_date', d::text)
    );
    insert into public.pokes (play_date, from_signup_id, to_signup_id, kind, meg_value)
    values (d, p_from_signup_id, p_to_signup_id, 'wave', null);
    return jsonb_build_object('kind', 'wave', 'meg_value', null);
  else
    r1 := power(random()::double precision, 1.4);
    r2 := power(random()::double precision, 1.4);
    v_meg := 1 + (floor(least(r1, r2) * 100.0))::int;
    if v_meg < 1 then v_meg := 1; end if;
    if v_meg > 100 then v_meg := 100; end if;

    perform public.bump_aura(
      from_nk,
      v_meg,
      'meg_send',
      jsonb_build_object('to_signup_id', p_to_signup_id::text, 'play_date', d::text, 'roll', v_meg)
    );
    perform public.bump_aura(
      to_nk,
      -v_meg,
      'meg_recv',
      jsonb_build_object('from_signup_id', p_from_signup_id::text, 'play_date', d::text, 'roll', v_meg)
    );
    insert into public.pokes (play_date, from_signup_id, to_signup_id, kind, meg_value)
    values (d, p_from_signup_id, p_to_signup_id, 'meg', v_meg);
    return jsonb_build_object('kind', 'meg', 'meg_value', to_jsonb(v_meg));
  end if;
end;
$$;

revoke all on function public.send_poke(uuid, uuid, uuid, text, date) from public;
grant execute on function public.send_poke(uuid, uuid, uuid, text, date) to anon, authenticated;

