/* Silent audit trail — records who did what. Admin-only visibility. */
import { supabase } from './supabaseClient.js';

let actor = { email: '', role: '' };
export function setActor(email, role) {
  actor = { email: email || '', role: role || '' };
}

export async function audit(action, table, recordId, detail) {
  try {
    if (!actor.email) return;
    await supabase.from('audit_log').insert({
      actor_email: actor.email, actor_role: actor.role, action,
      table_name: table || '', record_id: recordId != null ? String(recordId) : '',
      detail: detail || '',
    });
  } catch (e) { /* never break the app for auditing */ }
}
