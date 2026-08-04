-- Telegram bot: service-role RPCs so bot handlers don't depend on PostgREST
-- table exposure for telegram_* tables (auto-expose may be off).

-- ---------------------------------------------------------------------------
-- get_telegram_org_by_chat — resolve linked org from a Telegram chat id
-- ---------------------------------------------------------------------------

create or replace function public.get_telegram_org_by_chat(p_telegram_chat_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_link public.telegram_org_links%rowtype;
  v_org public.orgs%rowtype;
begin
  if p_telegram_chat_id is null then
    return null;
  end if;

  select * into v_link
  from public.telegram_org_links
  where telegram_chat_id = p_telegram_chat_id;

  if v_link.org_id is null then
    return null;
  end if;

  select * into v_org from public.orgs where id = v_link.org_id;
  if v_org.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'org_id', v_org.id,
    'org_slug', v_org.slug,
    'org_name', v_org.name,
    'telegram_chat_id', v_link.telegram_chat_id,
    'chat_title', v_link.chat_title,
    'linked_at', v_link.linked_at,
    'announce_sessions', v_link.announce_sessions,
    'announce_mvp', v_link.announce_mvp
  );
end;
$$;

grant execute on function public.get_telegram_org_by_chat(bigint) to service_role;

-- ---------------------------------------------------------------------------
-- get_telegram_participant_link — telegram user → participant in an org
-- ---------------------------------------------------------------------------

create or replace function public.get_telegram_participant_link(
  p_org_id uuid,
  p_telegram_user_id bigint
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_participant_id uuid;
begin
  select participant_id into v_participant_id
  from public.telegram_participant_links
  where org_id = p_org_id
    and telegram_user_id = p_telegram_user_id;

  if v_participant_id is null then
    return null;
  end if;

  return jsonb_build_object('participant_id', v_participant_id);
end;
$$;

grant execute on function public.get_telegram_participant_link(uuid, bigint)
  to service_role;

-- ---------------------------------------------------------------------------
-- create_telegram_pair_token — issue a one-time web pairing token
-- ---------------------------------------------------------------------------

create or replace function public.create_telegram_pair_token(
  p_org_id uuid,
  p_telegram_user_id bigint,
  p_telegram_username text default null,
  p_ttl_minutes int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token text;
  v_expires_at timestamptz;
begin
  if p_org_id is null or p_telegram_user_id is null then
    raise exception 'org and telegram user required';
  end if;

  if not exists (select 1 from public.orgs o where o.id = p_org_id and o.status = 'active') then
    raise exception 'Organization not found';
  end if;

  v_token := encode(gen_random_bytes(24), 'base64');
  -- URL-safe-ish: replace +/ and strip =
  v_token := rtrim(replace(replace(v_token, '+', '-'), '/', '_'), '=');
  v_expires_at := now() + make_interval(mins => greatest(1, least(coalesce(p_ttl_minutes, 30), 120)));

  insert into public.telegram_pair_tokens (
    token,
    org_id,
    telegram_user_id,
    telegram_username,
    expires_at
  )
  values (
    v_token,
    p_org_id,
    p_telegram_user_id,
    nullif(trim(p_telegram_username), ''),
    v_expires_at
  );

  return jsonb_build_object(
    'token', v_token,
    'expires_at', v_expires_at
  );
end;
$$;

grant execute on function public.create_telegram_pair_token(uuid, bigint, text, int)
  to service_role;

-- ---------------------------------------------------------------------------
-- get_telegram_pair_token — load an open pair token for the web pair page
-- ---------------------------------------------------------------------------

create or replace function public.get_telegram_pair_token(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row public.telegram_pair_tokens%rowtype;
begin
  select * into v_row
  from public.telegram_pair_tokens
  where token = trim(p_token);

  if v_row.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'token', v_row.token,
    'org_id', v_row.org_id,
    'telegram_user_id', v_row.telegram_user_id,
    'telegram_username', v_row.telegram_username,
    'expires_at', v_row.expires_at,
    'used_at', v_row.used_at
  );
end;
$$;

grant execute on function public.get_telegram_pair_token(text) to service_role;

comment on function public.get_telegram_org_by_chat(bigint) is
  'Bot helper: map Telegram chat id → org (bypasses PostgREST table exposure).';
comment on function public.create_telegram_pair_token(uuid, bigint, text, int) is
  'Bot helper: create a one-time web pairing token.';
