import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';
import { supabase } from '../lib/supabaseClient.js';
import { formatDate, formatNumber, formatPercent, formatUGX } from '../lib/format.js';
import { buildInsights, computeSummary, recentActivity } from '../lib/dashboard.js';
import { Badge, useToast } from '../components/ui.jsx';

Chart.register(...registerables);

function healthLabel(score) {
  if (score == null) return { text: '—', cls: 'neutral' };
  if (score >= 80) return { text: 'Strong', cls: 'positive' };
  if (score >= 60) return { text: 'Moderate', cls: 'caution' };
  return { text: 'Weak', cls: 'critical' };
}

export default function Dashboard({ role, onNavigate }) {
  const toast = useToast();
  const [summary, setSummary] = useState(null);
  const [insights, setInsights] = useState([]);
  const [activity, setActivity] = useState([]);
  const [eat, setEat] = useState('--:--');
  const eggRef = useRef(null);
  const capRef = useRef(null);
  const charts = useRef([]);

  async function load() {
    charts.current.forEach((c) => { try { c.destroy(); } catch (e) {} });
    charts.current = [];
    const [cap, exp, sales, bud, daily] = await Promise.all([
      supabase.from('capital_contributions').select('*').limit(500),
      supabase.from('expenses').select('*').limit(500),
      supabase.from('sales').select('*').limit(500),
      supabase.from('budget_lines').select('*').limit(200),
      supabase.from('daily_production').select('*').order('date').limit(500),
    ]);
    const err = [cap, exp, sales, bud, daily].map((r) => r.error).filter(Boolean)[0];
    if (err) { toast('error', err.message); return; }
    const s = computeSummary({
      capital: cap.data || [], expenses: exp.data || [], sales: sales.data || [],
      daily: daily.data || [], budgetLines: bud.data || [],
    });
    setSummary(s);
    setInsights(buildInsights(s));
    setActivity(recentActivity({ daily: daily.data || [], capital: cap.data || [], sales: sales.data || [] }));
    drawCharts(s);
  }

  function drawCharts(s) {
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
    const tick = () => { try { setEat(new Date().toLocaleString('en-GB', { timeZone: 'Africa/Kampala', hour: '2-digit', minute: '2-digit' })); } catch (e) {} };
    tick();
    const t = setInterval(tick, 30000);
    return () => { clearInterval(t); charts.current.forEach((c) => { try { c.destroy(); } catch (e) {} }); };
  }, []);

  const kpis = summary ? [
    { label: 'Total Investment', value: formatUGX(summary.totalInvestment), insight: 'Total capital contributed', nav: 'finance' },
    { label: 'Total Expenses', value: formatUGX(summary.totalExpenses), insight: 'Cumulative expenditure', nav: 'finance' },
    { label: 'Gross Revenue', value: formatUGX(summary.revenue), insight: summary.commercialReached ? 'Egg sales' : 'Allocation not yet active', nav: 'finance', primary: role === 'investment_partner' },
    { label: 'Net Profit (Investor)', value: formatUGX(summary.netProfit), insight: 'After feed + operator share', nav: 'finance', primary: role === 'investment_partner' },
    { label: 'ROI', value: formatPercent(summary.roi), insight: 'Net profit ÷ capital', nav: 'finance' },
    { label: 'Cash Position', value: formatUGX(summary.cashPosition), insight: 'Capital − expenses + net', nav: 'finance' },
    { label: 'Outstanding Funding', value: formatUGX(summary.outstandingFunding), insight: summary.outstandingFunding > 0 ? 'Additional capital may be required' : 'Within estimate', nav: 'finance' },
    { label: 'Production', value: summary.productionPercent != null ? formatPercent(summary.productionPercent) : '—', insight: 'Target 88–92% · ≥85% commercial', nav: null },
    { label: 'Mortality Rate', value: summary.mortalityRate != null ? formatPercent(summary.mortalityRate) : '—', insight: 'Cumulative vs peak', nav: null },
    { label: 'Budget Performance', value: summary.budgetTotal ? formatPercent(summary.budgetSpent && summary.budgetTotal ? (summary.budgetSpent / summary.budgetTotal) * 100 : 0) : '—', insight: 'Actual vs estimate', nav: 'finance' },
    { label: 'Capital Recovery', value: formatPercent(summary.capitalRecovery), insight: 'Returned via net profit', nav: 'finance' },
  ] : [];

  const hl = healthLabel(summary?.healthScore);
  const ring = hl.cls === 'positive' ? 'var(--color-positive)' : hl.cls === 'caution' ? 'var(--color-caution)' : hl.cls === 'critical' ? 'var(--color-critical)' : 'var(--color-text-muted)';

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
        {!summary ? <div className="skeleton" style={{ height: 72 }} /> : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', position: 'relative' }}>
            <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
              <svg viewBox="0 0 36 36" style={{ width: 96, height: 96, transform: 'rotate(-90deg)' }}>
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-border)" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={ring} strokeWidth="3.2" strokeDasharray={(summary.healthScore != null ? summary.healthScore : 0) + ',100'} strokeLinecap="round" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                <span style={{ fontSize: 22, fontWeight: 800 }}>{summary.healthScore ?? '—'}</span>
                <span style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Health</span>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <h2 style={{ fontSize: 16, margin: 0 }}>Investment Health</h2>
                <Badge tone={hl.cls === 'neutral' ? 'neutral' : hl.cls}>{hl.text}</Badge>
              </div>
              <p className="u-text-sm u-text-secondary" style={{ maxWidth: 620, lineHeight: 1.6 }}>
                {summary.healthScore != null ? 'Composite of production, mortality, feed efficiency, budget adherence, capital recovery — ' + (hl.cls === 'positive' ? 'on track.' : hl.cls === 'caution' ? 'needs attention.' : 'requires action.') : 'Score populates once production, feed and financial records are available.'}
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
          <div className={'card kpi-card' + (it.primary ? ' kpi-primary' : '')} key={it.label}
            onClick={() => it.nav && onNavigate(it.nav)} style={it.nav ? { cursor: 'pointer' } : undefined}>
            <div className="kpi-label">{it.label}</div>
            <div className="kpi-value">{it.value ?? '—'}</div>
            <div className="kpi-insight">{it.insight || ''}</div>
          </div>
        )) : <div className="skeleton" style={{ height: 120 }} />}
      </div>

      <div className="grid-2" style={{ marginBottom: 18 }}>
        <div className="card">
          <div className="card-header"><h3 style={{ margin: 0, fontSize: 14 }}>Executive Insights</h3></div>
          <div className="card-body">
            {!summary ? <div className="skeleton" style={{ height: 120 }} /> : insights.length ? insights.map((ins, i) => (
              <div className={'insight-card ' + (ins.severity || 'info')} style={{ marginBottom: 10 }} key={i}>
                <div className="insight-text">{ins.text}</div>
              </div>
            )) : <div className="empty-state" style={{ padding: 18 }}><p className="empty-state-desc">No insights yet.</p></div>}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><h3 style={{ margin: 0, fontSize: 14 }}>Active Alerts</h3></div>
          <div className="card-body">
            <div className="empty-state" style={{ padding: 14 }}><p className="empty-state-desc">No open alerts — alert engine lands in the next update.</p></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-header"><h3 style={{ margin: 0, fontSize: 14 }}>Recent Activity</h3></div>
        <div className="card-body" style={{ maxHeight: 280, overflowY: 'auto' }}>
          {!summary ? <div className="skeleton" style={{ height: 100 }} /> : activity.length ? activity.map((a, i) => (
            <div style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--color-border)' }} key={i}>
              <div style={{ minWidth: 0 }}>
                <div className="u-text-sm">{a.title}</div>
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
          {(role === 'admin' || role === 'investment_partner') && <button className="btn btn-primary btn-sm" onClick={() => onNavigate('finance')}>Add Capital</button>}
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('finance')}>Review Funding</button>
        </div>
      </div>
    </>
  );
}
