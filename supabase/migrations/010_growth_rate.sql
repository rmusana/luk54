-- 010_growth_rate — standalone daily production growth ledger by block.
-- Independent of summary, cashflow, forecast, reports, dashboard and alerts.

create table if not exists growth_blocks (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  name text not null,
  sort_order integer not null default 0,
  created_at timestamptz default now(),
  unique (project_id, name)
);

create table if not exists growth_rate_entries (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  block_id uuid not null references growth_blocks(id) on delete cascade,
  date date not null,
  production_trays numeric not null default 0,
  unbundled_eggs numeric not null default 0,
  created_at timestamptz default now(),
  unique (project_id, block_id, date)
);

create index if not exists growth_rate_entries_block_date_idx
  on growth_rate_entries (project_id, block_id, date);

alter table growth_blocks enable row level security;
alter table growth_rate_entries enable row level security;

drop policy if exists "growth blocks read" on growth_blocks;
create policy "growth blocks read" on growth_blocks for select to authenticated using (true);

drop policy if exists "growth blocks write" on growth_blocks;
create policy "growth blocks write" on growth_blocks for all to authenticated
  using (app_user_role() in ('admin', 'investment_partner'))
  with check (app_user_role() in ('admin', 'investment_partner'));

drop policy if exists "growth entries read" on growth_rate_entries;
create policy "growth entries read" on growth_rate_entries for select to authenticated using (true);

drop policy if exists "growth entries write" on growth_rate_entries;
create policy "growth entries write" on growth_rate_entries for all to authenticated
  using (app_user_role() in ('admin', 'investment_partner'))
  with check (app_user_role() in ('admin', 'investment_partner'));

insert into growth_blocks (project_id, name, sort_order) values
  ('LUK54', 'C', 3),
  ('LUK54', 'D', 4),
  ('LUK54', 'E', 5)
on conflict (project_id, name) do nothing;
