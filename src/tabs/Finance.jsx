import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { financialSummary, isCommercial } from '../lib/finance.js';
import { useToast } from '../components/ui.jsx';
import { CapitalSec, ExpensesSec, SummarySec } from './finance/Core.jsx';
import { AllocationSec, BudgetSec, CashflowSec, ProfitSec } from './finance/Sections.jsx';

const SUBS = [
  { id: 'summary', label: 'Summary' },
  { id: 'capital', label: 'Disbursements' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'budget', label: 'Budget' },
  { id: 'allocation', label: 'Allocation' },
  { id: 'profit', label: 'Profit' },
  { id: 'cashflow', label: 'Cash Flow' },
];

export default function Finance({ role, setActions }) {
  const toast = useToast();
  const [sub, setSub] = useState('summary');
  const [data, setData] = useState({ capital: [], expenses: [], sales: [], budget: [], allocations: [], distributions: [], daily: [], commercial: false, summary: null });
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [cap, exp, sales, bud, alloc, dist, daily] = await Promise.all([
      supabase.from('capital_contributions').select('*').order('date', { ascending: false }).limit(500),
      supabase.from('expenses').select('*').order('date', { ascending: false }).limit(500),
      supabase.from('sales').select('*').order('date', { ascending: false }).limit(500),
      supabase.from('budget_lines').select('*').order('category').limit(200),
      supabase.from('revenue_allocations').select('*').order('month', { ascending: false }),
      supabase.from('profit_distributions').select('*').order('month', { ascending: false }),
      supabase.from('daily_production').select('*').order('date', { ascending: false }).limit(60),
    ]);
    const err = [cap, exp, sales, bud, alloc, dist, daily].map((r) => r.error).filter(Boolean)[0];
    if (err) toast('error', err.message);
    const commercial = isCommercial(daily.data || []);
    const revenue = (sales.data || []).reduce((s, r) => s + Number(r.total_revenue || 0), 0);
    const summary = financialSummary({
      capital: cap.data || [], expenses: exp.data || [], revenue,
      distributions: dist.data || [], budget: bud.data || [], commercial,
    });
    setData({
      capital: cap.data || [], expenses: exp.data || [], sales: sales.data || [],
      budget: bud.data || [], allocations: alloc.data || [], distributions: dist.data || [],
      daily: daily.data || [], commercial, summary,
    });
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  return (
    <>
      <div className="tabs-bar">
        {SUBS.map((s) => (
          <button key={s.id} className={'btn btn-sm ' + (s.id === sub ? 'btn-primary' : 'btn-ghost')}
            onClick={() => { setActions(null); setSub(s.id); }}>{s.label}</button>
        ))}
      </div>
      {loading ? <div className="skeleton" style={{ height: 160 }} /> : (
        <div key={sub}>
          {sub === 'summary' && <SummarySec data={data} />}
          {sub === 'capital' && <CapitalSec role={role} setActions={setActions} />}
          {sub === 'expenses' && <ExpensesSec role={role} setActions={setActions} />}
          {sub === 'budget' && <BudgetSec data={data} />}
          {sub === 'allocation' && <AllocationSec role={role} data={data} setActions={setActions} />}
          {sub === 'profit' && <ProfitSec role={role} data={data} setActions={setActions} onChanged={load} />}
          {sub === 'cashflow' && <CashflowSec data={data} />}
        </div>
      )}
    </>
  );
}
