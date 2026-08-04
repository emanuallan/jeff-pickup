-- Phase B: bot completes soft-participant pairing from a verified Telegram contact.

grant execute on function public.ensure_soft_participant(uuid, text, text, text, text, text)
  to service_role;

create index if not exists telegram_pair_tokens_user_open_idx
  on public.telegram_pair_tokens (telegram_user_id, created_at desc)
  where used_at is null;

-- Latest unused, unexpired pair token for a Telegram user (contact-share path).
create or replace function public.get_open_telegram_pair_token_for_user(
  p_telegram_user_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.telegram_pair_tokens%rowtype;
  v_slug text;
  v_name text;
begin
  select * into v_row
  from public.telegram_pair_tokens
  where telegram_user_id = p_telegram_user_id
    and used_at is null
    and expires_at > now()
  order by created_at desc
  limit 1;

  if v_row.id is null then
    return null;
  end if;

  select o.slug, o.name into v_slug, v_name
  from public.orgs o
  where o.id = v_row.org_id;

  if v_slug is null then
    return null;
  end if;

  return jsonb_build_object(
    'token', v_row.token,
    'org_id', v_row.org_id,
    'org_slug', v_slug,
    'org_name', v_name,
    'telegram_user_id', v_row.telegram_user_id,
    'telegram_username', v_row.telegram_username,
    'expires_at', v_row.expires_at,
    'used_at', v_row.used_at
  );
end;
$$;

grant execute on function public.get_open_telegram_pair_token_for_user(bigint)
  to service_role;
