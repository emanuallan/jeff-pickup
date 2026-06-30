-- Prevent duplicate organizer notification batches from concurrent flushes
-- (e.g. parallel get_organizer_notifications + count_unread RPCs).

-- Drop duplicate pending rows before adding a uniqueness guard.
delete from public.organizer_notification_events a
using public.organizer_notification_events b
where a.id > b.id
  and a.org_id = b.org_id
  and a.event_id = b.event_id
  and a.participant_id = b.participant_id
  and a.kind = b.kind;

create unique index if not exists organizer_notification_events_dedupe_idx
  on public.organizer_notification_events (org_id, event_id, participant_id, kind);

create or replace function public.enqueue_organizer_notification_event(
  p_org_id uuid,
  p_event_id uuid,
  p_participant_id uuid,
  p_kind text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_starts_at timestamptz;
begin
  select e.starts_at
  into v_starts_at
  from public.events e
  where e.id = p_event_id
    and e.org_id = p_org_id
    and e.status <> 'cancelled'
    and e.starts_at >= now()
    and e.starts_at <= now() + interval '14 days';

  if v_starts_at is null then
    return;
  end if;

  insert into public.organizer_notification_events (org_id, event_id, participant_id, kind)
  values (p_org_id, p_event_id, p_participant_id, p_kind)
  on conflict (org_id, event_id, participant_id, kind) do nothing;
end;
$$;

create or replace function public.flush_organizer_notification_batches(p_org_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_names jsonb;
  v_short_id text;
  v_starts_at timestamptz;
  v_label text;
  v_batch_kind text;
begin
  -- Serialize flushes so concurrent inbox RPCs cannot double-insert batches.
  perform pg_advisory_xact_lock(87942301, 0);

  for r in
    select
      d.org_id,
      d.event_id,
      d.kind,
      array_agg(d.participant_id order by d.first_enqueued_at) as participant_ids,
      count(*)::int as cnt
    from (
      select
        e.org_id,
        e.event_id,
        e.kind,
        e.participant_id,
        min(e.created_at) as first_enqueued_at
      from public.organizer_notification_events e
      where p_org_id is null or e.org_id = p_org_id
      group by e.org_id, e.event_id, e.kind, e.participant_id
    ) d
    group by d.org_id, d.event_id, d.kind
  loop
    v_batch_kind := case r.kind
      when 'new_signup' then 'new_signup_batch'
      when 'returning_signup' then 'returning_signup_batch'
      when 'unregister' then 'unregister_batch'
    end;

    select coalesce(
      jsonb_agg(p.display_name order by p.display_name),
      '[]'::jsonb
    )
    into v_names
    from public.participants p
    where p.id = any (r.participant_ids);

    select ev.short_id, ev.starts_at
    into v_short_id, v_starts_at
    from public.events ev
    where ev.id = r.event_id;

    v_label := public.organizer_notification_event_label(r.event_id);

    insert into public.organizer_notifications (org_id, event_id, kind, payload)
    values (
      r.org_id,
      r.event_id,
      v_batch_kind,
      jsonb_build_object(
        'count', r.cnt,
        'participant_names', v_names,
        'event_short_id', v_short_id,
        'event_starts_at', v_starts_at,
        'event_label', v_label
      )
    );

    delete from public.organizer_notification_events pending
    where pending.org_id = r.org_id
      and pending.event_id = r.event_id
      and pending.kind = r.kind;
  end loop;
end;
$$;

-- Single inbox fetch: one flush per page load instead of two parallel flushes.
create or replace function public.get_organizer_notification_inbox(
  p_org_id uuid default null,
  p_limit int default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unread int;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.flush_organizer_notification_batches(p_org_id);

  select count(*)::int into v_unread
  from public.organizer_notifications n
  where public.is_org_member(n.org_id)
    and (p_org_id is null or n.org_id = p_org_id)
    and not exists (
      select 1 from public.organizer_notification_reads r
      where r.notification_id = n.id and r.user_id = auth.uid()
    )
    and not exists (
      select 1 from public.organizer_notification_dismissals d
      where d.notification_id = n.id and d.user_id = auth.uid()
    );

  return jsonb_build_object(
    'unread_count', coalesce(v_unread, 0),
    'notifications', coalesce((
      select jsonb_agg(row_to_json(t) order by t.created_at desc)
      from (
        select
          n.id,
          n.org_id,
          o.slug as org_slug,
          o.name as org_name,
          n.event_id,
          n.kind,
          n.payload,
          n.created_at,
          r.read_at
        from public.organizer_notifications n
        join public.orgs o on o.id = n.org_id
        left join public.organizer_notification_reads r
          on r.notification_id = n.id and r.user_id = auth.uid()
        where public.is_org_member(n.org_id)
          and (p_org_id is null or n.org_id = p_org_id)
          and not exists (
            select 1 from public.organizer_notification_dismissals d
            where d.notification_id = n.id and d.user_id = auth.uid()
          )
        order by n.created_at desc
        limit greatest(1, least(p_limit, 100))
      ) t
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_organizer_notification_inbox(uuid, int) to authenticated;

notify pgrst, 'reload schema';
