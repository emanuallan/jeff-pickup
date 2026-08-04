-- Telegram bot: link groups to orgs, pair users to soft participants.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.telegram_org_links (
  org_id uuid primary key references public.orgs(id) on delete cascade,
  telegram_chat_id bigint not null unique,
  chat_title text,
  linked_by uuid references auth.users(id) on delete set null,
  linked_at timestamptz not null default now(),
  announce_sessions boolean not null default true,
  announce_mvp boolean not null default true
);

create table public.telegram_participant_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  telegram_user_id bigint not null,
  participant_id uuid not null references public.participants(id) on delete cascade,
  linked_at timestamptz not null default now(),
  unique (org_id, telegram_user_id),
  unique (org_id, participant_id)
);

create index telegram_participant_links_participant_idx
  on public.telegram_participant_links (participant_id);

create table public.telegram_connect_codes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  code text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index telegram_connect_codes_org_idx
  on public.telegram_connect_codes (org_id, created_at desc);

create table public.telegram_pair_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  org_id uuid not null references public.orgs(id) on delete cascade,
  telegram_user_id bigint not null,
  telegram_username text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index telegram_pair_tokens_lookup_idx
  on public.telegram_pair_tokens (token)
  where used_at is null;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.telegram_org_links enable row level security;
alter table public.telegram_participant_links enable row level security;
alter table public.telegram_connect_codes enable row level security;
alter table public.telegram_pair_tokens enable row level security;

create policy "Org members can view telegram org link"
  on public.telegram_org_links for select
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']));

create policy "Org members can delete telegram org link"
  on public.telegram_org_links for delete
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']));

create policy "Org members can view telegram connect codes"
  on public.telegram_connect_codes for select
  to authenticated
  using (public.is_org_member(org_id, array['owner', 'admin']));

create policy "Org members can insert telegram connect codes"
  on public.telegram_connect_codes for insert
  to authenticated
  with check (public.is_org_member(org_id, array['owner', 'admin']));

-- Participant links / pair tokens: service role + security-definer RPCs only
-- (no direct authenticated policies for writes).

grant select, delete on public.telegram_org_links to authenticated;
grant select, insert on public.telegram_connect_codes to authenticated;

grant select, insert, update, delete on public.telegram_org_links to service_role;
grant select, insert, update, delete on public.telegram_participant_links to service_role;
grant select, insert, update, delete on public.telegram_connect_codes to service_role;
grant select, insert, update, delete on public.telegram_pair_tokens to service_role;

-- ---------------------------------------------------------------------------
-- redeem_telegram_connect_code — bind a Telegram group to an org
-- ---------------------------------------------------------------------------

create or replace function public.redeem_telegram_connect_code(
  p_code text,
  p_telegram_chat_id bigint,
  p_chat_title text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.telegram_connect_codes%rowtype;
  v_org public.orgs%rowtype;
  v_existing_org uuid;
  v_existing_chat uuid;
begin
  if p_telegram_chat_id is null then
    raise exception 'Chat id required';
  end if;

  select * into v_row
  from public.telegram_connect_codes
  where upper(trim(code)) = upper(trim(p_code))
  for update;

  if v_row.id is null then
    raise exception 'Invalid connect code';
  end if;

  if v_row.used_at is not null then
    raise exception 'Connect code already used';
  end if;

  if v_row.expires_at < now() then
    raise exception 'Connect code expired';
  end if;

  select * into v_org from public.orgs where id = v_row.org_id;
  if v_org.id is null or v_org.status is distinct from 'active' then
    raise exception 'Organization not found';
  end if;

  select org_id into v_existing_org
  from public.telegram_org_links
  where telegram_chat_id = p_telegram_chat_id;

  if v_existing_org is not null then
    raise exception 'This Telegram group is already linked to an organization';
  end if;

  select org_id into v_existing_chat
  from public.telegram_org_links
  where org_id = v_row.org_id;

  if v_existing_chat is not null then
    raise exception 'This organization already has a linked Telegram group';
  end if;

  insert into public.telegram_org_links (
    org_id,
    telegram_chat_id,
    chat_title,
    linked_by
  )
  values (
    v_row.org_id,
    p_telegram_chat_id,
    nullif(trim(p_chat_title), ''),
    v_row.created_by
  );

  update public.telegram_connect_codes
  set used_at = now()
  where id = v_row.id;

  return jsonb_build_object(
    'ok', true,
    'org_id', v_org.id,
    'org_slug', v_org.slug,
    'org_name', v_org.name
  );
end;
$$;

grant execute on function public.redeem_telegram_connect_code(text, bigint, text)
  to service_role;

-- ---------------------------------------------------------------------------
-- complete_telegram_pair — bind telegram user to participant (one-time token)
-- ---------------------------------------------------------------------------

create or replace function public.complete_telegram_pair(
  p_token text,
  p_participant_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_token public.telegram_pair_tokens%rowtype;
  v_participant public.participants%rowtype;
begin
  select * into v_token
  from public.telegram_pair_tokens
  where token = trim(p_token)
  for update;

  if v_token.id is null then
    raise exception 'Invalid or expired pairing link';
  end if;

  if v_token.used_at is not null then
    raise exception 'Pairing link already used';
  end if;

  if v_token.expires_at < now() then
    raise exception 'Pairing link expired';
  end if;

  select * into v_participant
  from public.participants
  where id = p_participant_id;

  if v_participant.id is null or v_participant.org_id is distinct from v_token.org_id then
    raise exception 'Participant not found for this group';
  end if;

  insert into public.telegram_participant_links (
    org_id,
    telegram_user_id,
    participant_id
  )
  values (
    v_token.org_id,
    v_token.telegram_user_id,
    v_participant.id
  )
  on conflict (org_id, telegram_user_id) do update
    set participant_id = excluded.participant_id,
        linked_at = now();

  -- Keep one telegram account per participant in an org.
  delete from public.telegram_participant_links
  where org_id = v_token.org_id
    and participant_id = v_participant.id
    and telegram_user_id is distinct from v_token.telegram_user_id;

  update public.telegram_pair_tokens
  set used_at = now()
  where id = v_token.id;

  return jsonb_build_object(
    'ok', true,
    'org_id', v_token.org_id,
    'participant_id', v_participant.id,
    'display_name', v_participant.display_name
  );
end;
$$;

grant execute on function public.complete_telegram_pair(text, uuid)
  to service_role;

-- Bot RSVP path uses service-role + existing join/leave/status RPCs.
grant execute on function public.join_event(uuid, text, text, text, text, int)
  to service_role;
grant execute on function public.leave_event(uuid, uuid) to service_role;
grant execute on function public.update_arrival_status(uuid, uuid, text)
  to service_role;
grant execute on function public.recover_participant_session(uuid, text)
  to service_role;
grant execute on function public.event_headcount(uuid) to service_role;

-- Dedup Telegram MVP announcements after finalize.
alter table public.session_mvp_finalizations
  add column if not exists telegram_announced_at timestamptz;

comment on table public.telegram_org_links is
  'Maps one Telegram group chat to one Organizr org.';
comment on table public.telegram_participant_links is
  'Maps a Telegram user to a soft participant within an org.';
comment on table public.telegram_connect_codes is
  'One-time console-issued codes to bind a Telegram group.';
comment on table public.telegram_pair_tokens is
  'One-time deep-link tokens for web pairing of Telegram users.';
