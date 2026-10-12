-- 008_equity — investor's standalone equity list.
-- Deliberately independent: nothing in the app reads this table except the
-- Equity tab itself (no summary, cashflow, forecast, report or dashboard math).
create table if not exists equity_items (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  date date not null,
  item text not null,
  amount numeric default 0,
  notes text default '',
  created_at timestamptz default now()
);
alter table equity_items enable row level security;
drop policy if exists "equity read" on equity_items;
create policy "equity read" on equity_items for select to authenticated using (true);
drop policy if exists "equity write" on equity_items;
create policy "equity write" on equity_items for all to authenticated
  using (app_user_role() in ('admin','investment_partner')) with check (app_user_role() in ('admin','investment_partner'));
