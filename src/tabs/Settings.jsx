import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { formatDate } from '../lib/format.js';
import { audit } from '../lib/audit.js';
import { Badge, DataTable, Field, Modal, useConfirm, useToast } from '../components/ui.jsx';

const ROLE_LABEL = { admin: 'Administrator', operating_partner: 'Operating Partner', investment_partner: 'Investment Partner' };
const ROLES = ['admin', 'operating_partner', 'investment_partner'];

const PROJECT_KEYS = [
  ['project_name', 'Project name'], ['start_date', 'Start date'], ['planned_birds', 'Planned birds'],
  ['commercial_week', 'Commercial week'], ['commercial_laying_pct', 'Commercial laying %'],
  ['production_target_min', 'Production target min %'], ['production_target_max', 'Production target max %'],
  ['off_lay_pct', 'Off-lay threshold %'], ['statement_due_day', 'Statement due day'],
];
const CONTACT_KEYS = [
  ['investor_name', 'Investor name'], ['investor_emails', 'Investor emails'], ['investor_phone', 'Investor phone'],
  ['manager_name', 'Manager name'], ['manager_emails', 'Manager emails'], ['manager_phone', 'Manager phone'],
];
const NOTIF_KEYS = [['alert_emails', 'Alert emails (comma separated)']];

export default function Settings({ setActions }) {
  const toast = useToast();
  const [section, setSection] = useState('project');
  const [settings, setSettings] = useState({});
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data: s, error: e1 } = await supabase.from('app_settings').select('*');
      if (e1) throw e1;
      const map = {};
      (s || []).forEach((r) => { map[r.key] = r.value; });
      setSettings(map);
      const { data: u, error: e2 } = await supabase.from('profiles').select('*').order('email');
      if (e2) throw e2;
      setUsers(u || []);
    } catch (e) {
      toast('error', e.message || 'Failed to load settings');
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => { return () => setActions(null); }, []);

  async function saveKeys(obj) {
    try {
      for (const [k, v] of Object.entries(obj)) {
        const { error } = await supabase.from('app_settings').upsert({ key: k, value: String(v ?? '') }, { onConflict: 'key' });
        if (error) throw error;
      }
      audit('UPDATE', 'app_settings', '', 'Settings updated: ' + Object.keys(obj).join(', '));
      toast('success', 'Settings saved');
      load();
    } catch (e) {
      toast('error', e.message || 'Save failed');
    }
  }

  const SECS = [
    ['project', 'Project'], ['contacts', 'Contacts'], ['users', 'Users & Roles'],
    ['notifications', 'Notifications'], ['security', 'Security'], ['activity', 'Activity Log'], ['backup', 'Backup'],
  ];

  return (
    <>
      <div className="pill-tabs">
        {SECS.map(([id, label]) => (
          <button key={id} className={'btn btn-sm ' + (section === id ? 'btn-primary' : 'btn-ghost')}
            onClick={() => setSection(id)}>{label}</button>
        ))}
      </div>
      {loading ? <div className="skeleton" style={{ height: 160 }} /> : (
        <div key={section}>
          {(section === 'project' || section === 'contacts' || section === 'notifications') && (
            <SettingsForm
              keys={section === 'project' ? PROJECT_KEYS : section === 'contacts' ? CONTACT_KEYS : NOTIF_KEYS}
              values={settings} onSave={saveKeys} />
          )}
          {section === 'users' && <UsersSec users={users} onChanged={load} />}
          {section === 'security' && <SecuritySec />}
          {section === 'activity' && <ActivitySec />}
          {section === 'backup' && <BackupSec />}
        </div>
      )}
    </>
  );
}

function SettingsForm({ keys, values, onSave }) {
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const init = {};
    keys.forEach(([k]) => { init[k] = values[k] ?? ''; });
    setF(init);
  }, [values]);
  async function save() {
    setBusy(true);
    await onSave(f);
    setBusy(false);
  }
  return (
    <div className="card pad-4">
      {keys.map(([k, label]) => (
        <Field key={k} label={label} value={f[k] ?? ''} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
      ))}
      <button className="btn btn-primary btn-sm" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button>
    </div>
  );
}

function UsersSec({ users, onChanged }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [editing, setEditing] = useState(null);

  async function setRole(u, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id);
    if (error) toast('error', error.message);
    else { audit('UPDATE', 'profiles', u.id, 'Role changed to ' + role + ' for ' + u.email); toast('success', 'Role updated'); onChanged(); }
  }
  async function deactivate(u) {
    const ok = await confirm({ title: 'Deactivate user', message: 'Deactivate ' + u.email + '? They will no longer be able to sign in (delete the login in Authentication to fully remove).', confirmLabel: 'Deactivate', danger: true });
    if (!ok) return;
    toast('error', 'Deactivation is done in Supabase → Authentication → Users. Roles here control access.');
  }

  return (
    <>
      <div className="card pad-3 mb-4"><span className="u-text-xs u-text-muted">Logins are created in Supabase → Authentication. New accounts are approved from here by assigning a role. To onboard someone, send their email + temp password to the system builder.</span></div>
      <DataTable columns={[
        { key: 'e', label: 'Email', accessor: (r) => r.email },
        { key: 'r', label: 'Role', accessor: (r) => <Badge tone={r.role === 'admin' ? 'critical' : r.role === 'operating_partner' ? 'info' : 'positive'}>{ROLE_LABEL[r.role] || r.role}</Badge> },
        { key: 'c', label: 'Since', accessor: (r) => formatDate(r.created_at) },
      ]} rows={users}
        actions={[{ id: 'role', label: 'Change role' }]}
        onAction={(a, row) => { if (a === 'role') setEditing(row); }}
        emptyMessage="No users." />
      {editing && (
        <Modal title={'Role for ' + editing.email} onClose={() => setEditing(null)}
          footer={<button className="btn btn-secondary" onClick={() => setEditing(null)}>Close</button>}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ROLES.map((r) => (
              <button key={r} className={'btn btn-sm ' + (editing.role === r ? 'btn-primary' : 'btn-secondary')}
                onClick={async () => { await setRole(editing, r); setEditing(null); }}>
                {ROLE_LABEL[r]}
              </button>
            ))}
          </div>
          <p className="u-text-xs u-text-muted" style={{ marginTop: 12 }}>Takes effect on their next refresh. The change itself is recorded in the Activity Log.</p>
          <button className="btn btn-ghost btn-sm" onClick={() => deactivate(editing)}>Deactivate…</button>
        </Modal>
      )}
    </>
  );
}

function SecuritySec() {
  const toast = useToast();
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  async function change() {
    if (!pw.next || pw.next !== pw.confirm) { toast('error', 'Passwords do not match'); return; }
    if (pw.next.length < 6) { toast('error', 'Minimum 6 characters'); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw.next });
    setBusy(false);
    if (error) toast('error', error.message);
    else { audit('UPDATE', 'auth', '', 'Own password changed'); toast('success', 'Password changed'); setPw({ next: '', confirm: '' }); }
  }
  return (
    <div className="card pad-4">
      <h3 className="u-text-sm u-font-semibold mb-3">Change my password</h3>
      <Field label="New password" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} />
      <Field label="Confirm password" type="password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
      <button className="btn btn-primary btn-sm" disabled={busy} onClick={change}>{busy ? 'Saving…' : 'Update password'}</button>
    </div>
  );
}

function ActivitySec() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('all');
  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('audit_log').select('*')
        .order('created_at', { ascending: false }).limit(300);
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      toast('error', e.message || 'Failed to load activity');
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  const actions = ['all', ...new Set(rows.map((r) => r.action))];
  const list = rows.filter((r) => {
    if (action !== 'all' && r.action !== action) return false;
    if (q && !(r.actor_email + ' ' + r.detail + ' ' + r.table_name).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  return (
    <>
      <div className="card pad-3 mb-4"><span className="u-text-xs u-text-muted">Every sign-in and every change, with who and what. Visible to administrators only.</span></div>
      <div className="form-row mb-4" style={{ alignItems: 'end' }}>
        <Field label="Search actor / detail" value={q} onChange={(e) => setQ(e.target.value)} />
        <Field label="Action" type="select" value={action} onChange={(e) => setAction(e.target.value)} options={actions} />
      </div>
      {loading ? <div className="skeleton" style={{ height: 160 }} /> : (
        <DataTable columns={[
          { key: 't', label: 'Time', accessor: (r) => formatDate(r.created_at) },
          { key: 'a', label: 'Actor', accessor: (r) => r.actor_email },
          { key: 'r', label: 'Role', accessor: (r) => r.actor_role || '—' },
          { key: 'ac', label: 'Action', accessor: (r) => <Badge tone={r.action === 'DELETE' ? 'critical' : r.action === 'LOGIN' ? 'info' : 'neutral'}>{r.action}</Badge> },
          { key: 'tb', label: 'Area', accessor: (r) => r.table_name || '—' },
          { key: 'd', label: 'Detail', accessor: (r) => r.detail || '—' },
        ]} rows={list} emptyMessage="No activity recorded yet." />
      )}
    </>
  );
}

const EXPORT_TABLES = ['capital_contributions', 'expenses', 'sales', 'daily_production', 'budget_lines', 'revenue_allocations', 'profit_distributions', 'flock_events', 'flock_sections', 'feed_purchases', 'feed_inventory', 'weekly_feed_mix', 'health_events', 'vaccination_schedule', 'inventory', 'staff_notes', 'workers', 'alerts', 'documents', 'profiles', 'app_settings'];

function BackupSec() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  async function exportAll() {
    setBusy(true);
    try {
      const dump = { exported_at: new Date().toISOString(), project: 'LUK54', tables: {} };
      for (const t of EXPORT_TABLES) {
        const { data, error } = await supabase.from(t).select('*').limit(5000);
        if (error) throw new Error(t + ': ' + error.message);
        dump.tables[t] = data || [];
      }
      const blob = new Blob([JSON.stringify(dump, null, 1)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'luk54-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      audit('EXPORT', 'backup', '', 'Full JSON backup downloaded');
      toast('success', 'Backup downloaded');
    } catch (e) {
      toast('error', e.message || 'Backup failed');
    }
    setBusy(false);
  }
  return (
    <div className="card pad-4">
      <h3 className="u-text-sm u-font-semibold mb-3">Backup & Restore</h3>
      <p className="u-text-sm u-text-secondary mb-4">Downloads every table as one JSON file. Supabase also keeps automatic daily backups. To restore, contact the system builder with the file.</p>
      <button className="btn btn-primary btn-sm" disabled={busy} onClick={exportAll}>{busy ? 'Exporting…' : 'Download full backup'}</button>
    </div>
  );
}
