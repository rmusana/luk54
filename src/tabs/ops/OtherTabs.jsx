import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { audit } from '../../lib/audit.js';
import { formatDate, formatNumber, formatUGX, todayEAT } from '../../lib/format.js';
import { DataTable, Field, Modal, useConfirm, useToast } from '../../components/ui.jsx';

export function MortalityTab() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from('daily_production').select('*').order('date', { ascending: false }).then(({ data, error }) => {
      if (error) toast('error', error.message);
      else setRows((data || []).filter((r) => Number(r.mortality) > 0));
      setLoading(false);
    });
  }, []);
  return loading ? <div className="skeleton" style={{ height: 140 }} /> : (
    <DataTable columns={[
      { key: 'd', label: 'Date', accessor: (r) => formatDate(r.date) },
      { key: 'm', label: 'Deaths', accessor: (r) => formatNumber(r.mortality) },
      { key: 'r', label: 'Rate %', accessor: (r) => r.opening_birds ? Math.round((Number(r.mortality) / Number(r.opening_birds)) * 1000) / 10 : '—' },
      { key: 'n', label: 'Notes', accessor: (r) => r.notes || '—' },
    ]} rows={rows} emptyMessage="No mortality recorded in daily logs." />
  );
}

export function InventoryTab({ setActions, writable = true }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('inventory').select('*').order('name');
    if (error) toast('error', error.message);
    else setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    setActions(<button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Adjust stock</button>);
    return () => setActions(null);
  }, []);

  return (
    <>
      {loading ? <div className="skeleton" style={{ height: 120 }} /> : (
        <DataTable columns={[
          { key: 'n', label: 'Item', accessor: (r) => r.name },
          { key: 'q', label: 'Qty', accessor: (r) => formatNumber(r.quantity) },
          { key: 'u', label: 'Unit', accessor: (r) => r.unit || '—' },
        ]} rows={rows} emptyMessage="No inventory items." />
      )}
      {showForm && <InventoryForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function InventoryForm({ onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ name: '', quantity: '', unit: 'pcs' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    if (!f.name || f.quantity === '') { toast('error', 'Item and quantity are required'); return; }
    setBusy(true);
    const { error } = await supabase.from('inventory').upsert(
      { project_id: 'LUK54', name: f.name, quantity: Number(f.quantity) || 0, unit: f.unit || 'pcs' },
      { onConflict: 'project_id,name' });
    setBusy(false);
    if (error) toast('error', error.message);
    else { audit('UPDATE', 'inventory', '', 'Adjusted ' + f.name + ' to ' + f.quantity); toast('success', 'Inventory updated'); onSaved(); }
  }
  return (
    <Modal title="Adjust inventory" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Field label="Item name" required value={f.name} onChange={set('name')} />
      <Field label="Quantity" type="number" required value={f.quantity} onChange={set('quantity')} />
      <Field label="Unit" value={f.unit} onChange={set('unit')} />
    </Modal>
  );
}

export function WorkersTab({ setActions, writable = true }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(undefined);
  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('workers').select('*').order('name');
    if (error) toast('error', error.message);
    else setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    setActions(<button className="btn btn-primary btn-sm" onClick={() => setEditing(null)}>+ Add worker</button>);
    return () => setActions(null);
  }, []);
  async function onDelete(row) {
    const ok = await confirm({ title: 'Delete worker', message: 'Remove this worker record?', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const { error } = await supabase.from('workers').delete().eq('id', row.id);
    if (error) toast('error', error.message);
    else { audit('DELETE', 'workers', row.id, 'Removed worker ' + (row.name || '')); toast('success', 'Worker deleted'); load(); }
  }
  return (
    <>
      {loading ? <div className="skeleton" style={{ height: 140 }} /> : (
        <DataTable columns={[
          { key: 'n', label: 'Name', accessor: (r) => r.name },
          { key: 'p', label: 'Payroll', accessor: (r) => formatUGX(r.payroll) },
          { key: 'b', label: 'Bonus', accessor: (r) => formatUGX(r.bonus) },
          { key: 'a', label: 'Advance', accessor: (r) => formatUGX(r.advance) },
          { key: 'n2', label: 'Notes', accessor: (r) => r.notes || '—' },
        ]} rows={rows}
          actions={writable ? [{ id: 'edit', label: 'Edit' }, { id: 'delete', label: 'Delete', danger: true }] : null}
          onAction={(a, row) => { if (a === 'edit') setEditing(row); if (a === 'delete') onDelete(row); }}
          emptyMessage="No workers yet. Add payroll, bonus and advance here." />
      )}
      {editing !== undefined && <WorkerForm existing={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); load(); }} />}
    </>
  );
}

function WorkerForm({ existing, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({
    name: existing ? existing.name || '' : '',
    payroll: existing ? String(existing.payroll ?? 0) : '0',
    bonus: existing ? String(existing.bonus ?? 0) : '0',
    advance: existing ? String(existing.advance ?? 0) : '0',
    notes: existing ? existing.notes || '' : '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    if (!f.name) { toast('error', 'Worker name is required'); return; }
    setBusy(true);
    const payload = { project_id: 'LUK54', name: f.name, payroll: Number(f.payroll) || 0, bonus: Number(f.bonus) || 0, advance: Number(f.advance) || 0, notes: f.notes || '' };
    const { data: insData, error } = existing
      ? await supabase.from('workers').update(payload).eq('id', existing.id).select('id').single()
      : await supabase.from('workers').insert(payload).select('id').single();
    setBusy(false);
    if (error) toast('error', error.message);
    else { audit(existing ? 'UPDATE' : 'CREATE', 'workers', insData?.id || existing?.id, (existing ? 'Edited ' : 'Added ') + f.name); toast('success', 'Worker saved'); onSaved(); }
  }
  return (
    <Modal title={existing ? 'Edit worker' : 'Add worker'} onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Field label="Worker name" required value={f.name} onChange={set('name')} />
      <div className="form-row">
        <Field label="Payroll (UGX)" type="number" value={f.payroll} onChange={set('payroll')} />
        <Field label="Bonus (UGX)" type="number" value={f.bonus} onChange={set('bonus')} />
        <Field label="Advance (UGX)" type="number" value={f.advance} onChange={set('advance')} />
      </div>
      <Field label="Notes" type="textarea" value={f.notes} onChange={set('notes')} />
    </Modal>
  );
}

export function NotesTab({ setActions, writable = true }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('staff_notes').select('*').order('date', { ascending: false });
    if (error) toast('error', error.message);
    else setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    setActions(<button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Add note</button>);
    return () => setActions(null);
  }, []);
  async function onDelete(row) {
    const ok = await confirm({ title: 'Delete note', message: 'Delete this note?', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const { error } = await supabase.from('staff_notes').delete().eq('id', row.id);
    if (error) toast('error', error.message);
    else { audit('DELETE', 'staff_notes', row.id, 'Deleted note'); toast('success', 'Note deleted'); load(); }
  }
  return (
    <>
      {loading ? <div className="skeleton" style={{ height: 120 }} /> : (
        <DataTable columns={[
          { key: 'd', label: 'Date', accessor: (r) => formatDate(r.date) },
          { key: 'c', label: 'Category', accessor: (r) => r.category || 'General' },
          { key: 'n', label: 'Note', accessor: (r) => r.content || '—' },
        ]} rows={rows}
          actions={writable ? [{ id: 'delete', label: 'Delete', danger: true }] : null}
          onAction={(a, row) => { if (a === 'delete') onDelete(row); }}
          emptyMessage="No staff notes." />
      )}
      {showForm && <NoteForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function NoteForm({ onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ date: todayEAT(), category: 'General', content: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    if (!f.content) { toast('error', 'Note text is required'); return; }
    setBusy(true);
    const { data: insData, error } = await supabase.from('staff_notes').insert({ project_id: 'LUK54', date: f.date, content: f.content, category: f.category }).select('id').single();
    setBusy(false);
    if (error) toast('error', error.message);
    else { audit('CREATE', 'staff_notes', insData?.id, f.category + ' note on ' + f.date); toast('success', 'Note saved'); onSaved(); }
  }
  return (
    <Modal title="Staff note" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Field label="Date" type="date" value={f.date} onChange={set('date')} />
      <Field label="Category" type="select" value={f.category} onChange={set('category')}
        options={['General', 'Production', 'Health', 'Feed', 'Staff', 'Other']} />
      <Field label="Note" type="textarea" required value={f.content} onChange={set('content')} />
    </Modal>
  );
}
