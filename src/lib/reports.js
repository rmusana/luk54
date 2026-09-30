/* Reports engine — port of Reports.gs/localGenerate logic */
import { supabase } from './supabaseClient.js';
import { financialSummary, isCommercial } from './finance.js';

const T = (v) => String(v || '').slice(0, 10);
const sum = (rows, k) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);

export function isoWeekOf(dateStr) {
  const p = String(dateStr).split('-');
  const d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  if (isNaN(d)) return '';
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const f = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const fd = (f.getUTCDay() + 6) % 7;
  f.setUTCDate(f.getUTCDate() - fd + 3);
  return d.getUTCFullYear() + '-W' + String(1 + Math.round((d - f) / 604800000)).padStart(2, '0');
}

export function weekRange(isoWeek) {
  const m = /^(\d{4})-W(\d{2})$/.exec(isoWeek || '');
  if (!m) return null;
  const jan4 = new Date(Date.UTC(Number(m[1]), 0, 4));
  const jan4day = (jan4.getUTCDay() + 6) % 7;
  const mon = new Date(jan4);
  mon.setUTCDate(jan4.getUTCDate() - jan4day + (Number(m[2]) - 1) * 7);
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return { start: mon.toISOString().slice(0, 10), end: sun.toISOString().slice(0, 10) };
}

export function shiftWeek(isoWeek, delta) {
  const r = weekRange(isoWeek);
  if (!r) return isoWeek;
  const d = new Date(r.start + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta * 7);
  return isoWeekOf(d.toISOString().slice(0, 10));
}

export const REPORTS = [
  { id: 'monthly_statement', group: 'Month close', name: 'Monthly Investment Statement', desc: 'Contributions · spending · production · sales for one month' },
  { id: 'executive', group: 'Month close', name: 'Executive Summary', desc: 'One-page money + production overview' },
  { id: 'profit', group: 'Month close', name: 'Profit Distribution', desc: 'Distributions by month: paid vs pending' },
  { id: 'capital_statement', group: 'Money', name: 'Disbursements Statement', desc: 'Every contribution + cumulative and outstanding' },
  { id: 'expense', group: 'Money', name: 'Expense Report', desc: 'Totals by category + every line' },
  { id: 'revenue', group: 'Money', name: 'Revenue Report', desc: 'Every sale: customer, trays, revenue, payment' },
  { id: 'budget', group: 'Money', name: 'Budget vs Actual', desc: 'Budget vs spent per line' },
  { id: 'forecast', group: 'Money', name: 'Forecast', desc: '90-day revenue, cost and funding outlook' },
  { id: 'production', group: 'Production', name: 'Production Report', desc: 'Eggs, mortality, feed by day' },
  { id: 'weekly_section', group: 'Production', name: 'Weekly Section Report', desc: 'One batch, one week: birds, eggs, feed' },
  { id: 'mortality', group: 'Production', name: 'Mortality Report', desc: 'Losses day by day with rates' },
  { id: 'feed', group: 'Production', name: 'Feed Report', desc: 'Purchases, stock and weekly mixes' },
  { id: 'health', group: 'Production', name: 'Health & Vaccination', desc: 'Planned vs completed vaccinations' },
  { id: 'inventory', group: 'Production', name: 'Inventory Report', desc: 'Feed stock and store items on hand' },
  { id: 'audit', group: 'Overviews', name: 'Audit Report', desc: 'Every line item behind the numbers' },
];

async function fetchAll() {
  const t = (table, order = 'date') => supabase.from(table).select('*').order(order, { ascending: false }).limit(2000);
  const [cap, exp, sales, daily, bud, alloc, dist, fpurch, mixes, finv, hev, sched, flock, inv] = await Promise.all([
    t('capital_contributions'), t('expenses'), t('sales'), t('daily_production'),
    supabase.from('budget_lines').select('*').order('category').limit(300),
    supabase.from('revenue_allocations').select('*').order('month', { ascending: false }),
    supabase.from('profit_distributions').select('*').order('month', { ascending: false }),
    t('feed_purchases'), supabase.from('weekly_feed_mix').select('*').order('week_start', { ascending: false }).limit(200),
    supabase.from('feed_inventory').select('*').order('product'),
    t('health_events'), supabase.from('vaccination_schedule').select('*').order('week'),
    t('flock_events'), supabase.from('inventory').select('*').order('name'),
  ]);
  const parts = { cap, exp, sales, daily, bud, alloc, dist, fpurch, mixes, finv, hev, sched, flock, inv };
  for (const [k, r] of Object.entries(parts)) {
    if (r.error) throw new Error(r.error.message);
  }
  return {
    capital: cap.data, expenses: exp.data, sales: sales.data, daily: daily.data,
    budget: bud.data, allocations: alloc.data, distributions: dist.data,
    feedPurch: fpurch.data, mixes: mixes.data, feedInv: finv.data,
    healthEv: hev.data, sched: sched.data, flock: flock.data, invItems: inv.data,
  };
}

const inMonth = (rows, field, ym) => rows.filter((r) => T(r[field]).indexOf(ym) === 0);
const inWeek = (rows, field, range) => rows.filter((r) => { const k = T(r[field]); return k >= range.start && k <= range.end; });

export async function generateReport(type, period) {
  // period: { mode: 'monthly', month } or { mode: 'weekly', range }
  const d = await fetchAll();
  const monthly = period.mode === 'monthly';
  const pick = (rows, field) => monthly ? inMonth(rows, field, period.month) : inWeek(rows, field, period.range);
  const label = monthly ? 'Month ' + period.month : 'Week ' + period.week + ' (' + period.range.start + ' → ' + period.range.end + ')';
  const R = { title: '', period: label, kpis: [], tables: [], note: '' };
  const U = (n) => n; // keep raw numbers; UI formats

  if (type === 'monthly_statement') {
    const pc = pick(d.capital, 'date'), pe = pick(d.expenses, 'date');
    const pd = pick(d.daily, 'date'), ps = pick(d.sales, 'date');
    const cumCap = sum(d.capital, 'amount'), cumExp = sum(d.expenses, 'amount');
    R.title = 'Monthly Investment Statement';
    R.kpis = [
      ['Contributions received', U(sum(pc, 'amount'))],
      ['Cumulative contributions', U(cumCap)],
      ['Expenditure this period', U(sum(pe, 'amount'))],
      ['Cumulative expenditure', U(cumExp)],
      ['Outstanding funding', U(Math.max(0, 55120422 - cumCap))],
      ['Eggs collected', U(sum(pd, 'eggs_collected'))],
      ['Sales revenue', U(sum(ps, 'total_revenue'))],
    ];
    R.tables = [
      { title: 'Contributions', columns: [['Date', 'date'], ['Amount', 'amount'], ['Purpose', 'purpose']], rows: pc },
      { title: 'Expenditures', columns: [['Date', 'date'], ['Category', 'category'], ['Amount', 'amount']], rows: pe },
    ];
    R.note = 'Prepared under Monthly statement. Due by the 10th of the following month.';
  } else if (type === 'executive') {
    const revenue = sum(d.sales, 'total_revenue');
    const commercial = isCommercial(d.daily);
    const fs = financialSummary({ capital: d.capital, expenses: d.expenses, revenue, distributions: d.distributions, budget: d.budget, commercial });
    const pd = monthly ? inMonth(d.daily, 'date', period.month) : inWeek(d.daily, 'date', period.range);
    R.title = 'Executive Summary';
    R.kpis = [
      ['Total investment', U(fs.totalInvestment)], ['Total expenses', U(fs.totalExpenses)],
      ['Net profit (investor)', U(fs.netProfitToInvestor)], ['ROI', fs.roi + '%'],
      ['Cash position', U(fs.cashPosition)], ['Eggs (period)', U(sum(pd, 'eggs_collected'))],
      ['Mortality (period)', U(sum(pd, 'mortality'))], ['Days logged', U(pd.length)],
    ];
  } else if (type === 'profit') {
    const lines = d.distributions.filter((r) => String(r.month || '').indexOf(monthly ? period.month : '') === 0 || !monthly);
    R.title = 'Profit Distribution';
    R.kpis = [
      ['Paid', U(lines.filter((x) => x.status === 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0))],
      ['Pending', U(lines.filter((x) => x.status !== 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0))],
    ];
    R.tables = [{ title: 'Distributions', columns: [['Month', 'month'], ['Amount', 'amount'], ['Status', 'status'], ['Paid date', 'paid_date']], rows: lines }];
  } else if (type === 'capital_statement') {
    const pc = monthly ? inMonth(d.capital, 'date', period.month) : d.capital;
    const cum = sum(d.capital, 'amount');
    R.title = 'Disbursements Statement';
    R.kpis = [
      ['Received (period)', U(sum(pc, 'amount'))], ['Cumulative', U(cum)],
      ['Budget total', U(55120422)], ['Outstanding', U(Math.max(0, 55120422 - cum))],
    ];
    R.tables = [{ title: 'Contributions', columns: [['Date', 'date'], ['Amount', 'amount'], ['Purpose', 'purpose'], ['Reference', 'reference']], rows: pc }];
  } else if (type === 'expense') {
    const pe = pick(d.expenses, 'date');
    const byCat = {};
    pe.forEach((r) => { byCat[r.category || 'Other'] = (byCat[r.category || 'Other'] || 0) + Number(r.amount || 0); });
    R.title = 'Expense Report';
    R.kpis = [['Total expenses', U(sum(pe, 'amount'))],
      ...Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c, v]) => [c, U(v)])];
    R.tables = [{ title: 'Expense lines', columns: [['Date', 'date'], ['Category', 'category'], ['Detail', 'sub_category'], ['Amount', 'amount'], ['Supplier', 'supplier']], rows: pe }];
  } else if (type === 'revenue') {
    const ps = pick(d.sales, 'date');
    R.title = 'Revenue Report';
    R.kpis = [['Total revenue', U(sum(ps, 'total_revenue'))], ['Sales count', U(ps.length)],
      ['Trays sold', U(ps.reduce((s, r) => s + Number(r.quantity_trays || 0), 0))]];
    R.tables = [{ title: 'Sales', columns: [['Date', 'date'], ['Customer', 'customer'], ['Trays', 'quantity_trays'], ['Revenue', 'total_revenue'], ['Payment', 'payment_status']], rows: ps }];
  } else if (type === 'budget') {
    R.title = 'Budget vs Actual';
    R.kpis = [['Budget total', U(sum(d.budget, 'budget_total'))], ['Actual spent', U(sum(d.budget, 'actual_total'))],
      ['Variance', U(sum(d.budget, 'actual_total') - sum(d.budget, 'budget_total'))]];
    R.tables = [{ title: 'Budget lines', columns: [['Category', 'category'], ['Item', 'sub_item'], ['Budget', 'budget_total'], ['Actual', 'actual_total'], ['Variance', 'variance']], rows: d.budget }];
  } else if (type === 'forecast') {
    const days = 90;
    const cutoff = Date.now() - 30 * 86400000;
    const rs = d.sales.filter((r) => new Date(r.date) >= cutoff).reduce((s, r) => s + Number(r.total_revenue || 0), 0);
    const re = d.expenses.filter((r) => new Date(r.date) >= cutoff).reduce((s, r) => s + Number(r.amount || 0), 0);
    const commercial = isCommercial(d.daily);
    const cap = sum(d.capital, 'amount'), exp = sum(d.expenses, 'amount'), rev = sum(d.sales, 'total_revenue');
    const net = commercial ? (rev * 0.5 - rev * 0.5 * 0.25) : 0;
    const cash = cap - exp + (commercial ? net : 0);
    const projRev = Math.round((rs / 30) * days), projExp = Math.round((re / 30) * days);
    const projNet = commercial ? Math.round(projRev * 0.5 * 0.75) : 0;
    R.title = '90-Day Forecast';
    R.kpis = [['Projected revenue', U(projRev)], ['Projected expenses', U(projExp)],
      ['Projected net profit', U(projNet)],
      ['Projected cash', U(commercial ? Math.round(cash - projExp + projNet) : Math.round(cash - projExp + projRev))],
      ['Funding required', U(Math.round(Math.max(0, projExp - cash - projNet)))]];
    R.note = 'Based on the last 30 days of sales and expenses.';
  } else if (type === 'production') {
    const pd = pick(d.daily, 'date');
    R.title = 'Production Report';
    R.kpis = [['Days logged', U(pd.length)], ['Total eggs', U(sum(pd, 'eggs_collected'))],
      ['Total mortality', U(sum(pd, 'mortality'))], ['Feed used (kg)', U(pd.reduce((s, r) => s + Number(r.feed_issued_kg || 0), 0))]];
    R.tables = [{ title: 'Day by day', columns: [['Date', 'date'], ['Section', 'section'], ['Opening', 'opening_birds'], ['Mortality', 'mortality'], ['Eggs', 'eggs_collected'], ['Feed kg', 'feed_issued_kg']], rows: pd }];
  } else if (type === 'weekly_section') {
    const range = monthly ? null : period.range;
    const list = range ? inWeek(d.daily, 'date', range) : inMonth(d.daily, 'date', period.month);
    const sections = {};
    list.forEach((r) => {
      const k = r.section || 'Combined';
      sections[k] = sections[k] || { days: 0, eggs: 0, mort: 0, feed: 0, birds: 0 };
      sections[k].days++; sections[k].eggs += Number(r.eggs_collected || 0);
      sections[k].mort += Number(r.mortality || 0); sections[k].feed += Number(r.feed_issued_kg || 0);
      sections[k].birds = Math.max(sections[k].birds, Number(r.opening_birds || 0));
    });
    R.title = 'Weekly Section Report';
    R.kpis = Object.entries(sections).map(([k, v]) => [k + ' eggs', U(v.eggs)]);
    R.tables = [{ title: 'By section', columns: [['Date', 'date'], ['Section', 'section'], ['Eggs', 'eggs_collected'], ['Mortality', 'mortality'], ['Feed kg', 'feed_issued_kg']], rows: list }];
  } else if (type === 'mortality') {
    const lines = pick(d.daily, 'date').filter((r) => Number(r.mortality || 0) > 0);
    R.title = 'Mortality Report';
    R.kpis = [['Total deaths', U(lines.reduce((s, r) => s + Number(r.mortality || 0), 0))], ['Days with losses', U(lines.length)]];
    R.tables = [{ title: 'Losses', columns: [['Date', 'date'], ['Deaths', 'mortality'], ['Opening', 'opening_birds'], ['Notes', 'notes']], rows: lines }];
  } else if (type === 'feed') {
    const pp = pick(d.feedPurch, 'date');
    R.title = 'Feed Report';
    R.kpis = [['Purchases', U(pp.reduce((s, r) => s + Number(r.total_cost || 0), 0))],
      ['Purchase lines', U(pp.length)],
      ['Mix total (kg)', U(d.mixes.reduce((s, r) => s + Number(r.total_kg || 0), 0))]];
    R.tables = [
      { title: 'Purchases', columns: [['Date', 'date'], ['Product', 'product'], ['Qty kg', 'qty_kg'], ['Total', 'total_cost']], rows: pp },
      { title: 'Current stock', columns: [['Product', 'product'], ['Stock kg', 'closing_stock'], ['Unit cost', 'unit_cost']], rows: d.feedInv },
    ];
  } else if (type === 'health') {
    const today = new Date().toISOString().slice(0, 10);
    const lines = d.sched.map((s) => {
      const planned = T(s.planned_date);
      const done = s.status === 'Completed';
      return { week: s.week, vaccine: s.vaccine, planned, status: done ? 'Completed' : (planned !== '' && planned < today ? 'Overdue' : 'Pending') };
    });
    const hev = monthly ? inMonth(d.healthEv, 'date', period.month) : inWeek(d.healthEv, 'date', period.range);
    R.title = 'Health & Vaccination Compliance';
    R.kpis = [['Scheduled', U(lines.length)], ['Completed', U(lines.filter((l) => l.status === 'Completed').length)],
      ['Overdue', U(lines.filter((l) => l.status === 'Overdue').length)], ['Treatments (period)', U(hev.length)]];
    R.tables = [{ title: 'Schedule', columns: [['Week', 'week'], ['Vaccine', 'vaccine'], ['Planned', 'planned'], ['Status', 'status']], rows: lines }];
  } else if (type === 'inventory') {
    R.title = 'Inventory Report';
    R.kpis = [['Feed products', U(d.feedInv.length)], ['Store items', U(d.invItems.length)]];
    R.tables = [
      { title: 'Feed stock', columns: [['Product', 'product'], ['Stock kg', 'closing_stock']], rows: d.feedInv },
      { title: 'Store items', columns: [['Item', 'name'], ['Qty', 'quantity'], ['Unit', 'unit']], rows: d.invItems },
    ];
  } else if (type === 'audit') {
    const cap = monthly ? inMonth(d.capital, 'date', period.month) : d.capital;
    const exp = monthly ? inMonth(d.expenses, 'date', period.month) : d.expenses;
    const sal = monthly ? inMonth(d.sales, 'date', period.month) : d.sales;
    R.title = 'Audit Report';
    R.kpis = [['Contributions', U(cap.length)], ['Expenses', U(exp.length)], ['Sales', U(sal.length)],
      ['Production days', U(monthly ? inMonth(d.daily, 'date', period.month).length : d.daily.length)]];
    R.tables = [
      { title: 'Contributions', columns: [['Date', 'date'], ['Amount', 'amount'], ['Purpose', 'purpose']], rows: cap },
      { title: 'Expenses', columns: [['Date', 'date'], ['Category', 'category'], ['Amount', 'amount']], rows: exp },
      { title: 'Sales', columns: [['Date', 'date'], ['Customer', 'customer'], ['Revenue', 'total_revenue']], rows: sal },
    ];
    R.note = 'Transaction package for the selected period.';
  }
  return R;
}
