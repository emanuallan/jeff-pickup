-- Short-lived intents so /start can finish pairing after a failed group DM
-- without putting the pair token in the group tip URL.

create table public.telegram_link_intents (
  id text primary key,
  org_id uuid not null references public.orgs(id) on delete cascade,
  telegram_user_id bigint not null,
  telegram_username text,
  pair_token text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index telegram_link_intents_user_idx
  on public.telegram_link_intents (telegram_user_id, expires_at desc)
  where used_at is null;

alter table public.telegram_link_intents enable row level security;

grant select, insert, update, delete on public.telegram_link_intents to service_role;

-- ---------------------------------------------------------------------------
-- create_telegram_link_intent
-- ---------------------------------------------------------------------------

create or replace function public.create_telegram_link_intent(
  p_org_id uuid,
  p_telegram_user_id bigint,
  p_telegram_username text,
  p_pair_token text,
  p_ttl_minutes int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
  v_expires timestamptz;
  v_attempt int := 0;
begin
  if p_pair_token is null or length(trim(p_pair_token)) = 0 then
    raise exception 'Missing pair token';
  end if;

  v_expires := now() + make_interval(mins => greatest(5, least(coalesce(p_ttl_minutes, 30), 120)));

  -- Short opaque id for t.me/?start=i_<id> (safe charset, 8 chars).
  loop
    v_attempt := v_attempt + 1;
    v_id := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.telegram_link_intents (
        id,
        org_id,
        telegram_user_id,
        telegram_username,
        pair_token,
        expires_at
      )
      values (
        v_id,
        p_org_id,
        p_telegram_user_id,
        nullif(trim(coalesce(p_telegram_username, '')), ''),
        trim(p_pair_token),
        v_expires
      );
      exit;
    exception
      when unique_violation then
        if v_attempt >= 5 then
          raise;
        end if;
    end;
  end loop;

  return jsonb_build_object(
    'id', v_id,
    'expires_at', v_expires
  );
end;
$$;

grant execute on function public.create_telegram_link_intent(uuid, bigint, text, text, int)
  to service_role;

-- ---------------------------------------------------------------------------
-- redeem_telegram_link_intent — one-time, user-bound
-- ---------------------------------------------------------------------------

create or replace function public.redeem_telegram_link_intent(
  p_intent_id text,
  p_telegram_user_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.telegram_link_intents%rowtype;
  v_slug text;
  v_name text;
begin
  select * into v_row
  from public.telegram_link_intents
  where id = upper(trim(p_intent_id))
  for update;

  if v_row.id is null then
    return null;
  end if;

  if v_row.telegram_user_id is distinct from p_telegram_user_id then
    raise exception 'That start link belongs to a different Telegram account';
  end if;

  if v_row.used_at is not null then
    raise exception 'That start link was already used';
  end if;

  if v_row.expires_at < now() then
    raise exception 'That start link expired. Send /link in your group again.';
  end if;

  select o.slug, o.name into v_slug, v_name
  from public.orgs o
  where o.id = v_row.org_id;

  if v_slug is null then
    raise exception 'Group not found';
  end if;

  update public.telegram_link_intents
  set used_at = now()
  where id = v_row.id;

  return jsonb_build_object(
    'org_id', v_row.org_id,
    'org_slug', v_slug,
    'org_name', v_name,
    'pair_token', v_row.pair_token,
    'telegram_user_id', v_row.telegram_user_id
  );
end;
$$;

grant execute on function public.redeem_telegram_link_intent(text, bigint)
  to service_role;
