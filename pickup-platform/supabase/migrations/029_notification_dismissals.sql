-- Per-user dismissals so organizers can clear notifications from their inbox.

create table public.organizer_notification_dismissals (
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_id uuid not null references public.organizer_notifications(id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, notification_id)
);

alter table public.organizer_notification_dismissals enable row level security;

create policy "Members can view own dismissals"
  on public.organizer_notification_dismissals for select
  to authenticated
  using (user_id = auth.uid());

create policy "Members can dismiss notifications"
  on public.organizer_notification_dismissals for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.organizer_notifications n
      where n.id = notification_id and public.is_org_member(n.org_id)
    )
  );

grant select, insert on public.organizer_notification_dismissals to authenticated;

create or replace function public.get_organizer_notifications(
  p_org_id uuid default null,
  p_limit int default 30
)
returns table (
  id uuid,
  org_id uuid,
  org_slug text,
  org_name text,
  event_id uuid,
  kind text,
  payload jsonb,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.flush_organizer_notification_batches(p_org_id);

  return query
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
  limit greatest(1, least(p_limit, 100));
end;
$$;

create or replace function public.count_unread_organizer_notifications(
  p_org_id uuid default null
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  if auth.uid() is null then
    return 0;
  end if;

  perform public.flush_organizer_notification_batches(p_org_id);

  select count(*)::int into v_count
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

  return coalesce(v_count, 0);
end;
$$;

create or replace function public.dismiss_organizer_notification(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not exists (
    select 1
    from public.organizer_notifications n
    where n.id = p_notification_id
      and public.is_org_member(n.org_id)
  ) then
    raise exception 'Notification not found';
  end if;

  insert into public.organizer_notification_reads (user_id, notification_id)
  values (auth.uid(), p_notification_id)
  on conflict (user_id, notification_id) do nothing;

  insert into public.organizer_notification_dismissals (user_id, notification_id)
  values (auth.uid(), p_notification_id)
  on conflict (user_id, notification_id) do nothing;
end;
$$;

create or replace function public.dismiss_all_organizer_notifications(p_org_id uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  perform public.flush_organizer_notification_batches(p_org_id);

  insert into public.organizer_notification_reads (user_id, notification_id)
  select auth.uid(), n.id
  from public.organizer_notifications n
  where public.is_org_member(n.org_id)
    and (p_org_id is null or n.org_id = p_org_id)
    and not exists (
      select 1 from public.organizer_notification_dismissals d
      where d.notification_id = n.id and d.user_id = auth.uid()
    )
  on conflict (user_id, notification_id) do nothing;

  insert into public.organizer_notification_dismissals (user_id, notification_id)
  select auth.uid(), n.id
  from public.organizer_notifications n
  where public.is_org_member(n.org_id)
    and (p_org_id is null or n.org_id = p_org_id)
    and not exists (
      select 1 from public.organizer_notification_dismissals d
      where d.notification_id = n.id and d.user_id = auth.uid()
    )
  on conflict (user_id, notification_id) do nothing;
end;
$$;

grant execute on function public.dismiss_organizer_notification(uuid) to authenticated;
grant execute on function public.dismiss_all_organizer_notifications(uuid) to authenticated;
