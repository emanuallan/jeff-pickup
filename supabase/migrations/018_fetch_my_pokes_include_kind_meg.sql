-- Include kind + meg_value so recipients can show accurate aura loss messaging.

drop function if exists public.fetch_my_pokes(uuid, uuid);

create or replace function public.fetch_my_pokes(p_signup_id uuid, p_delete_token uuid)
returns table (
  id uuid,
  from_player_name text,
  kind text,
  meg_value int,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select p.id, fs.player_name as from_player_name, p.kind, p.meg_value, p.created_at
  from public.pokes p
  join public.signups me on me.id = p.to_signup_id
  join public.signups fs on fs.id = p.from_signup_id
  where me.id = p_signup_id
    and me.delete_token = p_delete_token
  order by p.created_at desc
  limit 50;
end;
$$;

revoke all on function public.fetch_my_pokes(uuid, uuid) from public;
grant execute on function public.fetch_my_pokes(uuid, uuid) to anon, authenticated;

