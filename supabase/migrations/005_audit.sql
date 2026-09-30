-- 005_audit — silent activity trail, admin eyes only
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text not null default '',
  actor_role text not null default '',
  action text not null,
  table_name text default '',
  record_id text default '',
  detail text default '',
  created_at timestamptz default now()
);
alter table audit_log enable row level security;
drop policy if exists "audit insert" on audit_log;
create policy "audit insert" on audit_log for insert to authenticated with check (true);
drop policy if exists "audit admin read" on audit_log;
create policy "audit admin read" on audit_log for select to authenticated using (app_user_role() = 'admin');

-- documents: delete restricted to admin only
drop policy if exists "docs delete" on documents;
create policy "docs delete" on documents for delete to authenticated using (app_user_role() = 'admin');
