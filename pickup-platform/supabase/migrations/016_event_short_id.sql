-- Short opaque public IDs for event URLs (e.g. /events/x7Kp2mNq).

alter table public.events
  add column short_id text;

create or replace function public.generate_event_short_id()
returns text
language plpgsql
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  result text := '';
  i int;
  idx int;
begin
  for i in 1..8 loop
    idx := 1 + floor(random() * 62)::int;
    result := result || substr(alphabet, idx, 1);
  end loop;
  return result;
end;
$$;

do $$
declare
  r record;
  candidate text;
  attempts int;
begin
  for r in select id from public.events where short_id is null order by created_at loop
    attempts := 0;
    loop
      candidate := public.generate_event_short_id();
      exit when not exists (select 1 from public.events where short_id = candidate);
      attempts := attempts + 1;
      if attempts >= 20 then
        raise exception 'could not backfill unique event short_id for %', r.id;
      end if;
    end loop;
    update public.events set short_id = candidate where id = r.id;
  end loop;
end;
$$;

alter table public.events
  alter column short_id set not null;

create unique index events_short_id_uidx on public.events (short_id);

create or replace function public.events_assign_short_id()
returns trigger
language plpgsql
as $$
declare
  candidate text;
  attempts int := 0;
begin
  if new.short_id is not null and new.short_id <> '' then
    return new;
  end if;

  loop
    candidate := public.generate_event_short_id();
    if not exists (select 1 from public.events where short_id = candidate) then
      new.short_id := candidate;
      return new;
    end if;
    attempts := attempts + 1;
    if attempts >= 20 then
      raise exception 'could not generate unique event short_id';
    end if;
  end loop;
end;
$$;

create trigger events_assign_short_id_trg
  before insert on public.events
  for each row execute function public.events_assign_short_id();
