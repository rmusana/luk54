import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { audit } from '../../lib/audit.js';
import { formatDate, formatNumber, todayEAT } from '../../lib/format.js';
import { DataTable, Field, Modal, useConfirm, useToast } from '../../components/ui.jsx';

export default function FlockTab({ setActions, writable = true }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [sections, setSections] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const [sec, ev] = await Promise.all([
      supabase.from('flock_sections').select('*').order('section_id'),
      supabase.from('flock_events').select('*').order('date', { ascending: false }),
    ]);
    if (sec.error) toast('error', sec.error.message);
    else setSections(sec.data || []);
    if (ev.error) toast('error', ev.error.message);
    else setEvents(ev.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    setActions(<button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Flock event</button>);
    return () => setActions(null);
  }, []);

  const total = sections.reduce((s, r) => s + Number(r.bird_count || 0), 0);

  async function saveSections() {
    setSaving(true);
    for (const s of sections) {
      const { error } = await supabase.from('flock_sections').update({ label: s.label, bird_count: Number(s.bird_count) || 0 }).eq('id', s.id);
      if (error) { toast('error', error.message); setSaving(false); return; }
    }
    setSaving(false);
    audit('UPDATE', 'flock_sections', '', 'Sections saved — total ' + formatNumber(total) + ' birds');
    toast('success', 'Sections saved — total ' + formatNumber(total) + ' birds');
    load();
  }

  async function onDelete(row) {
    const ok = await confirm({ title: 'Delete flock event', message: 'Delete this flock event?', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const { error } = await supabase.from('flock_events').delete().eq('id', row.id);
    if (error) toast('error', error.message);
    else { audit('DELETE', 'flock_events', row.id, 'Deleted event ' + (row.event_type || '')); toast('success', 'Event deleted'); load(); }
  }

  return (
    <>
      <div className="card pad-4 mb-4">
        <h3 className="u-text-sm u-font-semibold mb-3">Batch / sections (editable)</h3>
        <p className="u-text-xs u-text-muted mb-3">Set bird counts per section. Total drives the live flock count.</p>
        {loading ? <div className="skeleton" style={{ height: 80 }} /> : sections.map((s) => (
          <div className="form-row mb-3" key={s.id}>
            <Field label="Label" value={s.label || ''} onChange={(e) => setSections(sections.map((x) => x.id === s.id ? { ...x, label: e.target.value } : x))} />
            <Field label="Birds" type="number" value={s.bird_count ?? 0} onChange={(e) => setSections(sections.map((x) => x.id === s.id ? { ...x, bird_count: e.target.value } : x))} />
          </div>
        ))}
        <div className="kpi-grid mt-4">
          <div className="card kpi-card"><div className="kpi-label">Total birds (all sections)</div>
            <div className="kpi-value">{formatNumber(total)}</div></div>
        </div>
        {writable && <button className="btn btn-secondary mt-4" disabled={saving} onClick={saveSections}>{saving ? 'Saving…' : 'Save sections'}</button>}
      </div>
      <h3 className="u-text-sm u-font-semibold mb-3">Flock events</h3>
      {loading ? <div className="skeleton" style={{ height: 120 }} /> : (
        <DataTable
          columns={[
            { key: 'date', label: 'Date', accessor: (r) => formatDate(r.date) },
            { key: 'event', label: 'Event', accessor: (r) => r.event_type || '—' },
            { key: 'qty', label: 'Qty', accessor: (r) => formatNumber(r.quantity) },
            { key: 'notes', label: 'Notes', accessor: (r) => r.notes || '—' },
          ]}
          rows={events}
          actions={writable ? [{ id: 'delete', label: 'Delete', danger: true }] : null}
          onAction={(a, row) => { if (a === 'delete') onDelete(row); }}
          emptyMessage="No flock events recorded."
        />
      )}
      {showForm && <FlockForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function FlockForm({ onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ date: todayEAT(), event_type: 'Stocking', quantity: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save() {
    if (!f.date || !f.quantity) { toast('error', 'Date and quantity are required'); return; }
    setBusy(true);
    const { data: insData, error } = await supabase.from('flock_events').insert({
      project_id: 'LUK54', date: f.date, event_type: f.event_type,
      quantity: Number(f.quantity) || 0, notes: f.notes || '',
    }).select('id').single();
    setBusy(false);
    if (error) toast('error', error.message);
    else { audit('CREATE', 'flock_events', insData?.id, f.event_type + ' ' + f.quantity + ' on ' + f.date); toast('success', 'Flock event saved'); onSaved(); }
  }

  return (
    <Modal title="Flock event" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Field label="Date" type="date" required value={f.date} onChange={set('date')} />
      <Field label="Event type" type="select" required value={f.event_type} onChange={set('event_type')}
        options={['Stocking', 'Transfer', 'Culling', 'Sale of birds', 'Other']} />
      <Field label="Quantity" type="number" required value={f.quantity} onChange={set('quantity')} />
      <Field label="Notes" type="textarea" value={f.notes} onChange={set('notes')} />
    </Modal>
  );
}
