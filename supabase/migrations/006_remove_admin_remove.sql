-- Remove admin remove-player feature (RPC + secrets table)

drop function if exists public.admin_remove_signup(uuid, text);
drop table if exists public.admin_secrets;

