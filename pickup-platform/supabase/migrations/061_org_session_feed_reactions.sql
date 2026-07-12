-- Feed emoji reactions for participants with a device session.

create table public.org_session_feed_reactions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.orgs(id) on delete cascade,
  feed_kind text not null check (feed_kind in ('mvp', 'player_stats')),
  event_id uuid not null references public.events(id) on delete cascade,
  subject_participant_id uuid references public.participants(id) on delete cascade,
  reactor_participant_id uuid not null references public.participants(id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now()
);

create index org_session_feed_reactions_lookup_idx
  on public.org_session_feed_reactions (org_id, feed_kind, event_id);

create unique index org_session_feed_reactions_one_per_reactor_idx
  on public.org_session_feed_reactions (
    feed_kind,
    event_id,
    coalesce(subject_participant_id, '00000000-0000-0000-0000-000000000000'::uuid),
    reactor_participant_id
  );

alter table public.org_session_feed_reactions enable row level security;

create or replace function public.is_allowed_feed_reaction_emoji(p_emoji text)
returns boolean
language sql
immutable
as $$
  select p_emoji = any(
    array[
      '⚽', '🔥', '💪', '👏', '❤️', '😂', '👀', '🐐', '😭', '🥶', '🧢', '💀', '🧤'
    ]::text[]
  );
$$;

create or replace function public.org_session_feed_reaction_summary(
  p_org_id uuid,
  p_feed_kind text,
  p_event_id uuid,
  p_subject_participant_id uuid,
  p_reactor_participant_id uuid default null
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select jsonb_agg(
        jsonb_build_object(
          'emoji', agg.emoji,
          'count', agg.cnt,
          'reacted_by_me', agg.reacted_by_me
        )
        order by agg.cnt desc, agg.emoji
      )
      from (
        select
          r.emoji,
          count(*)::int as cnt,
          coalesce(bool_or(r.reactor_participant_id = p_reactor_participant_id), false) as reacted_by_me
        from public.org_session_feed_reactions r
        where r.org_id = p_org_id
          and r.feed_kind = p_feed_kind
          and r.event_id = p_event_id
          and (
            (p_subject_participant_id is null and r.subject_participant_id is null)
            or r.subject_participant_id = p_subject_participant_id
          )
        group by r.emoji
      ) agg
    ),
    '[]'::jsonb
  );
$$;

create or replace function public.toggle_org_session_feed_reaction(
  p_session_token uuid,
  p_org_id uuid,
  p_feed_kind text,
  p_event_id uuid,
  p_subject_participant_id uuid,
  p_emoji text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reactor_participant_id uuid;
  v_existing_id uuid;
  v_existing_emoji text;
begin
  v_reactor_participant_id := public.assert_participant_session_token(p_session_token, p_org_id);

  if p_feed_kind not in ('mvp', 'player_stats') then
    raise exception 'Invalid feed item.';
  end if;

  if not public.is_allowed_feed_reaction_emoji(p_emoji) then
    raise exception 'Invalid reaction.';
  end if;

  if not exists (
    select 1
    from public.events e
    where e.id = p_event_id
      and e.org_id = p_org_id
      and e.status <> 'cancelled'
  ) then
    raise exception 'Session not found.';
  end if;

  if p_feed_kind = 'mvp' then
    if p_subject_participant_id is not null then
      raise exception 'Invalid feed item.';
    end if;

    if not exists (
      select 1
      from public.session_mvp_finalizations f
      where f.event_id = p_event_id
        and f.org_id = p_org_id
        and f.total_votes > 0
    ) then
      raise exception 'Feed item not found.';
    end if;
  else
    if p_subject_participant_id is null then
      raise exception 'Invalid feed item.';
    end if;

    if not exists (
      select 1
      from public.session_player_stats s
      where s.event_id = p_event_id
        and s.org_id = p_org_id
        and s.participant_id = p_subject_participant_id
    ) then
      raise exception 'Feed item not found.';
    end if;
  end if;

  select r.id, r.emoji
  into v_existing_id, v_existing_emoji
  from public.org_session_feed_reactions r
  where r.feed_kind = p_feed_kind
    and r.event_id = p_event_id
    and r.reactor_participant_id = v_reactor_participant_id
    and (
      (p_subject_participant_id is null and r.subject_participant_id is null)
      or r.subject_participant_id = p_subject_participant_id
    );

  if v_existing_id is not null then
    if v_existing_emoji = p_emoji then
      delete from public.org_session_feed_reactions where id = v_existing_id;
    else
      update public.org_session_feed_reactions
      set emoji = p_emoji, created_at = now()
      where id = v_existing_id;
    end if;
  else
    insert into public.org_session_feed_reactions (
      org_id,
      feed_kind,
      event_id,
      subject_participant_id,
      reactor_participant_id,
      emoji
    )
    values (
      p_org_id,
      p_feed_kind,
      p_event_id,
      p_subject_participant_id,
      v_reactor_participant_id,
      p_emoji
    );
  end if;

  return jsonb_build_object(
    'reactions',
    public.org_session_feed_reaction_summary(
      p_org_id,
      p_feed_kind,
      p_event_id,
      p_subject_participant_id,
      v_reactor_participant_id
    )
  );
end;
$$;

drop function if exists public.get_org_session_feed(uuid, int);

create or replace function public.get_org_session_feed(
  p_org_id uuid,
  p_limit int default 50,
  p_session_token uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_mvp_enabled boolean;
  v_stats_enabled boolean;
  v_feedback_enabled boolean;
  v_reactor_participant_id uuid;
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if not exists (
    select 1 from public.orgs o where o.id = p_org_id and o.status = 'active'
  ) then
    return '[]'::jsonb;
  end if;

  if p_session_token is not null then
    v_reactor_participant_id := public.resolve_session_participant(p_session_token, p_org_id);
  end if;

  v_mvp_enabled := public.org_session_mvp_voting_enabled(p_org_id);
  v_stats_enabled := public.org_session_player_stats_enabled(p_org_id);
  v_feedback_enabled := public.org_session_feedback_enabled(p_org_id);

  if not v_feedback_enabled or (not v_mvp_enabled and not v_stats_enabled) then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (
      select jsonb_agg(item order by (item ->> 'occurred_at') desc)
      from (
        select item
        from (
          select jsonb_build_object(
            'kind', 'mvp',
            'occurred_at', f.finalized_at,
            'event_id', f.event_id,
            'event_short_id', e.short_id,
            'event_label', public.participant_feedback_event_label(f.event_id),
            'total_votes', f.total_votes,
            'winners', coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'participant_id', a.participant_id,
                    'display_name', p.display_name,
                    'vote_count', a.vote_count
                  )
                  order by p.display_name
                )
                from public.session_mvp_awards a
                join public.participants p on p.id = a.participant_id
                where a.event_id = f.event_id
              ),
              '[]'::jsonb
            ),
            'nominees', coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'participant_id', tallies.nominee_participant_id,
                    'display_name', p.display_name,
                    'vote_count', tallies.vote_count,
                    'is_winner', tallies.vote_count = coalesce(
                      (
                        select max(a2.vote_count)
                        from public.session_mvp_awards a2
                        where a2.event_id = f.event_id
                      ),
                      0
                    )
                  )
                  order by tallies.vote_count desc, p.display_name
                )
                from (
                  select
                    v.nominee_participant_id,
                    count(*)::int as vote_count
                  from public.session_mvp_votes v
                  where v.event_id = f.event_id
                  group by v.nominee_participant_id
                ) tallies
                join public.participants p on p.id = tallies.nominee_participant_id
              ),
              '[]'::jsonb
            ),
            'reactions', public.org_session_feed_reaction_summary(
              p_org_id, 'mvp', f.event_id, null, v_reactor_participant_id
            )
          ) as item
          from public.session_mvp_finalizations f
          join public.events e on e.id = f.event_id
          where f.org_id = p_org_id
            and v_mvp_enabled
            and e.status <> 'cancelled'
            and f.total_votes > 0

          union all

          select jsonb_build_object(
            'kind', 'player_stats',
            'occurred_at', s.created_at,
            'event_id', s.event_id,
            'event_short_id', e.short_id,
            'event_label', public.participant_feedback_event_label(s.event_id),
            'participant_id', s.participant_id,
            'display_name', p.display_name,
            'goals', s.goals,
            'assists', s.assists,
            'reactions', public.org_session_feed_reaction_summary(
              p_org_id, 'player_stats', s.event_id, s.participant_id, v_reactor_participant_id
            )
          ) as item
          from public.session_player_stats s
          join public.events e on e.id = s.event_id
          join public.participants p on p.id = s.participant_id
          where s.org_id = p_org_id
            and v_stats_enabled
            and e.status <> 'cancelled'
        ) feed_items
        order by (item ->> 'occurred_at') desc
        limit v_limit
      ) limited
    ),
    '[]'::jsonb
  );
end;
$$;

grant execute on function public.get_org_session_feed(uuid, int, uuid) to anon, authenticated;
grant execute on function public.toggle_org_session_feed_reaction(uuid, uuid, text, uuid, uuid, text) to anon, authenticated;
