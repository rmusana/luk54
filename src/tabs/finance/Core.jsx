import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { audit } from '../../lib/audit.js';
import { formatDate, formatNumber, formatPercent, formatUGX, todayEAT } from '../../lib/format.js';
import { BUDGET_SEED, CAPITAL_PURPOSES, EXPENSE_CATEGORIES, canWrite, cashflowEvents, computeAllocation, financialSummary, forecast, isCommercial, matchBudgetLine, sum } from '../../lib/finance.js';
import { Badge, DataTable, Field, Modal, ReceiptThumb, useConfirm, useToast } from '../../components/ui.jsx';
import { BudgetSec } from './Sections.jsx';
import { isOnline, smartInsert } from '../../lib/queue.js';

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

/* ── Overview (funding hero + KPIs + allocation explainer + egg trays) ── */
export function SummarySec({ data, role, onAddCapital }) {
  const s = data.summary;
  if (!s) return <div className="skeleton" style={{ height: 200 }} />;
  const budgetTotal = Number(s.budgetTotal || 0);
  const rawPct = s.fundedPct != null ? Number(s.fundedPct) : (budgetTotal ? (Number(s.totalInvestment || 0) / budgetTotal) * 100 : 0);
  const fundedPct = Math.round(rawPct * 10) / 10;
  const fundedPctInt = Math.round(rawPct);
  const isOver = fundedPct > 100;
  const isFully = fundedPct >= 100;
  const excessFunding = s.excessFunding != null ? Number(s.excessFunding) : Math.max(0, Number(s.totalInvestment || 0) - budgetTotal);
  const excessPct = isOver ? Math.round((fundedPct - 100) * 10) / 10 : 0;
  const basePct = Math.min(100, fundedPct);
  const surplusWidth = isOver ? Math.min(48, Math.max(8, excessPct * 1.1)) : 0;
  const barBg = isOver
    ? 'linear-gradient(135deg, #0f2e22 0%, #1a5c3e 45%, #92400e 100%)'
    : 'linear-gradient(135deg, #0f2e22 0%, #1a5c3e 100%)';
  const statusDot = isOver ? '● Overfunded' : isFully ? '● Fully funded' : s.commercialReached ? '● Allocation active' : '○ Pre-commercial';
  const canAddCapital = canWrite(role, 'capital');

  // egg trays (from operations-side tables)
  const daily = data.daily || [];
  const sales = data.sales || [];
  const collectedTrays = daily.reduce((sum, r) => sum + Number(r.eggs_trays ?? (Number(r.eggs_collected || 0) / 30)), 0);
  const soldTrays = sales.reduce((sum, r) => sum + Number(r.quantity_trays ?? (Number(r.quantity_eggs || 0) / 30)), 0);

  return (
    <>
      <div className="card" style={{ padding: 16, marginBottom: 16, background: barBg, color: '#fff', border: 'none', boxShadow: 'var(--shadow-lg)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -20, top: -20, width: 260, height: 260, background: isOver ? 'radial-gradient(circle, rgba(251,191,36,0.22), transparent 62%)' : 'radial-gradient(circle, rgba(255,255,255,0.09), transparent 60%)', pointerEvents: 'none' }} />
        {isOver && <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(115deg, transparent 0 14px, rgba(251,191,36,0.07) 14px 15px)', pointerEvents: 'none' }} />}
        <div style={{ position: 'relative', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.85 }}>Funding progress</span>
              {isOver && <span style={{ background: 'linear-gradient(135deg, #fde68a, #fbbf24)', color: '#78350f', fontSize: 10, fontWeight: 800, letterSpacing: '0.04em', padding: '3px 9px', borderRadius: 999, boxShadow: '0 4px 14px rgba(251,191,36,0.5)', display: 'inline-flex', alignItems: 'center', gap: 5, animation: 'surplusPulse 1.8s ease-in-out infinite' }}>✦ OVERFUNDED</span>}
              {!isOver && isFully && <span style={{ background: 'rgba(255,255,255,0.92)', color: '#065f46', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 999 }}>● 100% REACHED</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginTop: 6 }}>
              <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1 }}>{fundedPctInt}%</span>
              <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.92 }}>{isOver ? 'funded · +' + excessPct + '% surplus' : 'funded'}</span>
              {isOver && <span style={{ fontSize: 11, background: 'rgba(253,230,138,0.18)', border: '1px solid rgba(253,230,138,0.45)', color: '#fde68a', padding: '3px 8px', borderRadius: 999, fontWeight: 700 }}>↗ {fundedPctInt}% of target</span>}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 3 }}>
              {formatUGX(s.totalInvestment)} of {formatUGX(s.budgetTotal)}
              {isOver && <span> · <strong style={{ color: '#fde68a', background: 'rgba(0,0,0,0.18)', padding: '2px 6px', borderRadius: 6 }}>+{formatUGX(excessFunding)} excess</strong></span>}
            </div>
            <div style={{ height: 10, background: 'rgba(255,255,255,0.18)', borderRadius: 999, marginTop: 11, position: 'relative', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.25)' }}>
              <div style={{ height: '100%', width: basePct + '%', background: isOver ? 'linear-gradient(90deg, #ffffff, #f0fdf4)' : '#fff', borderRadius: 999, boxShadow: '0 2px 8px rgba(0,0,0,0.18)', transition: 'width 700ms var(--ease-out)', position: 'relative', overflow: 'hidden' }}>
                {isOver && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.35), transparent)', transform: 'translateX(-100%)', animation: 'surplusShimmer 1.6s ease-in-out infinite' }} />}
              </div>
              {isOver && <div style={{ position: 'absolute', top: 0, right: 0, height: '100%', width: surplusWidth + '%', background: 'linear-gradient(90deg, #f59e0b, #fbbf24, #fde68a)', borderRadius: 999, boxShadow: '-2px 0 14px rgba(251,191,36,0.85), inset 0 1px 1px rgba(255,255,255,0.7)', animation: 'surplusPulse 1.6s ease-in-out infinite', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#78350f' }}>+{excessPct}%</div>}
            </div>
            <div style={{ fontSize: 11, opacity: 0.88, marginTop: 7, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span>{statusDot}</span><span>·</span>
              {isOver
                ? <span style={{ color: '#fde68a', fontWeight: 700 }}>✓ Surplus {formatUGX(excessFunding)} · +{excessPct}% beyond target</span>
                : <span>Outstanding {formatUGX(s.outstandingFunding)}</span>}
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.96)', color: '#141916', borderRadius: 14, padding: 14, minWidth: 210, boxShadow: '0 12px 28px rgba(0,0,0,0.18)', position: 'relative', overflow: 'hidden', border: isOver ? '1px solid #fde68a' : 'none' }}>
            {isOver && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }} />}
            <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {isOver && <span style={{ animation: 'trophyFloat 2s ease-in-out infinite' }}>🏆</span>} Cash position
            </div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{formatUGX(s.cashPosition)}</div>
            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>Net profit {formatUGX(s.netProfitToInvestor)} · ROI {formatPercent(s.roi)}</div>
            {isOver && <div style={{ marginTop: 9, background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a', color: '#92400e', padding: '7px 9px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>↗ Surplus available: {formatUGX(excessFunding)}</div>}
          </div>
        </div>
      </div>

      {canAddCapital && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={onAddCapital} style={{ boxShadow: '0 8px 20px rgba(26,92,62,0.22)' }}>+ Add contribution</button>
          <span className="u-text-xs u-text-muted">Investor logs capital here — Investment Partner only</span>
        </div>
      )}

      <div className="kpi-grid" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="card kpi-card" style={{ borderLeft: '3px solid var(--color-accent)' }}><div className="kpi-label">Total Investment</div><div className="kpi-value">{formatUGX(s.totalInvestment)}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Total Expenses</div><div className="kpi-value">{formatUGX(s.totalExpenses)}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Gross Revenue</div><div className="kpi-value">{formatUGX(s.grossSalesRevenue)}</div></div>
        <div className="card kpi-card" style={{ boxShadow: 'var(--shadow-md)', borderColor: 'var(--color-accent)' }}><div className="kpi-label">Net Profit (Investor)</div><div className="kpi-value">{formatUGX(s.netProfitToInvestor)}</div>
          <div className="kpi-insight">{s.commercialReached ? 'Allocation active' : 'Allocation not yet active'}</div></div>
        <div className="card kpi-card"><div className="kpi-label">ROI</div><div className="kpi-value">{formatPercent(s.roi)}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Capital Recovery</div><div className="kpi-value">{formatPercent(s.capitalRecovery)}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Cash Position</div><div className="kpi-value">{formatUGX(s.cashPosition)}</div></div>
        {isOver
          ? <div className="card kpi-card" style={{ borderColor: '#fbbf24', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', boxShadow: '0 4px 16px rgba(251,191,36,0.18)' }}><div className="kpi-label" style={{ color: '#92400e' }}>Surplus Funding</div><div className="kpi-value" style={{ color: '#78350f' }}>+{formatUGX(excessFunding)}</div><div className="kpi-insight" style={{ color: '#b45309', fontWeight: 700 }}>+{excessPct}% beyond 100% · fully funded</div></div>
          : isFully
            ? <div className="card kpi-card" style={{ borderColor: '#10b981', background: 'linear-gradient(135deg, #ecfdf5, #f0fdf4)' }}><div className="kpi-label" style={{ color: '#065f46' }}>Outstanding Funding</div><div className="kpi-value" style={{ color: '#065f46' }}>{formatUGX(0)}</div><div className="kpi-insight" style={{ color: '#059669' }}>✓ 100% funded — on target</div></div>
            : <div className="card kpi-card"><div className="kpi-label">Outstanding Funding</div><div className="kpi-value">{formatUGX(s.outstandingFunding)}</div></div>}
      </div>

      <div className="card" style={{ padding: 'var(--space-5)' }}>
        <h3 style={{ marginBottom: 'var(--space-3)' }}>Revenue allocation</h3>
        <p className="u-text-sm u-text-secondary" style={{ lineHeight: 1.6, marginBottom: 'var(--space-4)' }}>
          Gross sales are split: half toward feed, half as gross profit.
          A share of gross profit goes to the operating partner; the balance is net profit to the investor.
        </p>
        <div className="kpi-grid">
          <div className="card kpi-card"><div className="kpi-label">Feed allocation</div><div className="kpi-value" style={{ fontSize: 'var(--text-lg)' }}>{formatUGX(s.feedAllocation)}</div></div>
          <div className="card kpi-card"><div className="kpi-label">Operator share</div><div className="kpi-value" style={{ fontSize: 'var(--text-lg)' }}>{formatUGX(s.operatingPartnerShare)}</div></div>
          <div className="card kpi-card"><div className="kpi-label">Net to investor</div><div className="kpi-value" style={{ fontSize: 'var(--text-lg)' }}>{formatUGX(s.netProfitToInvestor)}</div></div>
        </div>
      </div>

      <div className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-5)' }}>
        <h3 style={{ marginBottom: 'var(--space-3)' }}>Egg trays — collected vs sold</h3>
        <div className="kpi-grid">
          <div className="card kpi-card"><div className="kpi-label">Collected</div><div className="kpi-value" style={{ fontSize: 'var(--text-lg)' }}>{formatNumber(collectedTrays, 1)}</div></div>
          <div className="card kpi-card"><div className="kpi-label">Sold</div><div className="kpi-value" style={{ fontSize: 'var(--text-lg)' }}>{formatNumber(soldTrays, 1)}</div></div>
          <div className="card kpi-card"><div className="kpi-label">On hand</div><div className="kpi-value" style={{ fontSize: 'var(--text-lg)' }}>{formatNumber(Math.max(0, collectedTrays - soldTrays), 1)}</div></div>
        </div>
      </div>
    </>
  );
}

/* ── Disbursements (capital) ── */
export function CapitalSec({ role, setActions, autoOpen, onConsumed }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { rows, loading, reload } = useFinTable('capital_contributions');
  const [show, setShow] = useState(false);
  useEffect(() => { if (autoOpen) { setShow(true); if (onConsumed) onConsumed(); } }, [autoOpen]);
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
    else { audit('DELETE', 'capital_contributions', row.id, 'Deleted disbursement ' + row.amount + ' on ' + row.date); toast('success', 'Deleted'); reload(); }
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
          { key: 'doc', label: '🧾', accessor: (r) => <ReceiptThumb path={r.document_id} name={'Disbursement ' + (r.date || '')} /> },
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
    if (!isOnline() && file) {
      toast('error', 'Receipt photos need a connection — save without the receipt, or reconnect and retry');
      return;
    }
    setBusy(true); setLabel('Saving…');
    let documentId = '';
    if (file) {
      try { documentId = await uploadReceipt(file, setLabel); setLabel('Saving…'); }
      catch (e) { setBusy(false); toast('error', e.message || 'Upload failed'); return; }
    }
    let insData = null;
    try {
      const res = await smartInsert('capital_contributions', {
        project_id: 'LUK54', date: f.date, amount: Number(f.amount) || 0,
        purpose: f.purpose || 'General', reference: f.reference || '', document_id: documentId,
      }, 'Disbursement ' + f.amount + ' on ' + f.date);
      if (res.queued) { setBusy(false); toast('success', 'No connection — disbursement queued, will sync automatically'); onSaved(); return; }
      insData = res.data;
    } catch (e) {
      setBusy(false);
      toast('error', e.message || 'Save failed');
      return;
    }
    setBusy(false);
    audit('CREATE', 'capital_contributions', insData?.id, 'Disbursement ' + f.amount + ' on ' + f.date + ' (' + (f.purpose || 'General') + ')'); toast('success', 'Disbursement recorded'); onSaved();
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
export function ExpensesSec({ role, setActions, data }) {
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
    else { audit('DELETE', 'expenses', row.id, 'Deleted expense ' + row.category + ' ' + row.amount); toast('success', 'Deleted'); reload(); }
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
          { key: 'doc', label: '🧾', accessor: (r) => <ReceiptThumb path={r.document_id} name={'Expense ' + (r.date || '')} /> },
        ]} rows={rows}
          actions={writable ? [{ id: 'delete', label: 'Delete', danger: true }] : null}
          onAction={(a, row) => { if (a === 'delete') onDelete(row); }}
          emptyMessage="No expenses recorded." />
      )}
      {show && <ExpenseForm onClose={() => setShow(false)} onSaved={() => { setShow(false); reload(); }} />}
      <h3 className="u-text-sm u-font-semibold mb-3" style={{ marginTop: 'var(--space-5)' }}>Budget vs actual</h3>
      <BudgetSec data={data || { budget: [] }} />
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
    if (!isOnline() && file) {
      toast('error', 'Receipt photos need a connection — save without the receipt, or reconnect and retry');
      return;
    }
    setBusy(true); setLabel('Saving…');
    let documentId = '';
    if (file) {
      try { documentId = await uploadReceipt(file, setLabel); setLabel('Saving…'); }
      catch (e) { setBusy(false); toast('error', e.message || 'Upload failed'); return; }
    }
    const amount = Number(f.amount) || 0;
    let insData = null;
    try {
      const res = await smartInsert('expenses', {
        project_id: 'LUK54', date: f.date, category: f.category, sub_category: f.sub_category || '',
        amount, supplier: f.supplier || '', document_id: documentId, notes: f.notes || '',
      }, 'Expense ' + f.category + ' ' + amount + ' on ' + f.date);
      if (res.queued) { setBusy(false); toast('success', 'No connection — expense queued, will sync automatically'); onSaved(); return; }
      insData = res.data;
    } catch (e) {
      setBusy(false);
      toast('error', e.message || 'Save failed');
      return;
    }
    audit('CREATE', 'expenses', insData?.id, 'Expense ' + f.category + ' ' + amount + ' on ' + f.date);
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
