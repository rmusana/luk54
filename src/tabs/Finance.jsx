import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { financialSummary, isCommercial } from '../lib/finance.js';
import { useToast } from '../components/ui.jsx';
import { CapitalSec, ExpensesSec, SummarySec } from './finance/Core.jsx';
import { AllocationSec, CashflowSec, ProfitSec, RevenueSec } from './finance/Sections.jsx';

const SUBS = [
  { id: 'overview', label: 'Overview', roles: ['admin', 'operating_partner', 'investment_partner'] },
  { id: 'capital', label: 'Disbursements', roles: ['admin', 'investment_partner'] },
  { id: 'revenue', label: 'Revenue', roles: ['admin', 'operating_partner', 'investment_partner'] },
  { id: 'expenses', label: 'Expenses', roles: ['admin', 'operating_partner', 'investment_partner'] },
  { id: 'allocation', label: 'Revenue Allocation', roles: ['admin', 'investment_partner'] },
  { id: 'profit', label: 'Profit Distribution', roles: ['admin', 'investment_partner'] },
  { id: 'cashflow', label: 'Cash Flow', roles: ['admin', 'operating_partner', 'investment_partner'] },
];

export default function Finance({ role, setActions }) {
  const toast = useToast();
  const allowed = SUBS.filter((s) => s.roles.includes(role));
  const [sub, setSub] = useState('overview');
  const activeSub = allowed.some((s) => s.id === sub) ? sub : allowed[0].id;
  const [capSignal, setCapSignal] = useState(0);
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
      <div className="pill-tabs">
        {allowed.map((s) => (
          <button key={s.id} className={'btn btn-sm ' + (s.id === activeSub ? 'btn-primary' : 'btn-ghost')}
            onClick={() => { setActions(null); setSub(s.id); }}>{s.label}</button>
        ))}
      </div>
      {loading ? <div className="skeleton" style={{ height: 160 }} /> : (
        <div key={activeSub}>
          {activeSub === 'overview' && <SummarySec data={data} role={role} onAddCapital={() => { setCapSignal((x) => x + 1); setActions(null); setSub('capital'); }} />}
          {activeSub === 'capital' && <CapitalSec role={role} setActions={setActions} autoOpen={capSignal} onConsumed={() => setCapSignal(0)} />}
          {activeSub === 'revenue' && <RevenueSec data={data} />}
          {activeSub === 'expenses' && <ExpensesSec role={role} setActions={setActions} data={data} />}
          {activeSub === 'allocation' && <AllocationSec role={role} data={data} setActions={setActions} />}
          {activeSub === 'profit' && <ProfitSec role={role} data={data} setActions={setActions} onChanged={load} />}
          {activeSub === 'cashflow' && <CashflowSec data={data} />}
        </div>
      )}
    </>
  );
}
