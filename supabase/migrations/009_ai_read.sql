-- 009_ai_read — let every role allowed to chat read the AI key.
-- Writes stay admin-only. Note: the key is used client-side, so anyone who
-- can open the Assistant can technically see it in devtools. Acceptable for
-- a free-tier key; a server-side proxy would be the next step if that changes.
drop policy if exists "ai admin all" on ai_config;
drop policy if exists "ai read" on ai_config;
create policy "ai read" on ai_config for select to authenticated
  using (app_user_role() in ('admin','investment_partner','operating_partner'));
drop policy if exists "ai admin write" on ai_config;
create policy "ai admin write" on ai_config for all to authenticated
  using (app_user_role() = 'admin') with check (app_user_role() = 'admin');
