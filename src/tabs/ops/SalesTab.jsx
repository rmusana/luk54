import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { formatDate, formatNumber, formatUGX, todayEAT } from '../../lib/format.js';
import { DataTable, Field, Modal, useConfirm, useToast } from '../../components/ui.jsx';

const TRAY = 30;
const EGG_TYPES = [
  { id: 'Starter', defaultPrice: 9000 },
  { id: 'Normal', defaultPrice: 11000 },
  { id: 'Medium', defaultPrice: 10000 },
];

export default function SalesTab({ setActions, writable = true }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('sales').select('*').order('date', { ascending: false });
    if (error) toast('error', error.message);
    else setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    setActions(<button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Record sale</button>);
    return () => setActions(null);
  }, []);

  async function onDelete(row) {
    const ok = await confirm({ title: 'Delete sale', message: 'Delete this sale record? This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const { error } = await supabase.from('sales').delete().eq('id', row.id);
    if (error) toast('error', error.message);
    else { toast('success', 'Sale deleted'); load(); }
  }

  const total = rows.reduce((s, r) => s + Number(r.total_revenue || 0), 0);

  return (
    <>
      <div className="card kpi-card mb-4" style={{ maxWidth: 280 }}>
        <div className="kpi-label">Total sales revenue</div>
        <div className="kpi-value">{formatUGX(total)}</div>
      </div>
      {loading ? <div className="skeleton" style={{ height: 140 }} /> : (
        <DataTable
          columns={[
            { key: 'date', label: 'Date', accessor: (r) => formatDate(r.date) },
            { key: 'type', label: 'Type', accessor: (r) => r.sale_category || 'Eggs' },
            { key: 'egg', label: 'Egg type', accessor: (r) => r.egg_type || '—' },
            { key: 'cust', label: 'Customer', accessor: (r) => r.customer || '—' },
            { key: 'trays', label: 'Trays', accessor: (r) => formatNumber(r.quantity_trays, 1) },
            { key: 'price', label: 'Price/tray', accessor: (r) => formatUGX(r.unit_price) },
            { key: 'rev', label: 'Revenue', accessor: (r) => formatUGX(r.total_revenue) },
            { key: 'pay', label: 'Payment', accessor: (r) => r.payment_status || '—' },
          ]}
          rows={rows}
          actions={writable ? [{ id: 'delete', label: 'Delete', danger: true }] : null}
          onAction={(a, row) => { if (a === 'delete') onDelete(row); }}
          emptyMessage="No sales recorded yet."
        />
      )}
      {showForm && <SaleForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </>
  );
}

function SaleForm({ onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({
    date: todayEAT(), sale_category: 'Eggs', egg_type: 'Normal', customer: '',
    quantity_trays: '', unit_price: '11000', breakage_trays_sold: '0', damaged_trays_sold: '0',
    lost_trays: '0', payment_status: 'Cash', payment_ref: '', notes: '',
  });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState('Save');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function onEggType(e) {
    const found = EGG_TYPES.find((x) => x.id === e.target.value);
    setF({ ...f, egg_type: e.target.value, unit_price: found ? String(found.defaultPrice) : f.unit_price });
  }

  async function save() {
    if (!f.date || !f.quantity_trays || !f.unit_price) { toast('error', 'Date, quantity and price are required'); return; }
    setBusy(true);
    setBusyLabel('Saving…');
    let documentId = '';
    if (file) {
      setBusyLabel('Uploading…');
      const path = 'LUK54/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const { error } = await supabase.storage.from('receipts').upload(path, file);
      if (error) { setBusy(false); toast('error', error.message || 'Upload failed'); return; }
      documentId = path;
      setBusyLabel('Saving…');
    }
    const trays = Number(f.quantity_trays) || 0;
    const price = Number(f.unit_price) || 0;
    const { error } = await supabase.from('sales').insert({
      project_id: 'LUK54', date: f.date, customer: f.customer || '',
      quantity_trays: trays, quantity_eggs: trays * TRAY, unit_price: price,
      total_revenue: trays * price, sale_category: f.sale_category, egg_type: f.egg_type,
      payment_status: f.payment_status, payment_ref: f.payment_ref || '',
      breakage_trays_sold: Number(f.breakage_trays_sold) || 0,
      damaged_trays_sold: Number(f.damaged_trays_sold) || 0,
      lost_trays: Number(f.lost_trays) || 0, notes: f.notes || '', document_id: documentId,
    });
    setBusy(false);
    if (error) toast('error', error.message);
    else { toast('success', 'Sale recorded'); onSaved(); }
  }

  return (
    <Modal title="Record sale" size="lg" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? busyLabel : 'Save'}</button></>}>
      <Field label="Date" type="date" required value={f.date} onChange={set('date')} />
      <div className="form-row">
        <Field label="Sale type" type="select" value={f.sale_category} onChange={set('sale_category')} options={['Eggs', 'Litter', 'Others']} />
        <Field label="Egg type" type="select" value={f.egg_type} onChange={onEggType} options={EGG_TYPES.map((e) => e.id)} />
      </div>
      <Field label="Customer" value={f.customer} onChange={set('customer')} />
      <div className="form-row">
        <Field label="Quantity (trays)" type="number" required hint="30 eggs per tray" value={f.quantity_trays} onChange={set('quantity_trays')} />
        <Field label="Price per tray (UGX)" type="number" required value={f.unit_price} onChange={set('unit_price')} />
      </div>
      <p className="u-text-xs u-text-muted mb-3">Starter / Normal / Medium have different tray prices — adjust as needed.</p>
      <div className="form-row">
        <Field label="Breakage sold (trays)" type="number" value={f.breakage_trays_sold} onChange={set('breakage_trays_sold')} />
        <Field label="Damaged sold (trays)" type="number" value={f.damaged_trays_sold} onChange={set('damaged_trays_sold')} />
        <Field label="Lost in exchange (trays)" type="number" value={f.lost_trays} onChange={set('lost_trays')} />
      </div>
      <Field label="Payment status" type="select" value={f.payment_status} onChange={set('payment_status')} options={['Cash', 'Cheque', 'Debt']} />
      <Field label="Payment reference / cheque no." value={f.payment_ref} onChange={set('payment_ref')} />
      <Field label="Notes" type="textarea" value={f.notes} onChange={set('notes')} />
      <div className="form-group">
        <label className="form-label">Receipt (optional)</label>
        <input className="form-input" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
          onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
        <div className="form-hint">Stored with this sale for evidence.</div>
      </div>
    </Modal>
  );
}
