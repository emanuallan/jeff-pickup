-- Feed: skip zero-vote MVP finalizations (historical cron backfill noise).

create or replace function public.get_org_session_feed(
  p_org_id uuid,
  p_limit int default 50
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
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if not exists (
    select 1 from public.orgs o where o.id = p_org_id and o.status = 'active'
  ) then
    return '[]'::jsonb;
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
            'assists', s.assists
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
