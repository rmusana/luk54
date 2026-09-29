/* Finance logic — exact port of Finance.gs formulas */

export const EXPENSE_CATEGORIES = [
  'Booking', 'Brooder', 'Feeds', 'Medication', 'Vaccination',
  'Labour', 'Utilities', 'Transport', 'Maintenance', 'Equipment', 'Other',
];
export const CAPITAL_PURPOSES = ['Birds', 'Feed', 'Medication', 'Equipment', 'Brooder', 'General', 'Other'];

/* Rough Budget for 2,500 layer birds (exact seed from original) */
export const BUDGET_SEED = [
  { category: 'Booking', sub_item: '2,500 Birds', budget_qty: 2500, budget_unit_cost: 5200, budget_total: 13000000 },
  { category: 'Brooder', sub_item: 'Black Polythene', budget_qty: 1, budget_unit_cost: 70000, budget_total: 70000 },
  { category: 'Brooder', sub_item: 'White Polythene', budget_qty: 1, budget_unit_cost: 150000, budget_total: 150000 },
  { category: 'Brooder', sub_item: 'Charcoal', budget_qty: 30, budget_unit_cost: 70000, budget_total: 2100000 },
  { category: 'Brooder', sub_item: 'Charcoal Bricketts', budget_qty: 600, budget_unit_cost: 1500, budget_total: 900000 },
  { category: 'Brooder', sub_item: 'Brooding Paper', budget_qty: 10, budget_unit_cost: 7000, budget_total: 70000 },
  { category: 'Brooder', sub_item: 'Drinkers', budget_qty: 24, budget_unit_cost: 5000, budget_total: 120000 },
  { category: 'Brooder', sub_item: 'Boards', budget_qty: 15, budget_unit_cost: 7000, budget_total: 105000 },
  { category: 'Brooder', sub_item: 'Liquid Soap', budget_qty: 1, budget_unit_cost: 50000, budget_total: 50000 },
  { category: 'Brooder', sub_item: 'Coffee Husks', budget_qty: 40, budget_unit_cost: 10000, budget_total: 400000 },
  { category: 'Brooder', sub_item: 'Trays', budget_qty: 2, budget_unit_cost: 50000, budget_total: 100000 },
  { category: 'Brooder', sub_item: 'Petrol', budget_qty: 30, budget_unit_cost: 5000, budget_total: 150000 },
  { category: 'Feeds', sub_item: 'Brand (baseline batch)', budget_qty: 550, budget_unit_cost: 1000, budget_total: 550000 },
  { category: 'Feeds', sub_item: 'Hendrix', budget_qty: 50, budget_unit_cost: 4800, budget_total: 240000 },
  { category: 'Feeds', sub_item: 'Lime', budget_qty: 125, budget_unit_cost: 370, budget_total: 46250 },
  { category: 'Feeds', sub_item: 'Soya', budget_qty: 90, budget_unit_cost: 2600, budget_total: 234000 },
  { category: 'Feeds', sub_item: 'Sunflower', budget_qty: 70, budget_unit_cost: 1300, budget_total: 91000 },
  { category: 'Feeds', sub_item: 'Broken', budget_qty: 175, budget_unit_cost: 1200, budget_total: 210000 },
  { category: 'Feeds', sub_item: 'Estimated 6-month feed (27,538 kg)', budget_qty: 27538, budget_unit_cost: 1294, budget_total: 35634172 },
  { category: 'Medication', sub_item: 'Common meds (monthly stock)', budget_qty: 1, budget_unit_cost: 500000, budget_total: 500000 },
  { category: 'Vaccination', sub_item: 'Schedule vaccines', budget_qty: 1, budget_unit_cost: 400000, budget_total: 400000 },
];

/* Role → write permissions (mirrors Finance.gs handle()) */
export function canWrite(role, resource) {
  if (role === 'admin') return true;
  if (resource === 'capital' || resource === 'allocation' || resource === 'profit') {
    return role === 'investment_partner';
  }
  if (resource === 'expenses') return role === 'operating_partner';
  return true;
}

export const sum = (rows, key) => rows.reduce((s, r) => s + Number(r[key] || 0), 0);

/* Commercial: latest daily prod% ≥ 85 OR week ≥ 25 from 2026-06-01 */
export function isCommercial(daily) {
  if (!daily || !daily.length) return false;
  const sorted = [...daily].sort((a, b) => new Date(b.date) - new Date(a.date));
  const last = sorted[0];
  const birds = Number(last.closing_birds) || Number(last.opening_birds);
  const eggs = Number(last.eggs_collected);
  if (birds > 0 && (eggs / birds) * 100 >= 85) return true;
  const start = new Date('2026-06-01');
  const week = Math.ceil((new Date(last.date) - start) / (7 * 86400000));
  return week >= 25;
}

/* 50% sales → feed · 50% gross profit · 25% of GP → operating partner · rest → investor */
export function computeAllocation(sales, month, commercial) {
  const gross = sales
    .filter((r) => String(r.date || '').slice(0, 7) === month)
    .reduce((s, r) => s + Number(r.total_revenue || 0), 0);
  let feed = 0, gp = 0, opShare = 0, net = 0;
  if (commercial) {
    feed = gross * 0.5;
    gp = gross * 0.5;
    opShare = gp * 0.25;
    net = gp - opShare;
  }
  return { month, commercialReached: commercial, grossSalesRevenue: gross, feedAllocation: feed, grossProfit: gp, operatingPartnerShare: opShare, netProfitToInvestor: net, formulaActive: commercial };
}

export function financialSummary({ capital, expenses, revenue, distributions, budget, commercial }) {
  const cap = sum(capital, 'amount');
  const exp = sum(expenses, 'amount');
  let feed = 0, gp = 0, opShare = 0, net = 0;
  if (commercial) {
    feed = revenue * 0.5; gp = revenue * 0.5; opShare = gp * 0.25; net = gp - opShare;
  }
  const paid = distributions.filter((d) => d.status === 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0);
  const pending = distributions.filter((d) => d.status !== 'Paid').reduce((s, r) => s + Number(r.amount || 0), 0);
  const roi = cap > 0 ? Math.round((net / cap) * 1000) / 10 : 0;
  const cash = cap - exp + (commercial ? net : 0);
  const totalBudget = sum(budget, 'budget_total');
  const budgetActual = sum(budget, 'actual_total');
  const outstanding = Math.max(0, totalBudget - cap);
  const excess = Math.max(0, cap - totalBudget);
  const fundedPct = totalBudget > 0 ? Math.round((cap / totalBudget) * 1000) / 10 : 0;
  return {
    totalInvestment: cap, totalExpenses: exp, grossSalesRevenue: revenue, commercialReached: commercial,
    feedAllocation: feed, grossProfit: gp, operatingPartnerShare: opShare, netProfitToInvestor: net,
    profitPaidOut: paid, profitPending: pending, roi, capitalRecovery: roi, cashPosition: cash,
    outstandingFunding: outstanding, excessFunding: excess, fundedPct,
    fundingStatus: fundedPct < 100 ? 'underfunded' : fundedPct === 100 ? 'funded' : 'overfunded',
    budgetTotal: totalBudget, budgetActual, budgetVariance: budgetActual - totalBudget,
  };
}

export function cashflowEvents(capital, expenses, sales) {
  const ev = [];
  capital.forEach((r) => ev.push({ date: r.date, type: 'in', category: 'Capital', amount: Number(r.amount || 0), label: r.purpose || 'Contribution' }));
  expenses.forEach((r) => ev.push({ date: r.date, type: 'out', category: r.category, amount: Number(r.amount || 0), label: r.sub_category || r.category }));
  sales.forEach((r) => ev.push({ date: r.date, type: 'in', category: 'Sales', amount: Number(r.total_revenue || 0), label: r.customer || 'Egg sale' }));
  ev.sort((a, b) => new Date(a.date) - new Date(b.date));
  let running = 0;
  ev.forEach((e) => { running += e.type === 'in' ? e.amount : -e.amount; e.balance = running; });
  return ev;
}

export function forecast(summary, sales, expenses, days = 30) {
  const cutoff = Date.now() - 30 * 86400000;
  const recentSales = sales.filter((r) => new Date(r.date) >= cutoff).reduce((s, r) => s + Number(r.total_revenue || 0), 0);
  const recentExp = expenses.filter((r) => new Date(r.date) >= cutoff).reduce((s, r) => s + Number(r.amount || 0), 0);
  const projRev = (recentSales / 30) * days;
  const projExp = (recentExp / 30) * days;
  let projNet = 0;
  if (summary.commercialReached) {
    const gp = projRev * 0.5;
    projNet = gp - gp * 0.25;
  }
  return {
    horizonDays: days,
    projectedRevenue: Math.round(projRev),
    projectedExpenses: Math.round(projExp),
    projectedNetProfit: Math.round(projNet),
    projectedCash: summary.commercialReached
      ? Math.round(summary.cashPosition - projExp + projNet)
      : Math.round(summary.cashPosition - projExp + projRev),
    fundingRequired: Math.round(Math.max(0, projExp - summary.cashPosition - projNet)),
    basedOnDays: 30, commercialReached: summary.commercialReached,
  };
}

/* Budget actual update on expense (category + sub-item substring, fallback category-only) */
export function matchBudgetLine(lines, category, subItem) {
  const hit = lines.find((l) => l.category === category && (!subItem || String(l.sub_item).indexOf(subItem) >= 0));
  if (hit) return hit;
  return lines.find((l) => l.category === category) || null;
}
