-- MANUAL ONLY — do not apply as a normal forward migration.
-- Reverts 098_telegram_contact_pair.sql if Phase B contact-share pairing is rolled back.
--
-- After running this in Supabase, also revert the app deploy to the commit before
-- Phase B (or `git revert` that commit) so the bot stops calling these RPCs.

drop function if exists public.get_open_telegram_pair_token_for_user(bigint);

drop index if exists public.telegram_pair_tokens_user_open_idx;

revoke execute on function public.ensure_soft_participant(uuid, text, text, text, text, text)
  from service_role;
-- anon + authenticated grants from 081 remain unchanged.
