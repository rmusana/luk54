-- LUK54 Operations module — tables + role write policies
-- reads: all authenticated · writes: admin + operating_partner (investor read-only)
create extension if not exists "pgcrypto";

create table if not exists flock_events (
  id uuid primary key default gen_random_uuid(), project_id text not null default 'LUK54',
  date date not null, event_type text not null, quantity numeric default 0,
  notes text default '', created_at timestamptz default now()
);
create table if not exists flock_sections (
  id uuid primary key default gen_random_uuid(), project_id text not null default 'LUK54',
  section_id text not null, label text default '', bird_count numeric default 0,
  updated_at timestamptz default now(), unique(project_id, section_id)
);
create table if not exists feed_purchases (
  id uuid primary key default gen_random_uuid(), project_id text not null default 'LUK54',
  date date not null, product text not null, qty_kg numeric default 0,
  unit_cost numeric default 0, total_cost numeric default 0, supplier text default '',
  created_at timestamptz default now()
);
create table if not exists feed_inventory (
  id uuid primary key default gen_random_uuid(), project_id text not null default 'LUK54',
  product text not null, closing_stock numeric default 0, purchases numeric default 0,
  consumption numeric default 0, unit_cost numeric default 0,
  updated_at timestamptz default now(), unique(project_id, product)
);
create table if not exists weekly_feed_mix (
  id uuid primary key default gen_random_uuid(), project_id text not null default 'LUK54',
  week_start date not null, week_end date,
  brand_kg numeric default 0, concentrate_kg numeric default 0, lime_powder_kg numeric default 0,
  limestone_kg numeric default 0, soya_kg numeric default 0, sunflower_kg numeric default 0,
  broken_kg numeric default 0, maize_kg numeric default 0, others_kg numeric default 0,
  total_kg numeric default 0, notes text default '', created_at timestamptz default now()
);
create table if not exists health_events (
  id uuid primary key default gen_random_uuid(), project_id text not null default 'LUK54',
  date date not null, type text not null, product text not null,
  notes text default '', created_at timestamptz default now()
);
create table if not exists vaccination_schedule (
  id uuid primary key default gen_random_uuid(), project_id text not null default 'LUK54',
  week int default 1, vaccine text not null, planned_date date,
  status text default 'Pending', notes text default ''
);
create table if not exists health_options (
  id uuid primary key default gen_random_uuid(), project_id text not null default 'LUK54',
  kind text not null, value text not null, created_at timestamptz default now(),
  unique(project_id, kind, value)
);
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(), project_id text not null default 'LUK54',
  name text not null, quantity numeric default 0, unit text default 'pcs',
  updated_at timestamptz default now(), unique(project_id, name)
);
create table if not exists staff_notes (
  id uuid primary key default gen_random_uuid(), project_id text not null default 'LUK54',
  date date not null, content text not null, category text default 'General',
  created_at timestamptz default now()
);
create table if not exists workers (
  id uuid primary key default gen_random_uuid(), project_id text not null default 'LUK54',
  name text not null, payroll numeric default 0, bonus numeric default 0,
  advance numeric default 0, notes text default '', created_at timestamptz default now()
);

-- widen daily_production + sales for full ops UI
alter table daily_production
  add column if not exists section text default 'Combined',
  add column if not exists eggs_trays numeric default 0,
  add column if not exists breakages numeric default 0,
  add column if not exists eggs_lost numeric default 0,
  add column if not exists feed_issued_kg numeric default 0,
  add column if not exists notes text default '';
alter table sales
  add column if not exists sale_category text default 'Eggs',
  add column if not exists egg_type text default '',
  add column if not exists breakage_trays_sold numeric default 0,
  add column if not exists damaged_trays_sold numeric default 0,
  add column if not exists lost_trays numeric default 0,
  add column if not exists payment_ref text default '',
  add column if not exists document_id text default '';

-- RLS: read for all authenticated, write for admin + operating_partner
do $$ declare t text; begin
  foreach t in array array['flock_events','flock_sections','feed_purchases','feed_inventory','weekly_feed_mix','health_events','vaccination_schedule','health_options','inventory','staff_notes','workers','daily_production','sales']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "ops read" on %I', t);
    execute format('create policy "ops read" on %I for select to authenticated using (true)', t);
    execute format('drop policy if exists "ops write" on %I', t);
    execute format('create policy "ops write" on %I for all to authenticated using (app_user_role() in (''admin'',''operating_partner'')) with check (app_user_role() in (''admin'',''operating_partner''))', t);
  end loop;
end $$;

-- seeds
insert into flock_sections (project_id, section_id, label, bird_count) values
 ('LUK54','A','Section A — Young',0),('LUK54','B','Section B — Medium',0),
 ('LUK54','C','Section C — Grown',0),('LUK54','Others','Others',0)
on conflict (project_id, section_id) do nothing;
insert into vaccination_schedule (project_id, week, vaccine, planned_date, status) values
 ('LUK54',1,'NEWCASTLE IB','2026-06-01','Pending'),('LUK54',2,'GUMBOLO 1','2026-06-08','Pending'),
 ('LUK54',3,'GUMBOLO 2','2026-06-15','Pending'),('LUK54',4,'NEWCASTLE LASOTA','2026-06-22','Pending'),
 ('LUK54',8,'NEWCASTLE LASOTA','2026-07-20','Pending'),('LUK54',12,'NEWCASTLE LASOTA','2026-08-17','Pending')
on conflict do nothing;
