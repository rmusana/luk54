import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { audit } from '../../lib/audit.js';
import { formatDate, formatNumber, todayEAT } from '../../lib/format.js';
import { getMissingDays } from '../../lib/gaps.js';
import { smartInsert } from '../../lib/queue.js';
import { DataTable, Field, Gauge, Modal, Sparkline, useConfirm, useToast } from '../../components/ui.jsx';

const TRAY = 30;

export function feedTotalKg(r) {
  return Number(r.feed_issued_kg || 0);
}

export default function DailyTab({ setActions, writable = true }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [presetDate, setPresetDate] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const missing = getMissingDays(rows);

  function openForm(date) {
    setPresetDate(date || null);
    setShowForm(true);
  }

  async function load() {
    setLoading(true);
    const { data, error } = await supabase.from('daily_production').select('*').order('date', { ascending: false }).limit(2000);
    if (error) toast('error', error.message);
    else setRows(data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!writable) { setActions(null); return () => setActions(null); }
    setActions(<button className="btn btn-primary btn-sm" onClick={() => openForm()}>+ Log Day</button>);
    return () => setActions(null);
  }, []);

  async function onDelete(row) {
    const ok = await confirm({ title: 'Delete daily log', message: 'Delete the log for ' + (row.date || 'this day') + '? This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const { error } = await supabase.from('daily_production').delete().eq('id', row.id);
    if (error) toast('error', error.message);
    else { audit('DELETE', 'daily_production', row.id, 'Deleted log ' + (row.date || '')); toast('success', 'Daily log deleted'); load(); }
  }

  const byDateDesc = [...rows].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest = byDateDesc[0] || {};
  const birds = Number(latest.closing_birds ?? latest.opening_birds ?? 0);
  const eggs = Number(latest.eggs_collected ?? (latest.eggs_trays ? latest.eggs_trays * 30 : 0));
  const pct = birds > 0 && eggs > 0 ? Math.round((eggs / birds) * 1000) / 10 : null;
  const recent = [...rows].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-14);
  const sparkVals = recent.map((r) => {
    const b = Number(r.closing_birds || r.opening_birds || 1);
    const e = Number(r.eggs_collected || 0);
    return b ? Math.round((e / b) * 1000) / 10 : 0;
  });
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const spark = pct == null ? (dark ? '#9aa5a0' : '#8b928c')
    : pct >= 88 ? (dark ? '#3dba7e' : '#1a7a45') : pct >= 80 ? (dark ? '#e0a23a' : '#a16207') : (dark ? '#e05252' : '#b91c1c');

  return (
    <>
      {missing.length > 0 && rows.length > 0 && (
        <div className="card pad-4 mb-4">
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
            📋 Coverage: {missing.length} day{missing.length > 1 ? 's' : ''} without logs
            ({missing.length <= 12 ? missing.map(formatDate).join(' · ') : formatDate(missing[0]) + ' → ' + formatDate(missing[missing.length - 1])})
          </div>
          <div className="u-text-xs u-text-secondary" style={{ marginBottom: 8 }}>
            Log any date in any order — the table sorts itself automatically.
          </div>
          {writable && <button className="btn btn-secondary btn-sm" onClick={() => openForm(missing[0])}>Log {formatDate(missing[0])}</button>}
        </div>
      )}
      <div className="hero">
        <Gauge pct={pct} />
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Daily production — 3D view</div>
          <div className="u-text-xs u-text-secondary">
            {pct != null ? (pct >= 88 ? 'Within 88–92% target' : 'Below target — review feed/health') : 'Log today to populate'}
            {birds ? ' · ' + formatNumber(birds) + ' birds' : ''}
          </div>
        </div>
        <Sparkline values={sparkVals} stroke={spark} />
      </div>
      {loading ? <div className="skeleton" style={{ height: 140 }} /> : (<>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setSortDir(sortDir === 'desc' ? 'asc' : 'desc')}>
            {sortDir === 'desc' ? 'Newest first ↓' : 'Oldest first ↑'}
          </button>
        </div>
        <DataTable
          columns={[
            { key: 'date', label: 'Date', accessor: (r) => formatDate(r.date) },
            { key: 'section', label: 'Section', accessor: (r) => r.section || 'Combined' },
            { key: 'open', label: 'Opening', accessor: (r) => formatNumber(r.opening_birds) },
            { key: 'mort', label: 'Mortality', accessor: (r) => formatNumber(r.mortality) },
            { key: 'close', label: 'Closing', accessor: (r) => formatNumber(r.closing_birds) },
            { key: 'eggs', label: 'Eggs (trays)', accessor: (r) => formatNumber(r.eggs_trays, 1) },
            { key: 'feed', label: 'Feed (kg)', accessor: (r) => formatNumber(feedTotalKg(r), 1) },
            { key: 'pct', label: 'Prod %', accessor: (r) => {
              const b = Number(r.opening_birds || 0), e = Number(r.eggs_collected || 0);
              return e > 0 && b > 0 ? formatNumber((e / b) * 100, 1) + '%' : '—';
            } },
            { key: 'notes', label: 'Notes', accessor: (r) => r.notes
              ? <span title={r.notes}>{r.notes.length > 32 ? r.notes.slice(0, 32) + '…' : r.notes}</span>
              : '—' },
          ]}
          rows={sortDir === 'desc' ? byDateDesc : [...byDateDesc].reverse()}
          actions={writable ? [{ id: 'delete', label: 'Delete', danger: true }] : null}
          onAction={(a, row) => { if (a === 'delete') onDelete(row); }}
          emptyMessage="No daily logs yet. Click Log Day to add one."
        />
      </>)}
      {showForm && <DailyForm
        initialDate={presetDate}
        existingRows={rows}
        onClose={() => { setShowForm(false); setPresetDate(null); }}
        onSaved={() => { setShowForm(false); setPresetDate(null); load(); }}
      />}
    </>
  );
}

function DailyForm({ onClose, onSaved, initialDate, existingRows }) {
  const toast = useToast();
  const [sections, setSections] = useState([{ section_id: 'Combined', label: 'Combined', bird_count: 0 }]);
  const [f, setF] = useState({ date: initialDate || todayEAT(), section: 'Combined', opening_birds: '0', mortality: '0', closing_birds: '', eggs_trays: '0', breakages: '0', eggs_lost: '0', feed_issued_kg: '0', notes: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    supabase.from('flock_sections').select('*').order('section_id').then(({ data }) => {
      if (data && data.length) {
        setSections(data);
        setF((prev) => ({ ...prev, section: data[0].section_id, opening_birds: String(data[0].bird_count ?? 0) }));
      }
    });
  }, []);

  function onSectionChange(e) {
    const id = e.target.value;
    const found = sections.find((s) => s.section_id === id);
    setF({ ...f, section: id, opening_birds: found ? String(found.bird_count ?? 0) : f.opening_birds });
  }

  const birds = Number(f.opening_birds) || 0;
  const trays = Number(f.eggs_trays) || 0;
  const livePct = birds > 0 && trays > 0 ? (Math.round(((trays * TRAY) / birds) * 1000) / 10) + '%' : '—';

  async function save() {
    if (!f.date || f.opening_birds === '') { toast('error', 'Date and opening birds are required'); return; }
    setBusy(true);
    const opening = Number(f.opening_birds) || 0;
    const mort = Number(f.mortality) || 0;
    const payload = {
      project_id: 'LUK54',
      date: f.date,
      section: f.section || 'Combined',
      opening_birds: opening,
      mortality: mort,
      closing_birds: f.closing_birds !== '' ? Number(f.closing_birds) : opening - mort,
      eggs_trays: trays,
      eggs_collected: trays * TRAY,
      breakages: Number(f.breakages) || 0,
      eggs_lost: Number(f.eggs_lost) || 0,
      feed_issued_kg: Number(f.feed_issued_kg) || 0,
      notes: f.notes || '',
    };
    let insData = null;
    try {
      const res = await smartInsert('daily_production', payload, 'Daily log ' + f.date);
      if (res.queued) { setBusy(false); toast('success', 'No connection — log queued, will sync automatically'); onSaved(); return; }
      insData = res.data;
    } catch (e) {
      setBusy(false);
      toast('error', e.message || 'Save failed');
      return;
    }
    setBusy(false);
    audit('CREATE', 'daily_production', insData?.id, 'Log ' + f.date + ' ' + (f.section || '') + ' eggs ' + (trays * TRAY) + ' mort ' + mort); toast('success', 'Daily log saved'); onSaved();
  }

  return (
    <Modal title="Daily production log" size="lg" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Field label="Date" type="date" required value={f.date} onChange={set('date')} />
      <Field label="Batch / section" type="select" value={f.section} onChange={onSectionChange}
        options={sections.map((s) => s.section_id)} />
      <div className="form-row">
        <Field label="Opening birds" type="number" required value={f.opening_birds} onChange={set('opening_birds')} />
        <Field label="Mortality" type="number" value={f.mortality} onChange={set('mortality')} />
        <Field label="Closing birds" type="number" hint="Auto: opening − mortality if blank" value={f.closing_birds} onChange={set('closing_birds')} />
      </div>
      <div className="form-row">
        <Field label="Eggs collected (trays)" type="number" hint="30 eggs per tray" value={f.eggs_trays} onChange={set('eggs_trays')} />
        <Field label="Breakages (eggs)" type="number" value={f.breakages} onChange={set('breakages')} />
        <Field label="Lost (exchange)" type="number" value={f.eggs_lost} onChange={set('eggs_lost')} />
      </div>
      <Field label="Feed issued (kg)" type="number" hint="Total mixed feed for this day only" value={f.feed_issued_kg} onChange={set('feed_issued_kg')} />
      <div className="card pad-3 mb-4">
        <span className="u-text-sm u-text-secondary">Egg production % (this section): </span><strong>{livePct}</strong>
      </div>
      <Field label="Notes / observations" type="textarea" value={f.notes} onChange={set('notes')} />
    </Modal>
  );
}
