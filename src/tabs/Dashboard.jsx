import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { supabase } from '../lib/supabaseClient.js';
import { formatDate, formatNumber, formatPercent, formatUGX } from '../lib/format.js';
import { buildInsights, computeSummary, deriveAlerts, recentActivity } from '../lib/dashboard.js';
import { Badge, useToast } from '../components/ui.jsx';
import { Icon } from '../components/shell.jsx';

Chart.register(...registerables);

function applyChartTheme() {
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  Chart.defaults.color = css('--color-text-secondary') || '#a9b6b0';
  Chart.defaults.borderColor = css('--color-border') || '#26332e';
}

function healthLabel(score) {
  if (score == null) return { text: '—', cls: 'neutral' };
  if (score >= 80) return { text: 'Strong', cls: 'positive' };
  if (score >= 60) return { text: 'Moderate', cls: 'caution' };
  return { text: 'Weak', cls: 'critical' };
}

const SEV_ICON = { positive: Icon.check, caution: Icon.warn, critical: Icon.octagon, info: Icon.info };

export default function Dashboard({ role, onNavigate, setActions }) {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState([]);
  const [activity, setActivity] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [trays, setTrays] = useState(null);
  const [eat, setEat] = useState('--:--');
  const [tick, setTick] = useState(0);
  const eggRef = useRef(null);
  const capRef = useRef(null);
  const charts = useRef([]);

  useEffect(() => {
    setActions(
      <button className="btn btn-secondary btn-sm" onClick={() => setTick((t) => t + 1)}>Refresh</button>
    );
    return () => setActions(null);
  }, []);

  async function load() {
    charts.current.forEach((c) => { try { c.destroy(); } catch (e) {} });
    charts.current = [];
    const [cap, exp, sales, bud, daily, alloc] = await Promise.all([
      supabase.from('capital_contributions').select('*').limit(500),
      supabase.from('expenses').select('*').limit(500),
      supabase.from('sales').select('*').limit(500),
      supabase.from('budget_lines').select('*').limit(200),
      supabase.from('daily_production').select('*').order('date').limit(500),
      supabase.from('revenue_allocations').select('*').limit(100),
    ]);
    const err = [cap, exp, sales, bud, daily, alloc].map((r) => r.error).filter(Boolean)[0];
    if (err) { toast('error', err.message); return; }
    const base = {
      capital: cap.data || [], expenses: exp.data || [], sales: sales.data || [],
      daily: daily.data || [], budgetLines: bud.data || [],
    };
    const pass1 = computeSummary({ ...base, criticalAlerts: 0 });
    const al = deriveAlerts({ daily: base.daily, allocations: alloc.data || [], summary: pass1 });
    const crit = al.filter((a) => a.priority === 'Critical').length;
    const s = computeSummary({ ...base, criticalAlerts: crit });
    s.openAlerts = al.length; s.criticalAlerts = crit;
    setSummary(s);
    setAlerts(al);
    setInsights(buildInsights(s));
    setActivity(recentActivity(base));
    const D = base.daily, S = base.sales;
    setTrays({
      collected: D.reduce((x, r) => x + Number(r.eggs_trays ?? (Number(r.eggs_collected || 0) / 30)), 0),
      sold: S.reduce((x, r) => x + Number(r.quantity_trays ?? (Number(r.quantity_eggs || 0) / 30)), 0),
      breakages: D.reduce((x, r) => x + Number(r.breakages || 0) / 30, 0),
      lost: 0, damaged: 0, logs: D.length, sales: S.length,
    });
    drawCharts(s);
  }

  function drawCharts(s) {
    applyChartTheme();
    const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    if (eggRef.current) {
      const trend = s.eggTrend || [];
      const labels = trend.length ? trend.map((t) => { const d = new Date(t.date); return isNaN(d) ? t.date : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }) : ['—'];
      const ctx = eggRef.current.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 180);
      const accent = css('--color-accent') || '#45c58a';
      grad.addColorStop(0, accent + '22'); grad.addColorStop(1, accent + '00');
      charts.current.push(new Chart(ctx, {
        type: 'line',
        data: { labels, datasets: [
          { label: 'Trays', data: trend.length ? trend.map((t) => t.trays) : [0], borderColor: accent, backgroundColor: grad, fill: true, tension: 0.32, pointRadius: 2, yAxisID: 'y' },
          { label: 'Laying %', data: trend.length ? trend.map((t) => t.percent) : [0], borderColor: '#6b7280', borderDash: [4, 4], tension: 0.32, pointRadius: 0, yAxisID: 'y1' },
        ] },
        options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
          plugins: { legend: { display: true } },
          scales: { y: { position: 'left', title: { display: true, text: 'Trays (30 eggs)' } }, y1: { position: 'right', min: 0, max: 100, grid: { drawOnChartArea: false }, title: { display: true, text: '%' } }, x: { grid: { display: false } } } },
      }));
    }
    if (capRef.current) {
      const inv = s.totalInvestment || 0, exp = s.totalExpenses || 0;
      const accent = css('--color-accent') || '#45c58a';
      charts.current.push(new Chart(capRef.current, {
        type: 'bar',
        data: { labels: ['Invested', 'Spent', 'Unspent', 'Net Profit'],
          datasets: [{ data: [inv, exp, Math.max(0, inv - exp), Math.max(0, s.netProfit || 0)],
            backgroundColor: [accent, '#9ca3af', '#e8e0d6', '#059669'], borderRadius: 8, barThickness: 28 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, ticks: { callback: (v) => 'UGX ' + Number(v).toLocaleString() } }, x: { grid: { display: false } } } },
      }));
    }
  }

  useEffect(() => {
    load();
    const tickClock = () => { try { setEat(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Kampala', hour: '2-digit', minute: '2-digit' })); } catch (e) {} };
    tickClock();
    const t = setInterval(tickClock, 30000);
    return () => { clearInterval(t); charts.current.forEach((c) => { try { c.destroy(); } catch (e) {} }); };
  }, [tick]);

  const kpis = summary ? [
    { label: 'Total Investment', value: formatUGX(summary.totalInvestment), insight: 'Total capital contributed', nav: 'finance', primary: role === 'investment_partner' },
    { label: 'Total Expenses', value: formatUGX(summary.totalExpenses), insight: 'Cumulative expenditure', nav: 'finance' },
    { label: 'Gross Revenue', value: formatUGX(summary.revenue), insight: summary.commercialReached ? 'Egg sales' : 'Allocation not yet active', nav: 'finance', primary: role === 'investment_partner' },
    { label: 'Net Profit (Investor)', value: formatUGX(summary.netProfit), insight: 'After feed + operator share', nav: 'finance', primary: role === 'investment_partner' },
    { label: 'ROI', value: formatPercent(summary.roi), insight: 'Net profit ÷ capital', nav: 'finance', trend: summary.roi > 0 ? { direction: 'up', label: 'vs capital' } : null },
    { label: 'Cash Position', value: formatUGX(summary.cashPosition), insight: 'Capital − expenses + net', nav: 'finance' },
    { label: 'Outstanding Funding', value: formatUGX(summary.outstandingFunding), insight: summary.outstandingFunding > 0 ? 'Additional capital may be required' : 'Within estimate', nav: 'finance' },
    { label: 'Production', value: summary.productionPercent != null ? formatPercent(summary.productionPercent) : '—', insight: 'Target 88–92% · ≥85% commercial', nav: null },
    { label: 'Mortality Rate', value: summary.mortalityRate != null ? formatPercent(summary.mortalityRate) : '—', insight: 'Cumulative vs peak', nav: null },
    { label: 'Budget Performance', value: summary.budgetTotal ? formatPercent(summary.budgetSpent && summary.budgetTotal ? (summary.budgetSpent / summary.budgetTotal) * 100 : 0) : '—', insight: 'Actual vs estimate', nav: 'finance' },
    { label: 'Capital Recovery', value: formatPercent(summary.capitalRecovery), insight: 'Returned via net profit', nav: 'finance' },
  ] : [];

  const hl = healthLabel(summary?.healthScore);
  const ring = hl.cls === 'positive' ? 'var(--color-positive)' : hl.cls === 'caution' ? 'var(--color-caution)' : hl.cls === 'critical' ? 'var(--color-critical)' : 'var(--color-text-muted)';
  const netTrays = trays ? Math.max(0, trays.collected - trays.sold - trays.lost - trays.damaged - trays.breakages) : 0;

  return (
    <>
      <div className="card" style={{ padding: '10px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', background: 'linear-gradient(135deg, var(--color-bg-elevated), var(--color-bg-subtle))', border: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: 'var(--color-text-secondary)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-positive)', boxShadow: '0 0 0 6px var(--color-positive-soft)' }} /> LIVE
          </span>
          <span>EAT {eat}</span><span className="u-text-muted">•</span>
          <span>{summary?.eggTrend?.length ? 'Last log ' + summary.eggTrend[summary.eggTrend.length - 1].date + ' · ' + (summary.productionPercent ?? '—') + '%' : 'Last log —'}</span>
          <span className="u-text-muted">•</span><span>{summary ? formatNumber(summary.birdCount) + ' birds' : '— birds'}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
          {summary?.currentWeek ? 'Week ' + summary.currentWeek + ' · ' + (summary.commercialReached ? 'Commercial active' : 'Pre-commercial') : ''}
        </div>
      </div>

      <div className="card" style={{ padding: 18, marginBottom: 18, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(600px 200px at 20% 0%, rgba(26,92,62,0.06), transparent 60%)', pointerEvents: 'none' }} />
        {!summary ? <div className="skeleton" style={{ height: 72 }} /> : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', position: 'relative' }}>
            <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0, filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.08))' }}>
              <svg viewBox="0 0 36 36" style={{ width: 96, height: 96, transform: 'rotate(-90deg)' }}>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-border)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={ring} strokeWidth="3.2" strokeDasharray={(summary.healthScore != null ? summary.healthScore : 0) + ',100'} strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: 22, fontWeight: 800 }}>{summary.healthScore ?? '—'}</span>
                <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Health</span>
              </div>
              <span style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, background: ring, border: '2px solid var(--color-bg-elevated)', borderRadius: '50%', boxShadow: '0 0 0 4px ' + ring + '20' }} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <h2 style={{ fontSize: 16, margin: 0 }}>Investment Health</h2>
                <Badge tone={hl.cls === 'neutral' ? 'neutral' : hl.cls}>{hl.text}</Badge>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-muted)' }}>Updated {new Date().toLocaleDateString()}</span>
              </div>
              <p className="u-text-sm u-text-secondary" style={{ maxWidth: 620, lineHeight: 1.6 }}>
                {summary.healthScore != null ? 'Composite of production, mortality, feed efficiency, budget adherence, capital recovery and alerts — ' + (hl.cls === 'positive' ? 'on track.' : hl.cls === 'caution' ? 'needs attention.' : 'requires action.') : 'Score populates once production, feed and financial records are available.'}
              </p>
              <div style={{ display: 'flex', gap: 16, marginTop: 10, flexWrap: 'wrap' }}>
                <span className="u-text-xs" style={{ background: 'var(--color-bg-subtle)', padding: '6px 10px', borderRadius: 999 }}>Week {summary.currentWeek ?? '—'} · {formatNumber(summary.birdCount)} birds</span>
                <span className="u-text-xs" style={{ background: summary.commercialReached ? 'var(--color-positive-soft)' : 'var(--color-bg-subtle)', color: summary.commercialReached ? 'var(--color-positive)' : 'var(--color-text-muted)', padding: '6px 10px', borderRadius: 999 }}>
                  {summary.commercialReached ? '● Commercial active' : (summary.daysToCommercial != null ? '◷ ' + summary.daysToCommercial + ' days to commercial' : 'Building to commercial')}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="card-header"><h3 style={{ margin: 0, fontSize: 14 }}>Egg Production Trend</h3>
            {summary && <Badge tone={summary.productionPercent != null ? (summary.productionPercent >= 88 ? 'positive' : summary.productionPercent >= 80 ? 'caution' : 'critical') : 'neutral'}>
              {summary.productionPercent != null ? summary.productionPercent + '%' : 'No data'}</Badge>}
          </div>
          <div className="card-body"><div className="chart-container" style={{ height: 240 }}><canvas ref={eggRef} /></div></div>
        </div>
        <div className="card">
          <div className="card-header"><h3 style={{ margin: 0, fontSize: 14 }}>Capital Flow</h3><span className="u-text-xs u-text-muted">Invested → Spent → Net</span></div>
          <div className="card-body"><div className="chart-container" style={{ height: 240 }}><canvas ref={capRef} /></div></div>
        </div>
      </div>

      <div className="kpi-grid" style={{ marginBottom: 18 }}>
        {summary ? kpis.map((it) => (
          <div className={'card kpi-card' + (it.primary ? ' kpi-primary' : '') + (it.nav ? ' clickable' : '')} key={it.label}
            onClick={() => it.nav && onNavigate(it.nav)}>
            <div className="kpi-label">{it.label}</div>
            <div className="kpi-value">{it.value ?? '—'}</div>
            {it.trend && <div className={'kpi-trend ' + it.trend.direction}>{it.trend.direction === 'up' ? Icon.trendUp : Icon.trendDown}<span>{it.trend.label}</span></div>}
            <div className="kpi-insight">{it.insight || ''}</div>
            {it.nav && <span className="chev">›</span>}
          </div>
        )) : <div className="skeleton" style={{ height: 120 }} />}
      </div>

      <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--color-accent-soft)', color: 'var(--color-accent)', display: 'grid', placeItems: 'center', width: 38 }}>{Icon.package}</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 14 }}>Egg Trays — Stock Balance</h3>
            <p className="u-text-xs u-text-muted" style={{ margin: '2px 0 0' }}>
              {trays ? 'From daily logs and sales · ' + trays.logs + ' logs · ' + trays.sales + ' sales' : 'Loading…'}
            </p>
          </div>
          {trays && <Badge tone="neutral">{formatNumber(trays.collected, 1) + ' trays collected'}</Badge>}
        </div>
        {!trays ? <div className="skeleton" style={{ height: 120 }} /> : (
          <div className="kpi-grid">
            <div className="card kpi-card" style={{ borderLeft: '3px solid var(--color-accent)' }}><div className="kpi-label">Collected</div><div className="kpi-value">{formatNumber(trays.collected, 1)}</div><div className="kpi-insight">Daily log · trays</div></div>
            <div className="card kpi-card"><div className="kpi-label">Sold</div><div className="kpi-value">{formatNumber(trays.sold, 1)}</div><div className="kpi-insight">Sales · trays</div></div>
            <div className="card kpi-card"><div className="kpi-label">Breakages</div><div className="kpi-value">{formatNumber(trays.breakages, 1)}</div><div className="kpi-insight">Eggs/30 · daily</div></div>
            <div className="card kpi-card"><div className="kpi-label">Lost / Exchange</div><div className="kpi-value">{formatNumber(trays.lost, 1)}</div><div className="kpi-insight">Daily lost + sales lost</div></div>
            <div className="card kpi-card"><div className="kpi-label">Damaged</div><div className="kpi-value">{formatNumber(trays.damaged, 1)}</div><div className="kpi-insight">Sales damaged trays</div></div>
            <div className="card kpi-card" style={{ background: 'var(--color-bg-subtle)', borderColor: 'var(--color-accent)' }}><div className="kpi-label">Net Available</div><div className="kpi-value">{formatNumber(netTrays, 1)}</div><div className="kpi-insight">Collected − sold − lost − damaged − breakages</div></div>
          </div>
        )}
      </div>

      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-header"><h3 style={{ margin: 0, fontSize: 14 }}>Executive Insights</h3></div>
          <div className="card-body">
            {!summary ? <div className="skeleton" style={{ height: 120 }} /> : insights.length ? insights.map((ins, i) => (
              <div className={'insight-card ' + (ins.severity || 'info')} style={{ marginBottom: 10 }} key={i}>
                <div className="insight-icon">{SEV_ICON[ins.severity] || Icon.info}</div>
                <div style={{ flex: 1 }}>
                  <div className="insight-text">{ins.text}</div>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, fontSize: 11 }}
                    onClick={() => onNavigate(ins.severity === 'critical' ? 'alerts' : 'reports')}>
                    View {ins.severity === 'critical' ? 'alerts' : 'report'} →
                  </button>
                </div>
              </div>
            )) : <div className="empty-state" style={{ padding: 18 }}><p className="empty-state-desc">No insights yet.</p></div>}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 style={{ margin: 0, fontSize: 14 }}>Active Alerts</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('alerts')}>View all</button></div>
          <div className="card-body">
            {!summary ? <div className="skeleton" style={{ height: 100 }} /> : alerts.length ? alerts.slice(0, 5).map((a, i) => {
              const badge = a.priority === 'Critical' ? 'critical' : a.priority === 'High' ? 'caution' : 'neutral';
              return (
                <div style={{ padding: '8px 0', borderBottom: '1px solid var(--color-border)' }} key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <Badge tone={badge}>{a.priority}</Badge>
                    <span className="u-text-sm u-font-medium u-truncate">{a.title}</span>
                  </div>
                  <div className="u-text-xs u-text-muted">{a.reason}</div>
                </div>
              );
            }) : <div className="empty-state" style={{ padding: 14 }}><p className="empty-state-desc">No open alerts</p></div>}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header"><h3 style={{ margin: 0, fontSize: 14 }}>Recent Activity</h3></div>
        <div className="card-body" style={{ maxHeight: 280, overflowY: 'auto' }}>
          {!summary ? <div className="skeleton" style={{ height: 100 }} /> : activity.length ? activity.map((a, i) => (
            <div style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }} key={i}>
              <div className="act-icon">{a.type === 'capital' ? Icon.banknote : a.type === 'sale' ? Icon.cart : Icon.reports}</div>
              <div style={{ minWidth: 0 }}>
                <div className="u-text-sm u-font-medium u-truncate">{a.title}</div>
                <div className="u-text-xs u-text-muted">{a.detail}</div>
                <div className="u-text-xs u-text-muted">{formatDate(a.date)}</div>
              </div>
            </div>
          )) : <div className="empty-state" style={{ padding: 14 }}><p className="empty-state-desc">No recent activity. Daily logs and sales will appear here.</p></div>}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header"><h3 style={{ margin: 0, fontSize: 14 }}>Quick Actions</h3></div>
        <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {(role === 'admin' || role === 'operating_partner') && <button className="btn btn-primary btn-sm" onClick={() => onNavigate('operations')}>Log Daily Production</button>}
          {(role === 'admin' || role === 'investment_partner') && <button className="btn btn-primary btn-sm" onClick={() => onNavigate('finance')}>Add Capital</button>}
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('finance')}>Review Funding</button>
        </div>
      </div>
    </>
  );
}
