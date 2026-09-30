-- 004_documents — evidence library metadata (files live in storage.receipts)
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'LUK54',
  name text not null,
  path text not null,
  size_bytes numeric default 0,
  mime_type text default '',
  category text default 'Receipt',
  linked_table text default '',
  linked_id text default '',
  notes text default '',
  uploaded_by text default '',
  created_at timestamptz default now()
);
alter table documents enable row level security;
drop policy if exists "docs read" on documents;
create policy "docs read" on documents for select to authenticated using (true);
drop policy if exists "docs insert" on documents;
create policy "docs insert" on documents for insert to authenticated with check (true);
drop policy if exists "docs delete" on documents;
create policy "docs delete" on documents for delete to authenticated
  using (app_user_role() in ('admin','operating_partner'));
