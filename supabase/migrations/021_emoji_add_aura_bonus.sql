-- Award +1 aura when a player adds an emoji (empty -> non-empty).

create or replace function public.update_my_signup_emoji(p_signup_id uuid, p_delete_token uuid, p_emoji text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text;
  prev text;
  nk text;
begin
  cleaned := coalesce(p_emoji, '');
  cleaned := trim(cleaned);

  if char_length(cleaned) > 8 then
    raise exception 'Emoji too long';
  end if;

  select coalesce(s.emoji, ''), lower(trim(s.player_name))
    into prev, nk
  from public.signups s
  where s.id = p_signup_id
    and s.delete_token = p_delete_token;

  if nk is null then
    -- not authorized (keep behavior consistent: no-op)
    return;
  end if;

  update public.signups
  set emoji = cleaned
  where id = p_signup_id
    and delete_token = p_delete_token;

  if coalesce(trim(prev), '') = '' and cleaned <> '' then
    perform public.bump_aura(
      nk,
      1,
      'emoji_add',
      jsonb_build_object('signup_id', p_signup_id::text)
    );
  end if;
end;
$$;

revoke all on function public.update_my_signup_emoji(uuid, uuid, text) from public;
grant execute on function public.update_my_signup_emoji(uuid, uuid, text) to anon, authenticated;

