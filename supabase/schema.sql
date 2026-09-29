-- LUK54 Finance v1 — roles + finance tables (mirrors Finance.gs)
create extension if not exists "pgcrypto";

-- ── Roles ──
-- admin: everything · operating_partner: ops spend · investment_partner: money in/out + views
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin','operating_partner','investment_partner')),
  created_at timestamptz default now()
);
alter table profiles enable row level security;
drop policy if exists "own read" on profiles;
create policy "own read" on profiles for select to authenticated using (auth.uid() = id);

create or replace function app_user_role() returns text
language sql security definer set search_path = public stable as
$$ select role from profiles where id = auth.uid() $$;

drop policy if exists "admin read all" on profiles;
create policy "admin read all" on profiles for select to authenticated using (app_user_role() = 'admin');
drop policy if exists "admin write" on profiles;
create policy "admin write" on profiles for all to authenticated using (app_user_role() = 'admin') with check (app_user_role() = 'admin');

-- ── Capital (disbursements) ──
create table if not exists capital_contributions (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  date date not null,
  amount numeric default 0,
  purpose text default 'General',
  reference text default '',
  document_id text default '',
  created_at timestamptz default now()
);
alter table capital_contributions enable row level security;
drop policy if exists "fin read" on capital_contributions;
create policy "fin read" on capital_contributions for select to authenticated using (true);
drop policy if exists "capital write" on capital_contributions;
create policy "capital write" on capital_contributions for all to authenticated
  using (app_user_role() in ('admin','investment_partner')) with check (app_user_role() in ('admin','investment_partner'));

-- ── Expenses ──
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  date date not null,
  category text not null,
  sub_category text default '',
  amount numeric default 0,
  supplier text default '',
  document_id text default '',
  notes text default '',
  created_at timestamptz default now()
);
alter table expenses enable row level security;
drop policy if exists "fin read" on expenses;
create policy "fin read" on expenses for select to authenticated using (true);
drop policy if exists "expense write" on expenses;
create policy "expense write" on expenses for all to authenticated
  using (app_user_role() in ('admin','operating_partner')) with check (app_user_role() in ('admin','operating_partner'));

-- ── Budget lines ──
create table if not exists budget_lines (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  category text not null,
  sub_item text default '',
  budget_qty numeric default 0,
  budget_unit_cost numeric default 0,
  budget_total numeric default 0,
  actual_total numeric default 0,
  variance numeric default 0,
  unique(project_id, category, sub_item)
);
alter table budget_lines enable row level security;
drop policy if exists "fin read" on budget_lines;
create policy "fin read" on budget_lines for select to authenticated using (true);
drop policy if exists "budget write" on budget_lines;
create policy "budget write" on budget_lines for all to authenticated
  using (app_user_role() in ('admin','operating_partner')) with check (app_user_role() in ('admin','operating_partner'));

-- ── Revenue allocation ──
create table if not exists revenue_allocations (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  month text not null,
  gross_sales_revenue numeric default 0,
  feed_allocation numeric default 0,
  gross_profit numeric default 0,
  operating_partner_share numeric default 0,
  net_profit_to_investor numeric default 0,
  status text default 'Finalized',
  paid_date text default '',
  unique(project_id, month)
);
alter table revenue_allocations enable row level security;
drop policy if exists "fin read" on revenue_allocations;
create policy "fin read" on revenue_allocations for select to authenticated using (true);
drop policy if exists "allocation write" on revenue_allocations;
create policy "allocation write" on revenue_allocations for all to authenticated
  using (app_user_role() in ('admin','investment_partner')) with check (app_user_role() in ('admin','investment_partner'));

-- ── Profit distributions ──
create table if not exists profit_distributions (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  month text not null,
  amount numeric default 0,
  paid_date text default '',
  reference text default '',
  document_id text default '',
  status text default 'Pending'
);
alter table profit_distributions enable row level security;
drop policy if exists "fin read" on profit_distributions;
create policy "fin read" on profit_distributions for select to authenticated using (true);
drop policy if exists "profit write" on profit_distributions;
create policy "profit write" on profit_distributions for all to authenticated
  using (app_user_role() in ('admin','investment_partner')) with check (app_user_role() in ('admin','investment_partner'));

-- ── Minimal sales + daily (allocation & commercial math; full UI lands with Operations) ──
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  date date not null, customer text default '',
  quantity_trays numeric default 0, quantity_eggs numeric default 0,
  unit_price numeric default 0, total_revenue numeric default 0,
  payment_status text default 'Cash', notes text default '',
  created_at timestamptz default now()
);
alter table sales enable row level security;
drop policy if exists "fin read" on sales;
create policy "fin read" on sales for select to authenticated using (true);

create table if not exists daily_production (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  date date not null,
  opening_birds numeric default 0, mortality numeric default 0, closing_birds numeric default 0,
  eggs_collected numeric default 0,
  created_at timestamptz default now()
);
alter table daily_production enable row level security;
drop policy if exists "fin read" on daily_production;
create policy "fin read" on daily_production for select to authenticated using (true);

-- ── Receipts bucket ──
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
on conflict (id) do nothing;
drop policy if exists "auth read receipts" on storage.objects;
create policy "auth read receipts" on storage.objects for select to authenticated using (bucket_id = 'receipts');
drop policy if exists "auth write receipts" on storage.objects;
create policy "auth write receipts" on storage.objects for insert to authenticated with check (bucket_id = 'receipts');
drop policy if exists "auth delete receipts" on storage.objects;
create policy "auth delete receipts" on storage.objects for delete to authenticated using (bucket_id = 'receipts');
