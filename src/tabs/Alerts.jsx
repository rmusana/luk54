import React, { useEffect, useState } from 'react';
import { formatDate } from '../lib/format.js';
import { listAlerts, runEngine, visibleToRole } from '../lib/alerts.js';
import { audit } from '../lib/audit.js';
import { Badge, useToast } from '../components/ui.jsx';

export default function Alerts({ role, setActions }) {
  const toast = useToast();
  const [filter, setFilter] = useState('Open');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const canAct = role === 'admin' || role === 'operating_partner';

  async function load() {
    setLoading(true);
    try {
      setRows(visibleToRole(await listAlerts(filter), role));
    } catch (e) {
      toast('error', e.message || 'Failed to load alerts');
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [filter]);

  useEffect(() => {
    setActions(canAct
      ? <button className="btn btn-secondary btn-sm" disabled={running} onClick={run}>Run engine</button>
      : null);
    return () => setActions(null);
  }, [running]);

  async function run() {
    setRunning(true);
    try {
      const res = await runEngine();
      toast('success', 'Engine ran — ' + res.created + ' new alert(s)');
      load();
    } catch (e) {
      toast('error', e.message || 'Engine failed');
    }
    setRunning(false);
  }

  async function setStatus(row, status) {
    const patch = { status };
    if (status === 'Resolved') patch.resolved_at = new Date().toISOString();
    const { supabase } = await import('../lib/supabaseClient.js');
    const { error } = await supabase.from('alerts').update(patch).eq('id', row.id);
    if (error) toast('error', error.message);
    else { audit(status === 'Resolved' ? 'RESOLVE' : 'ACK', 'alerts', row.id, row.title); toast('success', status === 'Resolved' ? 'Alert resolved' : 'Alert acknowledged'); load(); }
  }

  const openCount = rows.filter((a) => String(a.status).toLowerCase() === 'open').length;
  const critCount = rows.filter((a) => a.priority === 'Critical' && String(a.status).toLowerCase() !== 'resolved').length;

  return (
    <>
      <div className="card" style={{ padding: 14, marginBottom: 14, background: 'linear-gradient(135deg, var(--color-bg-elevated), var(--color-bg-subtle))', border: '1px solid var(--color-border)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: critCount ? 'var(--color-critical-soft)' : 'var(--color-positive-soft)', color: critCount ? 'var(--color-critical)' : 'var(--color-positive)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 16 }}>{critCount || '✓'}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>Alerts Inbox</div>
            <div className="u-text-xs u-text-muted">Evaluated by the rule engine · newest first</div>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge tone={openCount ? 'caution' : 'positive'}>{openCount} open</Badge>
          <Badge tone={critCount ? 'critical' : 'neutral'}>{critCount} critical</Badge>
        </div>
      </div>

      <div className="pill-tabs">
        {['Open', 'Resolved', 'all'].map((f) => (
          <button key={f} className={'btn btn-sm ' + (filter === f ? 'btn-primary' : 'btn-ghost')}
            onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f}</button>
        ))}
      </div>

      {loading ? <div className="skeleton" style={{ height: 160 }} /> : !rows.length ? (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <p className="empty-state-title">No alerts</p>
            <p className="empty-state-desc">The engine watches vaccination due dates, feed stock, mortality, production, funding and statement deadlines. Hit Run engine to evaluate now.</p>
          </div>
        </div></div>
      ) : rows.map((a) => (
        <div className="card pad-4 mb-3" key={a.id}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                <Badge tone={a.priority === 'Critical' ? 'critical' : a.priority === 'High' ? 'caution' : a.priority === 'Low' ? 'neutral' : 'info'}>{a.priority}</Badge>
                <Badge tone="neutral">{a.type || 'System'}</Badge>
                <Badge tone={a.status === 'Resolved' ? 'positive' : a.status === 'Acknowledged' ? 'info' : 'caution'}>{a.status}</Badge>
              </div>
              <div className="u-font-semibold" style={{ marginBottom: 4 }}>{a.title}</div>
              <p className="u-text-sm u-text-secondary" style={{ marginBottom: 4 }}>{a.reason || ''}</p>
              <p className="u-text-xs u-text-muted"><strong>Action:</strong> {a.suggested_action || '—'}</p>
              {a.deadline && <p className="u-text-xs u-text-muted">Deadline: {a.deadline}</p>}
              <p className="u-text-xs u-text-muted" style={{ marginTop: 4 }}>{a.created_at ? formatDate(a.created_at) : ''}</p>
            </div>
            {a.status !== 'Resolved' && canAct && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {a.status === 'Open' && <button className="btn btn-secondary btn-sm" onClick={() => setStatus(a, 'Acknowledged')}>Acknowledge</button>}
                <button className="btn btn-primary btn-sm" onClick={() => setStatus(a, 'Resolved')}>Resolve</button>
              </div>
            )}
          </div>
        </div>
      ))}
    </>
  );
}
