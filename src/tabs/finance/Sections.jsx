import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { formatDate, formatNumber, formatUGX } from '../../lib/format.js';
import { BUDGET_SEED, canWrite, cashflowEvents, computeAllocation, sum } from '../../lib/finance.js';
import { Badge, DataTable, Field, Modal, useConfirm, useToast } from '../../components/ui.jsx';

/* ── Budget ── */
export function BudgetSec({ data }) {
  const toast = useToast();
  const [lines, setLines] = useState(data.budget || []);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setLines(data.budget || []); }, [data.budget]);

  async function seed() {
    setBusy(true);
    const payload = BUDGET_SEED.map((l) => ({
      project_id: 'LUK54', category: l.category, sub_item: l.sub_item,
      budget_qty: l.budget_qty, budget_unit_cost: l.budget_unit_cost, budget_total: l.budget_total,
      actual_total: 0, variance: -l.budget_total,
    }));
    const { error } = await supabase.from('budget_lines').upsert(payload, { onConflict: 'project_id,category,sub_item' });
    setBusy(false);
    if (error) toast('error', error.message);
    else {
      toast('success', 'Budget seeded');
      const { data: fresh } = await supabase.from('budget_lines').select('*').order('category');
      if (fresh) setLines(fresh);
    }
  }

  const totalBudget = sum(lines, 'budget_total');
  const totalActual = sum(lines, 'actual_total');
  const variance = totalActual - totalBudget;
  const variancePct = totalBudget > 0 ? Math.round((variance / totalBudget) * 1000) / 10 : 0;

  return (
    <>
      <div className="kpi-grid mb-4">
        <div className="card kpi-card"><div className="kpi-label">Total budget</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{formatUGX(totalBudget)}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Actual spent</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{formatUGX(totalActual)}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Variance</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{formatUGX(variance)} ({variancePct}%)</div></div>
      </div>
      {!lines.length && (
        <div className="card pad-4 mb-4">
          <p className="u-text-sm u-text-secondary">No budget lines yet. Seed the 2,500-bird rough budget to start tracking.</p>
          <button className="btn btn-primary btn-sm" disabled={busy} onClick={seed}>{busy ? 'Seeding…' : 'Seed budget'}</button>
        </div>
      )}
      <DataTable columns={[
        { key: 'c', label: 'Category', accessor: (r) => r.category },
        { key: 's', label: 'Item', accessor: (r) => r.sub_item },
        { key: 'b', label: 'Budget', accessor: (r) => formatUGX(r.budget_total) },
        { key: 'a', label: 'Actual', accessor: (r) => formatUGX(r.actual_total) },
        { key: 'v', label: 'Variance', accessor: (r) => formatUGX(r.variance) },
      ]} rows={lines} emptyMessage="No budget lines." />
    </>
  );
}

/* ── Allocation ── */
export function AllocationSec({ role, data, setActions }) {
  const toast = useToast();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [busy, setBusy] = useState(false);
  const writable = canWrite(role, 'allocation');
  useEffect(() => { return () => setActions(null); }, []);
  const calc = computeAllocation(data.sales, month, data.commercial);

  async function finalize() {
    if (!calc.commercialReached) { toast('error', 'Commercial production not reached — allocation not active'); return; }
    setBusy(true);
    const { error } = await supabase.from('revenue_allocations').upsert({
      project_id: 'LUK54', month,
      gross_sales_revenue: calc.grossSalesRevenue, feed_allocation: calc.feedAllocation,
      gross_profit: calc.grossProfit, operating_partner_share: calc.operatingPartnerShare,
      net_profit_to_investor: calc.netProfitToInvestor, status: 'Finalized',
    }, { onConflict: 'project_id,month' });
    setBusy(false);
    if (error) toast('error', error.message);
    else toast('success', 'Allocation finalized for ' + month);
  }

  return (
    <>
      <div className="card pad-4 mb-4">
        <div className="form-row" style={{ alignItems: 'end' }}>
          <Field label="Month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <div className="form-group" style={{ marginBottom: 0 }}>
            {writable && <button className="btn btn-primary btn-sm" disabled={busy} onClick={finalize}>{busy ? 'Finalizing…' : 'Finalize month'}</button>}
          </div>
        </div>
        <p className="u-text-xs u-text-muted">50% of sales → feed · remaining 50% = gross profit · 25% of gross profit → Operating Partner · balance → Investment Partner. Active only after commercial production.</p>
      </div>
      <div className="kpi-grid mb-4">
        <div className="card kpi-card"><div className="kpi-label">Gross sales ({month})</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{formatUGX(calc.grossSalesRevenue)}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Feed allocation 50%</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{formatUGX(calc.feedAllocation)}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Operating Partner 25%</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{formatUGX(calc.operatingPartnerShare)}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Net to investor</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{formatUGX(calc.netProfitToInvestor)}</div></div>
      </div>
      <h3 className="u-text-sm u-font-semibold mb-3">Finalized months</h3>
      <DataTable columns={[
        { key: 'm', label: 'Month', accessor: (r) => r.month },
        { key: 'g', label: 'Gross sales', accessor: (r) => formatUGX(r.gross_sales_revenue) },
        { key: 'n', label: 'Net to investor', accessor: (r) => formatUGX(r.net_profit_to_investor) },
        { key: 's', label: 'Status', accessor: (r) => <Badge tone={r.status === 'Finalized' ? 'positive' : 'neutral'}>{r.status}</Badge> },
      ]} rows={data.allocations} emptyMessage="No finalized allocations." />
    </>
  );
}

/* ── Profit distribution ── */
export function ProfitSec({ role, data, setActions, onChanged }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [show, setShow] = useState(false);
  const writable = canWrite(role, 'profit');
  useEffect(() => {
    setActions(writable ? <button className="btn btn-primary btn-sm" onClick={() => setShow(true)}>+ Record distribution</button> : null);
    return () => setActions(null);
  }, []);
  const rows = data.distributions;
  const paid = rows.filter((d) => d.status === 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0);
  const pending = rows.filter((d) => d.status !== 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0);

  async function markPaid(row) {
    const { error } = await supabase.from('profit_distributions').update({
      status: 'Paid', paid_date: new Date().toISOString().slice(0, 10),
    }).eq('id', row.id);
    if (error) toast('error', error.message);
    else { toast('success', 'Marked paid'); onChanged(); }
  }
  async function onDelete(row) {
    const ok = await confirm({ title: 'Delete distribution', message: 'Delete this distribution?', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const { error } = await supabase.from('profit_distributions').delete().eq('id', row.id);
    if (error) toast('error', error.message);
    else { toast('success', 'Deleted'); onChanged(); }
  }

  return (
    <>
      <div className="kpi-grid mb-4">
        <div className="card kpi-card"><div className="kpi-label">Paid out</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{formatUGX(paid)}</div></div>
        <div className="card kpi-card"><div className="kpi-label">Pending</div><div className="kpi-value" style={{ fontSize: '1.2rem' }}>{formatUGX(pending)}</div></div>
      </div>
      <DataTable columns={[
        { key: 'm', label: 'Month', accessor: (r) => r.month },
        { key: 'a', label: 'Amount', accessor: (r) => formatUGX(r.amount) },
        { key: 's', label: 'Status', accessor: (r) => <Badge tone={r.status === 'Paid' ? 'positive' : 'caution'}>{r.status}</Badge> },
        { key: 'p', label: 'Paid date', accessor: (r) => r.paid_date || '—' },
      ]} rows={rows}
        actions={writable ? [{ id: 'paid', label: 'Mark paid' }, { id: 'delete', label: 'Delete', danger: true }] : null}
        onAction={(a, row) => { if (a === 'paid') markPaid(row); if (a === 'delete') onDelete(row); }}
        emptyMessage="No distributions recorded." />
      {show && <DistributionForm onClose={() => setShow(false)} onSaved={() => { setShow(false); onChanged(); }} />}
    </>
  );
}

function DistributionForm({ onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ month: new Date().toISOString().slice(0, 7), amount: '', paid_date: '', reference: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function save() {
    if (!f.month || !f.amount) { toast('error', 'Month and amount are required'); return; }
    setBusy(true);
    const { error } = await supabase.from('profit_distributions').insert({
      project_id: 'LUK54', month: f.month, amount: Number(f.amount) || 0,
      paid_date: f.paid_date || '', reference: f.reference || '',
      status: f.paid_date ? 'Paid' : 'Pending',
    });
    setBusy(false);
    if (error) toast('error', error.message);
    else { toast('success', 'Distribution recorded'); onSaved(); }
  }
  return (
    <Modal title="Record profit distribution" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Field label="Month" type="month" required value={f.month} onChange={set('month')} />
      <Field label="Amount (UGX)" type="number" required value={f.amount} onChange={set('amount')} />
      <Field label="Paid date (leave blank = pending)" type="date" value={f.paid_date} onChange={set('paid_date')} />
      <Field label="Reference" value={f.reference} onChange={set('reference')} />
    </Modal>
  );
}

/* ── Cash flow ── */
export function CashflowSec({ data }) {
  const ev = cashflowEvents(data.capital, data.expenses, data.sales).reverse();
  return (
    <DataTable columns={[
      { key: 'd', label: 'Date', accessor: (r) => formatDate(r.date) },
      { key: 't', label: 'Flow', accessor: (r) => <Badge tone={r.type === 'in' ? 'positive' : 'caution'}>{r.type === 'in' ? 'In' : 'Out'}</Badge> },
      { key: 'c', label: 'Category', accessor: (r) => r.category },
      { key: 'l', label: 'Detail', accessor: (r) => r.label },
      { key: 'a', label: 'Amount', accessor: (r) => formatUGX(r.amount) },
      { key: 'b', label: 'Balance', accessor: (r) => formatUGX(r.balance) },
    ]} rows={ev} emptyMessage="No cash movements yet." />
  );
}
