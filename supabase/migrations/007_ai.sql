-- 007_ai — Gemini key readable by admin only (never shipped to other roles)
create table if not exists ai_config (
  key text primary key,
  value text default ''
);
alter table ai_config enable row level security;
drop policy if exists "ai admin all" on ai_config;
create policy "ai admin all" on ai_config for all to authenticated
  using (app_user_role() = 'admin') with check (app_user_role() = 'admin');
