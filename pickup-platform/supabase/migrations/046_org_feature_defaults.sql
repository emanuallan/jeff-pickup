-- Default public roster and guest sign-ups to on for new and existing orgs.

alter table public.orgs
  alter column settings set default '{
    "features": {
      "user_badges": true,
      "leaderboard": true,
      "returning_signup_modal": true,
      "public_roster": true,
      "guest_signups": true
    }
  }'::jsonb;

-- Preserve explicit opt-outs; only fill missing keys.
update public.orgs
set settings = jsonb_set(
  jsonb_set(
    settings,
    '{features,public_roster}',
    coalesce(settings->'features'->'public_roster', 'true'::jsonb),
    true
  ),
  '{features,guest_signups}',
  coalesce(settings->'features'->'guest_signups', 'true'::jsonb),
  true
);
