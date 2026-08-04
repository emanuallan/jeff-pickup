-- Fix create_telegram_pair_token: avoid gen_random_bytes (pgcrypto / search_path issues).
-- Safe to re-run. Uses gen_random_uuid() which is already available in this project.

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

  v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
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
