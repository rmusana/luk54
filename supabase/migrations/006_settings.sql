-- 006_settings — key/value app settings
create table if not exists app_settings (
  key text primary key,
  value text default ''
);
alter table app_settings enable row level security;
drop policy if exists "settings read" on app_settings;
create policy "settings read" on app_settings for select to authenticated using (true);
drop policy if exists "settings write" on app_settings;
create policy "settings write" on app_settings for all to authenticated
  using (app_user_role() = 'admin') with check (app_user_role() = 'admin');

insert into app_settings (key, value) values
 ('project_name', 'LUK54'), ('start_date', '2026-06-01'), ('planned_birds', '2500'),
 ('commercial_week', '25'), ('commercial_laying_pct', '85'),
 ('production_target_min', '88'), ('production_target_max', '92'),
 ('off_lay_pct', '80'), ('statement_due_day', '10'),
 ('investor_name', 'Investment Partner'), ('investor_emails', 'investor@luk54.com'), ('investor_phone', ''),
 ('manager_name', 'Operating Partner'), ('manager_emails', 'operations@luk54.com'), ('manager_phone', ''),
 ('alert_emails', 'investor@luk54.com,operations@luk54.com'),
 ('currency', 'UGX')
on conflict (key) do nothing;
