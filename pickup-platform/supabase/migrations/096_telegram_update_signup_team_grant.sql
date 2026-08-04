-- Telegram /join N assigns teams via update_signup_team.
grant execute on function public.update_signup_team(uuid, uuid, text)
  to service_role;
