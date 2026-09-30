/* Alert engine — port of Alerts.gs runEngine (9 rules, open-title dedup) */
import { supabase } from './supabaseClient.js';
import { financialSummary, forecast, isCommercial } from './finance.js';

const PID = 'LUK54';
const T = (v) => String(v || '').slice(0, 10);

async function table(name, order = 'date', limit = 1000) {
  const { data, error } = await supabase.from(name).select('*').order(order, { ascending: false }).limit(limit);
  if (error) throw error;
  return data || [];
}

async function createAlert(openTitles, alert) {
  if (openTitles.has(alert.title)) return { deduped: true };
  const { data, error } = await supabase.from('alerts').insert({
    project_id: PID, priority: alert.priority, title: alert.title,
    reason: alert.reason || '', suggested_action: alert.action || '',
    type: alert.type || 'System', status: 'Open', deadline: alert.deadline || '',
  }).select().single();
  if (error) throw error;
  openTitles.add(alert.title);
  return { data, deduped: false };
}

export async function runEngine(onProgress) {
  const [daily, sched, feedInv, inv, capital, expenses, sales, budget, alloc, dist] = await Promise.all([
    table('daily_production'), supabase.from('vaccination_schedule').select('*').then((r) => { if (r.error) throw r.error; return r.data || []; }),
    supabase.from('feed_inventory').select('*').then((r) => { if (r.error) throw r.error; return r.data || []; }),
    supabase.from('inventory').select('*').then((r) => { if (r.error) throw r.error; return r.data || []; }),
    table('capital_contributions'), table('expenses'), table('sales'),
    supabase.from('budget_lines').select('*').then((r) => { if (r.error) throw r.error; return r.data || []; }),
    supabase.from('revenue_allocations').select('*').then((r) => { if (r.error) throw r.error; return r.data || []; }),
    supabase.from('profit_distributions').select('*').then((r) => { if (r.error) throw r.error; return r.data || []; }),
  ]);
  const { data: openRows } = await supabase.from('alerts').select('title').eq('project_id', PID).eq('status', 'Open');
  const { data: ackRows } = await supabase.from('alerts').select('title').eq('project_id', PID).eq('status', 'Acknowledged');
  const openTitles = new Set([...(openRows || []), ...(ackRows || [])].map((r) => r.title));
  const created = [];
  const push = async (a) => {
    const res = await createAlert(openTitles, a);
    if (res.data && !res.deduped) created.push(res.data);
    if (onProgress) onProgress(created.length);
  };
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  // 1. vaccination due (window -7..+3 days)
  for (const s of sched) {
    if (s.status === 'Completed' || s.status === 'Recurring' || !s.planned_date) continue;
    const days = Math.ceil((new Date(s.planned_date) - today) / 86400000);
    if (days <= 3 && days >= -7) {
      await push({ priority: days < 0 ? 'High' : days <= 1 ? 'High' : 'Medium',
        title: 'Vaccination due: ' + s.vaccine,
        reason: 'Scheduled for week ' + (s.week ?? '?') + ' on ' + T(s.planned_date) + (days < 0 ? ' (overdue)' : ' (in ' + days + ' day(s))'),
        action: 'Log vaccination under Health & Vaccination', deadline: T(s.planned_date), type: 'Vaccination' });
    }
  }

  // 2. low feed (days of stock from 7-day avg of feed_issued_kg)
  const last7 = [...daily].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 7);
  const avgDaily = last7.length ? last7.reduce((x, r) => x + Number(r.feed_issued_kg || 0), 0) / last7.length : 0;
  for (const item of feedInv) {
    const stock = Number(item.closing_stock || 0);
    const days = avgDaily > 0 ? stock / avgDaily : 999;
    if (stock > 0 && days < 5) {
      await push({ priority: 'Critical', title: 'Low feed stock: ' + item.product,
        reason: item.product + ' has ~' + Math.round(days) + ' days remaining (' + stock + ' kg)',
        action: 'Record a feed purchase immediately', deadline: todayKey, type: 'Inventory' });
    } else if (stock > 0 && days < 14) {
      await push({ priority: 'High', title: 'Feed reorder soon: ' + item.product,
        reason: item.product + ' covers about ' + Math.round(days) + ' days',
        action: 'Plan feed purchase within the week', type: 'Inventory' });
    }
  }

  // 3. low inventory vs reorder level
  for (const item of inv) {
    const qty = Number(item.quantity || 0), reorder = Number(item.reorder_level || 0);
    if (reorder > 0 && qty <= reorder) {
      await push({ priority: 'High', title: 'Low inventory: ' + item.name,
        reason: item.name + ' is at ' + qty + ' ' + (item.unit || '') + ' (reorder level ' + reorder + ')',
        action: 'Adjust or purchase stock', type: 'Inventory' });
    }
  }

  // 4. abnormal mortality (last 2 logs, >1%)
  const recent = [...daily].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 2);
  if (recent.some((r) => { const o = Number(r.opening_birds) || 0; return o > 0 && Number(r.mortality || 0) / o > 0.01; })) {
    const r0 = recent[0];
    const o = Number(r0.opening_birds) || 0;
    await push({ priority: 'Critical', title: 'Abnormal mortality',
      reason: (r0.mortality || 0) + ' birds lost on ' + T(r0.date) + (o > 0 ? ' (' + (Math.round((Number(r0.mortality || 0) / o) * 1000) / 10) + '%)' : ''),
      action: 'Investigate causes, review biosecurity, notify Investment Partner', deadline: T(r0.date), type: 'Mortality' });
  }

  // 5. low production streak (<80%)
  const sorted = [...daily].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  for (const r of sorted.slice(0, 28)) {
    const birds = Number(r.closing_birds) || Number(r.opening_birds);
    const pct = birds > 0 ? (Number(r.eggs_collected || 0) / birds) * 100 : 100;
    if (pct < 80) streak++;
    else break;
  }
  if (Math.floor(streak / 7) >= 4) {
    await push({ priority: 'Critical', title: 'Production below off-lay threshold',
      reason: 'Production has been below 80% for approximately ' + Math.floor(streak / 7) + ' consecutive weeks',
      action: 'Joint review recommended — production has been below threshold', type: 'Production' });
  } else if (streak >= 7) {
    await push({ priority: 'High', title: 'Production below target',
      reason: 'Laying rate has been below 80% for ' + streak + ' consecutive days',
      action: 'Review flock health, feed and environment', type: 'Production' });
  }

  // 6. missing daily (yesterday)
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yStr = y.toISOString().slice(0, 10);
  if (daily.length > 0 && !daily.some((r) => T(r.date) === yStr)) {
    await push({ priority: 'Medium', title: 'Missing daily production entry',
      reason: 'No production log found for ' + yStr,
      action: 'Complete the Daily Log for yesterday', deadline: yStr, type: 'Operations' });
  }

  // 7. funding required
  const revenue = sales.reduce((s, r) => s + Number(r.total_revenue || 0), 0);
  const commercial = isCommercial(daily);
  const fs = financialSummary({ capital, expenses, revenue, distributions: dist, budget, commercial });
  if (fs.outstandingFunding > 1000000) {
    await push({ priority: 'High', title: 'Funding required',
      reason: 'Outstanding funding requirement is UGX ' + Math.round(fs.outstandingFunding).toLocaleString(),
      action: 'Review capital plan with Investment Partner', type: 'Finance' });
  }
  const fc = forecast(fs, sales, expenses, 14);
  if (fc.fundingRequired > 500000) {
    await push({ priority: 'High', title: 'Funding may be required within 2 weeks',
      reason: 'Projected shortfall of UGX ' + Math.round(fc.fundingRequired).toLocaleString() + ' over 14 days',
      action: 'Plan capital contribution', type: 'Finance' });
  }

  // 8. statement due (days 1–10, prev month not finalized)
  const day = today.getDate();
  if (day >= 1 && day <= 10) {
    const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const period = prev.getFullYear() + '-' + String(prev.getMonth() + 1).padStart(2, '0');
    const done = alloc.some((h) => String(h.month).slice(0, 7) === period);
    if (!done) {
      await push({ priority: day >= 10 ? 'Critical' : day >= 8 ? 'High' : 'Medium',
        title: day >= 10 ? 'Monthly statement overdue' : 'Monthly statement due',
        reason: 'Investment Statement for ' + period + (day >= 10 ? ' is overdue' : ' is due by the 10th'),
        action: 'Generate Monthly Investment Statement from Reports',
        deadline: today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-10', type: 'Reporting' });
    }
  }

  // 9. commercial approaching (week 22–24)
  const week = Math.ceil((today - new Date('2026-06-01')) / (7 * 86400000));
  if (week >= 22 && week < 25 && !commercial) {
    await push({ priority: 'Medium', title: 'Commercial production approaching',
      reason: 'Flock is in week ' + week + '. Commercial production expected at week 25 or 85% laying',
      action: 'Monitor production percentage daily', type: 'Production' });
  }

  return { evaluated: true, created: created.length, alerts: created };
}

export async function listAlerts(status = 'Open') {
  let q = supabase.from('alerts').select('*').eq('project_id', PID).order('created_at', { ascending: false }).limit(200);
  const { data, error } = await q;
  if (error) throw error;
  let rows = data || [];
  if (status === 'Open') rows = rows.filter((a) => ['open', 'acknowledged'].includes(String(a.status).toLowerCase()));
  if (status === 'Resolved') rows = rows.filter((a) => String(a.status).toLowerCase() === 'resolved');
  const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  rows.sort((a, b) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9));
  return rows;
}

/* Investor sees finance/reporting only — mirrors role-filtered inbox */
export function visibleToRole(rows, role) {
  if (role === 'admin' || role === 'operating_partner') return rows;
  return rows.filter((a) => ['Finance', 'Reporting'].includes(a.type));
}
