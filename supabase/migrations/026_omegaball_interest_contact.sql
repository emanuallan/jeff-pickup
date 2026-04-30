-- OmegaBall interest signups: add private contact field

alter table public.omegaball_interest_signups
  add column if not exists contact text;

-- Basic sanity: require something non-empty and cap length.
alter table public.omegaball_interest_signups
  drop constraint if exists omegaball_interest_signups_contact_len;
alter table public.omegaball_interest_signups
  add constraint omegaball_interest_signups_contact_len
    check (char_length(trim(contact)) > 0 and char_length(contact) <= 120);

