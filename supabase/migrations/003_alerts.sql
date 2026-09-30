-- 003_alerts — alerts inbox (mirrors Alerts.gs)
create table if not exists alerts (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  priority text not null default 'Medium',
  title text not null,
  reason text default '',
  suggested_action text default '',
  type text default 'System',
  status text not null default 'Open',
  deadline text default '',
  created_at timestamptz default now(),
  resolved_at timestamptz
);
alter table alerts enable row level security;
drop policy if exists "alerts read" on alerts;
create policy "alerts read" on alerts for select to authenticated using (true);
drop policy if exists "alerts write" on alerts;
create policy "alerts write" on alerts for all to authenticated
  using (app_user_role() in ('admin','operating_partner')) with check (app_user_role() in ('admin','operating_partner'));

alter table inventory add column if not exists reorder_level numeric default 0;
