import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { formatDate, formatNumber, formatUGX, todayEAT } from '../../lib/format.js';
import { BUDGET_SEED, CAPITAL_PURPOSES, EXPENSE_CATEGORIES, canWrite, cashflowEvents, computeAllocation, financialSummary, forecast, isCommercial, matchBudgetLine, sum } from '../../lib/finance.js';
import { Badge, DataTable, Field, Modal, useConfirm, useToast } from '../../components/ui.jsx';

function useFinTable(table, order = 'date') {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from(table).select('*').order(order, { ascending: false }).limit(500);
    if (error) toast('error', error.message);
    else setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [table]);
  return { rows, loading, reload: load, setRows };
}

function uploadReceipt(file, setBusyLabel) {
  return (async () => {
    const path = 'LUK54/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    if (setBusyLabel) setBusyLabel('Uploading…');
    const { error } = await supabase.storage.from('receipts').upload(path, file);
    if (error) throw error;
    return path;
  })();
}

/* ── Summary ── */
export function SummarySec({ data }) {
  const s = data.summary;
  if (!s) return <div className="skeleton" style={{ height: 140 }} />;
  const fc = forecast(s, data.sales, data.expenses, 30);
  const items = [
    ['Total Investment', formatUGX(s.totalInvestment)],
    ['Total Expenses', formatUGX(s.totalExpenses)],
    ['Sales Revenue', formatUGX(s.grossSalesRevenue)],
    ['Cash Position', formatUGX(s.cashPosition)],
    ['Net Profit (investor)', formatUGX(s.netProfitToInvestor)],
    ['ROI', s.roi + '%'],
    ['Funded', s.fundedPct + '% (' + s.fundingStatus + ')'],
    ['Outstanding Funding', formatUGX(s.outstandingFunding)],
    ['Budget vs Actual', formatUGX(s.budgetActual) + ' / ' + formatUGX(s.budgetTotal)],
  ];
  return (
    <>
      {!s.commercialReached && (
        <div className="card pad-4 mb-4"><span className="u-text-sm">Pre-commercial: allocation formula activates at ≥85% production or week 25.</span></div>
      )}
      <div className="kpi-grid mb-4">
        {items.map(([l, v]) => <div className="card kpi-card" key={l}><div className="kpi-label">{l}</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{v}</div></div>)}
      </div>
      <h3 className="u-text-sm u-font-semibold mb-3">30-day outlook</h3>
      <div className="kpi-grid">
        <div className="card kpi-card"><div className="kpi-label">Projected revenue</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{formatUGX(fc.projectedRevenue)}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Projected expenses</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{formatUGX(fc.projectedExpenses)}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Projected cash</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{formatUGX(fc.projectedCash)}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Funding required</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{formatUGX(fc.fundingRequired)}</div></div>
      </div>
    </>
  );
}

/* ── Disbursements (capital) ── */
export function CapitalSec({ role, setActions }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { rows, loading, reload } = useFinTable('capital_contributions');
  const [show, setShow] = useState(false);
  const writable = canWrite(role, 'capital');
  useEffect(() => {
    setActions(writable ? <button className="btn btn-primary btn-sm" onClick={() => setShow(true)}>+ Record disbursement</button>
      : <span className="u-text-xs u-text-muted">Only Investment Partner / Admin can record disbursements</span>);
    return () => setActions(null);
  }, []);
  async function onDelete(row) {
    const ok = await confirm({ title: 'Delete disbursement', message: 'Delete this contribution? This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const { error } = await supabase.from('capital_contributions').delete().eq('id', row.id);
    if (error) toast('error', error.message);
    else { toast('success', 'Deleted'); reload(); }
  }
  const total = sum(rows, 'amount');
  return (
    <>
      <div className="card kpi-card mb-4" style={{ maxWidth: 280 }}>
        <div className="kpi-label">Total disbursed</div>
        <div className="kpi-value">{formatUGX(total)}</div>
      </div>
      {loading ? <div className="skeleton" style={{ height: 140 }} /> : (
        <DataTable columns={[
          { key: 'd', label: 'Date', accessor: (r) => formatDate(r.date) },
          { key: 'a', label: 'Amount', accessor: (r) => formatUGX(r.amount) },
          { key: 'p', label: 'Purpose', accessor: (r) => r.purpose || 'General' },
          { key: 'r', label: 'Reference', accessor: (r) => r.reference || '—' },
        ]} rows={rows}
          actions={writable ? [{ id: 'delete', label: 'Delete', danger: true }] : null}
          onAction={(a, row) => { if (a === 'delete') onDelete(row); }}
          emptyMessage="No disbursements recorded." />
      )}
      {show && <CapitalForm onClose={() => setShow(false)} onSaved={() => { setShow(false); reload(); }} />}
    </>
  );
}

function CapitalForm({ onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ date: todayEAT(), amount: '', purpose: 'General', reference: '', notes: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('Save');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    if (!f.date || !f.amount) { toast('error', 'Date and amount are required'); return; }
    setBusy(true); setLabel('Saving…');
    let documentId = '';
    if (file) {
      try { documentId = await uploadReceipt(file, setLabel); setLabel('Saving…'); }
      catch (e) { setBusy(false); toast('error', e.message || 'Upload failed'); return; }
    }
    const { error } = await supabase.from('capital_contributions').insert({
      project_id: 'LUK54', date: f.date, amount: Number(f.amount) || 0,
      purpose: f.purpose || 'General', reference: f.reference || '', document_id: documentId,
    });
    setBusy(false);
    if (error) toast('error', error.message);
    else { toast('success', 'Disbursement recorded'); onSaved(); }
  }
  return (
    <Modal title="Record disbursement" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? label : 'Save'}</button></>}>
      <Field label="Date" type="date" required value={f.date} onChange={set('date')} />
      <Field label="Amount (UGX)" type="number" required value={f.amount} onChange={set('amount')} />
      <Field label="Purpose" type="select" value={f.purpose} onChange={set('purpose')} options={CAPITAL_PURPOSES} />
      <Field label="Reference" value={f.reference} onChange={set('reference')} />
      <div className="form-group">
        <label className="form-label">Receipt (optional)</label>
        <input className="form-input" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
          onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
        <div className="form-hint">Stored with this disbursement for evidence.</div>
      </div>
    </Modal>
  );
}

/* ── Expenses ── */
export function ExpensesSec({ role, setActions }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { rows, loading, reload } = useFinTable('expenses');
  const [show, setShow] = useState(false);
  const writable = canWrite(role, 'expenses');
  useEffect(() => {
    setActions(writable ? <button className="btn btn-primary btn-sm" onClick={() => setShow(true)}>+ Record expense</button>
      : <span className="u-text-xs u-text-muted">Only Operating Partner / Administrator can record expenses</span>);
    return () => setActions(null);
  }, []);
  async function onDelete(row) {
    const ok = await confirm({ title: 'Delete expense', message: 'Delete this expense? This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const { error } = await supabase.from('expenses').delete().eq('id', row.id);
    if (error) toast('error', error.message);
    else { toast('success', 'Deleted'); reload(); }
  }
  const total = sum(rows, 'amount');
  return (
    <>
      <div className="card kpi-card mb-4" style={{ maxWidth: 280 }}>
        <div className="kpi-label">Total expenses</div>
        <div className="kpi-value">{formatUGX(total)}</div>
      </div>
      {loading ? <div className="skeleton" style={{ height: 140 }} /> : (
        <DataTable columns={[
          { key: 'd', label: 'Date', accessor: (r) => formatDate(r.date) },
          { key: 'c', label: 'Category', accessor: (r) => r.category },
          { key: 's', label: 'Detail', accessor: (r) => r.sub_category || '—' },
          { key: 'a', label: 'Amount', accessor: (r) => formatUGX(r.amount) },
          { key: 'sup', label: 'Supplier', accessor: (r) => r.supplier || '—' },
        ]} rows={rows}
          actions={writable ? [{ id: 'delete', label: 'Delete', danger: true }] : null}
          onAction={(a, row) => { if (a === 'delete') onDelete(row); }}
          emptyMessage="No expenses recorded." />
      )}
      {show && <ExpenseForm onClose={() => setShow(false)} onSaved={() => { setShow(false); reload(); }} />}
    </>
  );
}

function ExpenseForm({ onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ date: todayEAT(), category: 'Feeds', sub_category: '', amount: '', supplier: '', notes: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [label, setLabel] = useState('Save');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    if (!f.date || !f.category || !f.amount) { toast('error', 'Date, category and amount are required'); return; }
    setBusy(true); setLabel('Saving…');
    let documentId = '';
    if (file) {
      try { documentId = await uploadReceipt(file, setLabel); setLabel('Saving…'); }
      catch (e) { setBusy(false); toast('error', e.message || 'Upload failed'); return; }
    }
    const amount = Number(f.amount) || 0;
    const { error } = await supabase.from('expenses').insert({
      project_id: 'LUK54', date: f.date, category: f.category, sub_category: f.sub_category || '',
      amount, supplier: f.supplier || '', document_id: documentId, notes: f.notes || '',
    });
    if (error) { setBusy(false); toast('error', error.message); return; }
    // mirror updateBudgetActual: category + sub-item substring, fallback category-only
    try {
      const { data: lines } = await supabase.from('budget_lines').select('*').eq('project_id', 'LUK54');
      const hit = matchBudgetLine(lines || [], f.category, f.sub_category);
      if (hit) {
        const actual = Number(hit.actual_total || 0) + amount;
        await supabase.from('budget_lines').update({ actual_total: actual, variance: actual - Number(hit.budget_total || 0) }).eq('id', hit.id);
      }
    } catch (e) { /* budget roll-up is best-effort */ }
    setBusy(false);
    toast('success', 'Expense recorded');
    onSaved();
  }
  return (
    <Modal title="Record expense" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? label : 'Save'}</button></>}>
      <Field label="Date" type="date" required value={f.date} onChange={set('date')} />
      <Field label="Category" type="select" required value={f.category} onChange={set('category')} options={EXPENSE_CATEGORIES} />
      <Field label="Sub-item / description" value={f.sub_category} onChange={set('sub_category')} />
      <Field label="Amount (UGX)" type="number" required value={f.amount} onChange={set('amount')} />
      <Field label="Supplier" value={f.supplier} onChange={set('supplier')} />
      <Field label="Notes" type="textarea" value={f.notes} onChange={set('notes')} />
      <div className="form-group">
        <label className="form-label">Invoice / receipt (optional)</label>
        <input className="form-input" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
          onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
        <div className="form-hint">Stored with this expense for evidence.</div>
      </div>
    </Modal>
  );
}
