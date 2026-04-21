-- Add game status + minimum players settings (admin-set; shown prominently in app)

insert into public.app_settings (key, value)
values
  ('game_status', 'tentative'),
  ('min_players', '10')
on conflict (key) do nothing;

