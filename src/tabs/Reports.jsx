import React, { useEffect, useState } from 'react';
import { formatDate, formatNumber, formatUGX } from '../lib/format.js';
import { REPORTS, generateReport, shiftWeek, weekRange } from '../lib/reports.js';
import { DataTable, useToast } from '../components/ui.jsx';

function fmtVal(v) {
  if (typeof v === 'number') return formatUGX(v);
  return v;
}

export default function Reports({ setActions }) {
  const toast = useToast();
  const [type, setType] = useState('monthly_statement');
  const [mode, setMode] = useState('monthly');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [week, setWeek] = useState('');
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);

  useEffect(() => {
    setActions(
      <button className="btn btn-secondary btn-sm" disabled={!report} onClick={() => window.print()}>Print / PDF</button>
    );
    return () => setActions(null);
  }, [report]);

  async function generate() {
    let period;
    if (mode === 'monthly') {
      if (!/^\d{4}-\d{2}$/.test(month)) { toast('error', 'Enter a valid month (YYYY-MM)'); return; }
      period = { mode: 'monthly', month };
    } else {
      const range = weekRange(week);
      if (!range) { toast('error', 'Enter a valid ISO week (YYYY-Www)'); return; }
      period = { mode: 'weekly', week, range };
    }
    setBusy(true);
    try {
      setReport(await generateReport(type, period));
    } catch (e) {
      toast('error', e.message || 'Report failed');
    }
    setBusy(false);
  }

  const groups = {};
  REPORTS.forEach((r) => { groups[r.group] = groups[r.group] || []; groups[r.group].push(r); });

  return (
    <>
      <h3 className="u-text-sm u-font-semibold mb-3">Choose a report</h3>
      {Object.entries(groups).map(([g, list]) => (
        <div key={g} className="mb-4">
          <div className="u-text-xs u-text-muted mb-3">{g}</div>
          <div className="kpi-grid">
            {list.map((r) => (
              <button key={r.id} className={'card kpi-card' + (type === r.id ? ' kpi-primary' : '')}
                style={{ textAlign: 'left', fontFamily: 'inherit', cursor: 'pointer' }}
                onClick={() => { setType(r.id); setReport(null); }}>
                <div className="kpi-label" style={{ fontWeight: 700, color: 'var(--color-text)' }}>{r.name}</div>
                <div className="kpi-insight">{r.desc}</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="card pad-4 mb-4">
        <div className="form-row" style={{ alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Period type</label>
            <select className="form-select" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          {mode === 'monthly' ? (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Month</label>
              <input className="form-input" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Week (YYYY-Www)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setWeek(shiftWeek(week, -1))}>◀ Prev</button>
                <input className="form-input" value={week} onChange={(e) => setWeek(e.target.value)} placeholder="e.g. 2026-W40" style={{ flex: 1 }} />
                <button className="btn btn-secondary btn-sm" onClick={() => setWeek(shiftWeek(week, 1))}>Next ▶</button>
              </div>
              <div className="form-hint">
                {(() => { const r = weekRange(week); return r ? week + ' = ' + r.start + ' → ' + r.end + '.' : 'Tap Prev for last week.'; })()}
              </div>
            </div>
          )}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <button className="btn btn-primary" disabled={busy} onClick={generate}>{busy ? 'Generating…' : 'Generate report'}</button>
          </div>
        </div>
      </div>

      {!report && (
        <div className="empty-state"><p className="empty-state-desc">Pick a report and period, then Generate.</p></div>
      )}

      {report && (
        <div className="report">
          <h2 style={{ margin: '0 0 4px' }}>{report.title}</h2>
          <p className="u-text-sm u-text-secondary mb-4">{report.period} · generated {formatDate(new Date().toISOString().slice(0, 10))}</p>
          <div className="kpi-grid mb-4">
            {report.kpis.map(([l, v], i) => (
              <div className="card kpi-card" key={i}>
                <div className="kpi-label">{l}</div>
                <div className="kpi-value" style={{ fontSize: '1.2rem' }}>{fmtVal(v)}</div>
              </div>
            ))}
          </div>
          {report.tables.map((t, i) => (
            <div key={i} className="mb-5">
              <h3 className="u-text-sm u-font-semibold mb-3">{t.title}</h3>
              <DataTable columns={t.columns.map(([label, key]) => ({
                key, label,
                accessor: (r) => {
                  const v = r[key];
                  if (/amount|revenue|total|cost|variance|budget|actual/i.test(key)) return formatUGX(v);
                  if (/date|month|planned/i.test(key)) return v ? formatDate(v) : '—';
                  if (typeof v === 'number') return formatNumber(v, 1);
                  return v ?? '—';
                },
              }))} rows={t.rows} emptyMessage="No lines in this period." />
            </div>
          ))}
          {report.note && <p className="u-text-xs u-text-muted">{report.note}</p>}
        </div>
      )}
    </>
  );
}
