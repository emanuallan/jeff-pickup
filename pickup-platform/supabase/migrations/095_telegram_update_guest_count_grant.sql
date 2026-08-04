-- Telegram /in N updates guest counts via update_guest_count.
grant execute on function public.update_guest_count(uuid, uuid, int)
  to service_role;
