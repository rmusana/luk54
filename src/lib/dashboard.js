/* Dashboard math — exact port of Dashboard.gs (adapted: feed_issued_kg, no alerts table yet) */

export function latestProduction(rows) {
  if (!rows.length) return { layingPercent: null, birds: null, week: null, trend: [] };
  const sorted = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date));
  const last = sorted[sorted.length - 1];
  const birds = Number(last.closing_birds) || Number(last.opening_birds);
  const eggs = Number(last.eggs_collected);
  const layingPercent = birds > 0 ? Math.round((eggs / birds) * 1000) / 10 : null;
  const start = new Date('2026-06-01');
  const week = Math.max(1, Math.ceil((new Date(last.date) - start) / (7 * 24 * 3600 * 1000)));
  const trend = sorted.slice(-30).map((r) => {
    const b = Number(r.closing_birds) || Number(r.opening_birds) || 1;
    const e = Number(r.eggs_collected);
    return { date: String(r.date).slice(0, 10), eggs: e, trays: Math.round((e / 30) * 10) / 10, percent: Math.round((e / b) * 1000) / 10 };
  });
  return { layingPercent, birds, week, trend };
}

export function mortalityStats(rows) {
  if (!rows.length) return { rate: null, count: 0, trend: [] };
  let totalMort = 0, peakBirds = 0;
  const trend = rows.map((r) => {
    const m = Number(r.mortality);
    totalMort += m;
    const b = Number(r.opening_birds) || Number(r.closing_birds);
    if (b > peakBirds) peakBirds = b;
    return { date: String(r.date).slice(0, 10), count: m };
  });
  return { rate: peakBirds > 0 ? Math.round((totalMort / peakBirds) * 1000) / 10 : null, count: totalMort, trend: trend.slice(-30) };
}

export function feedStats(rows) {
  const daily = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-7);
  const consumed = daily.reduce((s, r) => s + Number(r.feed_issued_kg || 0), 0);
  const eggs = daily.reduce((s, r) => s + Number(r.eggs_collected || 0), 0);
  const kgPerDozen = eggs > 0 ? Math.round((consumed / (eggs / 12)) * 100) / 100 : null;
  let efficiencyScore = 70;
  if (kgPerDozen != null) {
    if (kgPerDozen <= 1.6) efficiencyScore = 100;
    else if (kgPerDozen <= 1.9) efficiencyScore = 85;
    else if (kgPerDozen <= 2.2) efficiencyScore = 65;
    else efficiencyScore = 40;
  }
  return { daysRemaining: null, kgPerDozen, efficiencyScore };
}

export function budgetStats(lines) {
  let totalBudget = 0, spent = 0;
  lines.forEach((r) => { totalBudget += Number(r.budget_total); spent += Number(r.actual_total); });
  if (totalBudget === 0) totalBudget = 13000000 + 4215000 + 35634172;
  let adherence;
  if (spent === 0 || totalBudget === 0) adherence = 70;
  else adherence = Math.min(100, Math.max(0, 100 - Math.abs((spent / totalBudget) - 0.5) * 100));
  return { totalBudget, spent, adherence: Math.round(adherence) };
}

export function commercialStatus(production) {
  let reached = false, daysTo = null;
  if (production.layingPercent != null && production.layingPercent >= 85) reached = true;
  if (!reached && production.week != null) {
    if (production.week >= 25) reached = true;
    else daysTo = (25 - production.week) * 7;
  }
  return { reached, daysTo };
}

export function computeHealthScore(m) {
  let prod = 50;
  if (m.productionPercent != null) {
    if (m.productionPercent >= 88) prod = 100;
    else if (m.productionPercent >= 85) prod = 85;
    else if (m.productionPercent >= 80) prod = 65;
    else if (m.productionPercent >= 70) prod = 40;
    else prod = 20;
  }
  let mort = 80;
  if (m.mortalityRate != null) {
    if (m.mortalityRate <= 1) mort = 100;
    else if (m.mortalityRate <= 2) mort = 80;
    else if (m.mortalityRate <= 4) mort = 50;
    else mort = 20;
  }
  const feed = m.feedEfficiency != null ? Math.min(100, Math.max(0, m.feedEfficiency)) : 70;
  const budget = m.budgetAdherence != null ? Math.min(100, Math.max(0, m.budgetAdherence)) : 70;
  let recovery = m.capitalRecovery != null ? Math.min(100, Math.max(0, m.capitalRecovery)) : 0;
  if (m.capitalRecovery > 100) recovery = 100;
  const alertScore = 100; // no alerts table yet
  return prod * 0.25 + mort * 0.15 + feed * 0.15 + budget * 0.15 + recovery * 0.15 + alertScore * 0.15;
}

const sum = (rows, k) => rows.reduce((s, r) => s + Number(r[k] || 0), 0);

export function computeSummary({ capital, expenses, sales, daily, budgetLines, criticalAlerts = 0 }) {
  const cap = sum(capital, 'amount');
  const exp = sum(expenses, 'amount');
  const revenue = sum(sales, 'total_revenue');
  const production = latestProduction(daily);
  const mortality = mortalityStats(daily);
  const feed = feedStats(daily);
  const budget = budgetStats(budgetLines);
  const commercial = commercialStatus(production);

  let feedAllocation = 0, grossProfit = 0, operatingShare = 0, netProfit = 0;
  if (commercial.reached) {
    feedAllocation = revenue * 0.5; grossProfit = revenue * 0.5;
    operatingShare = grossProfit * 0.25; netProfit = grossProfit - operatingShare;
  }
  const roi = cap > 0 ? (netProfit / cap) * 100 : 0;
  const cashPosition = cap - exp + (commercial.reached ? netProfit : 0);
  const outstandingFunding = Math.max(0, budget.totalBudget - cap);
  const excessFunding = Math.max(0, cap - budget.totalBudget);
  const fundedPct = budget.totalBudget > 0 ? Math.round((cap / budget.totalBudget) * 1000) / 10 : 0;
  const healthScore = computeHealthScore({
    productionPercent: production.layingPercent, mortalityRate: mortality.rate,
    feedEfficiency: feed.efficiencyScore, budgetAdherence: budget.adherence,
    capitalRecovery: roi, openCriticalAlerts: criticalAlerts,
  });

  return {
    healthScore: Math.round(healthScore),
    totalInvestment: cap, totalExpenses: exp, revenue,
    netProfit, roi: Math.round(roi * 10) / 10, capitalRecovery: Math.round(roi * 10) / 10,
    cashPosition, outstandingFunding, excessFunding, fundedPct,
    fundingStatus: fundedPct < 100 ? 'underfunded' : fundedPct === 100 ? 'funded' : 'overfunded',
    budgetSpent: budget.spent, budgetTotal: budget.totalBudget,
    productionPercent: production.layingPercent, productionTargetMin: 88, productionTargetMax: 92,
    commercialReached: commercial.reached, daysToCommercial: commercial.daysTo,
    currentWeek: production.week, birdCount: production.birds,
    mortalityRate: mortality.rate, mortalityCount: mortality.count,
    feedDaysRemaining: feed.daysRemaining, feedEfficiency: feed.kgPerDozen,
    openAlerts: 0, criticalAlerts,
    eggTrend: production.trend, mortalityTrend: mortality.trend,
  };
}

export function buildInsights(s) {
  const insights = [];
  if (s.healthScore >= 80) insights.push({ severity: 'positive', text: 'Investment health is strong at ' + s.healthScore + '/100. Operations and financials are aligned with targets.' });
  else if (s.healthScore >= 60) insights.push({ severity: 'caution', text: 'Investment health is moderate (' + s.healthScore + '/100). Review production and budget variances.' });
  else insights.push({ severity: 'critical', text: 'Investment health is weak (' + s.healthScore + '/100). Immediate review of production, mortality and funding is recommended.' });

  if (s.commercialReached) insights.push({ severity: 'positive', text: 'Commercial production has been reached. Revenue allocation is active.' });
  else if (s.daysToCommercial != null && s.daysToCommercial > 0) insights.push({ severity: 'info', text: 'Commercial production is expected in approximately ' + s.daysToCommercial + ' days (Week 25).' });
  else if (s.currentWeek != null) insights.push({ severity: 'info', text: 'Flock is in week ' + s.currentWeek + '. Commercial production target is week 25 or 85% laying capacity.' });

  if (s.productionPercent != null) {
    if (s.productionPercent < 80) insights.push({ severity: 'critical', text: 'Production is at ' + s.productionPercent + '%, below the 80% off-lay threshold. Joint review required if sustained for 4 weeks.' });
    else if (s.productionPercent < 88) insights.push({ severity: 'caution', text: 'Production is at ' + s.productionPercent + '%, below the contractual target band of 88–92%.' });
    else insights.push({ severity: 'positive', text: 'Production is at ' + s.productionPercent + '%, within the expected 88–92% target band.' });
  }
  if (s.mortalityRate != null && s.mortalityRate > 2) insights.push({ severity: 'caution', text: 'Mortality rate is ' + s.mortalityRate + '%. Investigate causes and biosecurity.' });
  else if (s.mortalityRate != null) insights.push({ severity: 'positive', text: 'Mortality remains within acceptable thresholds (' + s.mortalityRate + '%).' });

  if (s.fundedPct > 100) insights.push({ severity: 'positive', text: 'Funding exceeded by ' + (Math.round((s.fundedPct - 100) * 10) / 10) + '% — surplus UGX ' + Math.round(s.excessFunding).toLocaleString() + ' beyond target.' });
  else if (s.outstandingFunding > 0) insights.push({ severity: 'caution', text: 'Outstanding funding requirement is UGX ' + Math.round(s.outstandingFunding).toLocaleString() + '.' });
  else if (s.fundedPct === 100) insights.push({ severity: 'positive', text: 'Funding is fully subscribed at 100% — UGX ' + Math.round(s.totalInvestment).toLocaleString() + ' received.' });

  if (s.roi != null && s.commercialReached) insights.push({ severity: s.roi >= 0 ? 'positive' : 'caution', text: 'ROI stands at ' + s.roi + '% based on net profit attributable to the Investment Partner.' });
  if (s.criticalAlerts > 0) insights.push({ severity: 'critical', text: s.criticalAlerts + ' critical alert(s) require immediate attention.' });
  if (insights.length === 0) insights.push({ severity: 'info', text: 'Awaiting operational data. Log daily production, feed and expenses to generate live intelligence.' });
  return insights.slice(0, 8);
}

/* Live alert rules (client-side engine until Alerts module lands) */
export function deriveAlerts({ daily, allocations, summary }) {
  const alerts = [];
  const sorted = [...(daily || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  sorted.slice(0, 7).forEach((r) => {
    const o = Number(r.opening_birds) || 0, m = Number(r.mortality) || 0;
    if (o > 0 && m / o > 0.01) {
      alerts.push({ priority: 'Critical', title: 'Abnormal mortality',
        reason: m + ' birds lost on ' + String(r.date).slice(0, 10) + ' (' + (Math.round((m / o) * 1000) / 10) + '%)' });
    }
  });
  if (summary.productionPercent != null && summary.productionPercent < 80) {
    alerts.push({ priority: 'Critical', title: 'Production below threshold',
      reason: 'Production is at ' + summary.productionPercent + '%, below the 80% off-lay threshold.' });
  }
  if (summary.mortalityRate != null && summary.mortalityRate > 2) {
    alerts.push({ priority: 'High', title: 'Elevated mortality',
      reason: 'Cumulative mortality rate is ' + summary.mortalityRate + '%. Investigate causes and biosecurity.' });
  }
  if (summary.outstandingFunding > 0) {
    alerts.push({ priority: 'High', title: 'Funding required',
      reason: 'Outstanding funding requirement is UGX ' + Math.round(summary.outstandingFunding).toLocaleString() });
  }
  const now = new Date();
  const lmKey = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const finalized = (allocations || []).some((a) => String(a.month).slice(0, 7) === lmKey);
  if (!finalized) {
    const overdue = now.getDate() > 10;
    alerts.push({ priority: overdue ? 'Critical' : 'Medium',
      title: 'Monthly statement ' + (overdue ? 'overdue' : 'due'),
      reason: 'Investment Statement for ' + lmKey + (overdue ? ' is overdue' : ' is due by the 10th') });
  }
  const rank = { Critical: 0, High: 1, Medium: 2 };
  alerts.sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3));
  return alerts.slice(0, 8);
}

export function recentActivity({ daily, capital, sales }) {  const items = [];
  [...daily].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).forEach((r) => {
    items.push({ type: 'production', title: 'Daily production logged', detail: (r.eggs_collected || 0) + ' eggs · mortality ' + (r.mortality || 0), date: String(r.date).slice(0, 10) });
  });
  [...capital].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3).forEach((r) => {
    items.push({ type: 'capital', title: 'Capital contribution', detail: 'UGX ' + Number(r.amount || 0).toLocaleString(), date: String(r.date).slice(0, 10) });
  });
  [...sales].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3).forEach((r) => {
    items.push({ type: 'sale', title: 'Egg sale', detail: 'UGX ' + Number(r.total_revenue || 0).toLocaleString(), date: String(r.date).slice(0, 10) });
  });
  items.sort((a, b) => new Date(b.date) - new Date(a.date));
  return items.slice(0, 10);
}
