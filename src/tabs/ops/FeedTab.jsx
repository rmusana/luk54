import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient.js';
import { audit } from '../../lib/audit.js';
import { formatDate, formatNumber, formatUGX, todayEAT } from '../../lib/format.js';
import { DataTable, Field, Modal, useConfirm, useToast } from '../../components/ui.jsx';

const PRODUCTS = ['Brand', 'Concentrate', 'Lime powder', 'Limestone', 'Soya', 'Sunflower', 'Broken', 'Maize', 'Others'];
const MIX_FIELDS = [
  ['brand_kg', 'Brand (kg)'], ['concentrate_kg', 'Concentrate (kg)'], ['lime_powder_kg', 'Lime powder (kg)'],
  ['limestone_kg', 'Limestone (kg)'], ['soya_kg', 'Soya (kg)'], ['sunflower_kg', 'Sunflower (kg)'],
  ['broken_kg', 'Broken (kg)'], ['maize_kg', 'Maize (kg)'], ['others_kg', 'Others (kg)'],
];

export default function FeedTab({ setActions, writable = true }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [inv, setInv] = useState([]);
  const [purch, setPurch] = useState([]);
  const [mixes, setMixes] = useState([]);
  const [eff, setEff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPurchase, setShowPurchase] = useState(false);
  const [showMix, setShowMix] = useState(false);

  async function load() {
    setLoading(true);
    const [i, p, m, d] = await Promise.all([
      supabase.from('feed_inventory').select('*').order('product'),
      supabase.from('feed_purchases').select('*').order('date', { ascending: false }),
      supabase.from('weekly_feed_mix').select('*').order('week_start', { ascending: false }),
      supabase.from('daily_production').select('feed_issued_kg,eggs_collected').order('date', { ascending: false }).limit(7),
    ]);
    if (i.error) toast('error', i.error.message); else setInv(i.data || []);
    if (p.error) toast('error', p.error.message); else setPurch(p.data || []);
    if (m.error) toast('error', m.error.message); else setMixes(m.data || []);
    if (!d.error && d.data) {
      const kg = d.data.reduce((s, r) => s + Number(r.feed_issued_kg || 0), 0);
      const eggs = d.data.reduce((s, r) => s + Number(r.eggs_collected || 0), 0);
      const perDozen = eggs ? Math.round((kg / (eggs / 12)) * 100) / 100 : null;
      const avgUnit = (i.data || []).length
        ? (i.data || []).reduce((s, r) => s + Number(r.unit_cost || 0), 0) / (i.data || []).length : 1294;
      setEff({ perDozen, costPerTray: perDozen != null ? Math.round(perDozen * avgUnit) : null, avgUnit });
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    setActions(
      <>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowMix(true)}>Weekly mix</button>
        <button className="btn btn-primary btn-sm" onClick={() => setShowPurchase(true)}>+ Feed purchase</button>
      </>
    );
    return () => setActions(null);
  }, []);

  async function delPurchase(row) {
    const ok = await confirm({ title: 'Delete feed purchase', message: 'Delete this feed purchase? This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const { error } = await supabase.from('feed_purchases').delete().eq('id', row.id);
    if (error) toast('error', error.message);
    else { audit('DELETE', 'feed_purchases', row.id, 'Deleted purchase ' + (row.product || '')); toast('success', 'Feed purchase deleted'); load(); }
  }

  async function delMix(row) {
    const ok = await confirm({ title: 'Delete weekly mix', message: 'Delete this weekly mix record?', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    const { error } = await supabase.from('weekly_feed_mix').delete().eq('id', row.id);
    if (error) toast('error', error.message);
    else { audit('DELETE', 'weekly_feed_mix', row.id, 'Deleted mix ' + (row.week_start || '')); toast('success', 'Weekly mix deleted'); load(); }
  }

  return (
    <>
      {eff && (
        <div className="hero">
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="u-text-xs u-text-muted">Feed efficiency</div>
            <div style={{ fontWeight: 700 }}>{eff.perDozen != null ? eff.perDozen + ' kg / dozen' : '—'}</div>
            <div className="u-text-xs">{eff.perDozen != null ? (eff.perDozen <= 1.6 ? 'Excellent' : eff.perDozen <= 1.9 ? 'Good' : 'Review mix') : ''}</div>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div className="u-text-xs u-text-muted">Cost per tray</div>
            <div style={{ fontWeight: 700 }}>{eff.costPerTray != null ? formatUGX(eff.costPerTray) : '—'}</div>
            <div className="u-text-xs u-text-muted">avg {formatUGX(eff.avgUnit)}/kg</div>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="u-text-xs u-text-muted">Optimizer hint</div>
            <div style={{ fontSize: 12 }}>{eff.perDozen != null && eff.perDozen > 2.0 ? 'Reduce Brand, increase Concentrate/Soya' : 'Formulation balanced'}</div>
          </div>
        </div>
      )}
      <h3 className="u-text-sm u-font-semibold mb-3">Stock</h3>
      <div className="mb-5">
        {loading ? <div className="skeleton" style={{ height: 90 }} /> : (
          <DataTable columns={[
            { key: 'p', label: 'Product', accessor: (r) => r.product },
            { key: 's', label: 'Stock (kg)', accessor: (r) => formatNumber(r.closing_stock, 1) },
            { key: 'u', label: 'Unit cost', accessor: (r) => formatUGX(r.unit_cost) },
          ]} rows={inv} emptyMessage="No feed inventory yet." />
        )}
      </div>
      <h3 className="u-text-sm u-font-semibold mb-3">Weekly mix / formulation</h3>
      <div className="mb-5">
        {loading ? <div className="skeleton" style={{ height: 90 }} /> : (
          <DataTable columns={[
            { key: 'w', label: 'Week start', accessor: (r) => formatDate(r.week_start) },
            { key: 't', label: 'Total (kg)', accessor: (r) => formatNumber(r.total_kg, 1) },
            { key: 'b', label: 'Brand', accessor: (r) => formatNumber(r.brand_kg, 1) },
            { key: 'c', label: 'Concentrate', accessor: (r) => formatNumber(r.concentrate_kg, 1) },
            { key: 'm', label: 'Maize', accessor: (r) => formatNumber(r.maize_kg, 1) },
            { key: 'o', label: 'Others', accessor: (r) => formatNumber(r.others_kg, 1) },
          ]} rows={mixes}
            actions={writable ? [{ id: 'delete', label: 'Delete', danger: true }] : null}
            onAction={(a, row) => { if (a === 'delete') delMix(row); }}
            emptyMessage="No weekly mix logged yet. Use Weekly mix to add one." />
        )}
      </div>
      <h3 className="u-text-sm u-font-semibold mb-3">Purchases</h3>
      {loading ? <div className="skeleton" style={{ height: 120 }} /> : (
        <DataTable columns={[
          { key: 'd', label: 'Date', accessor: (r) => formatDate(r.date) },
          { key: 'p', label: 'Product', accessor: (r) => r.product },
          { key: 'q', label: 'Qty (kg)', accessor: (r) => formatNumber(r.qty_kg, 1) },
          { key: 't', label: 'Total', accessor: (r) => formatUGX(r.total_cost) },
          { key: 's', label: 'Supplier', accessor: (r) => r.supplier || '—' },
        ]} rows={purch}
          actions={writable ? [{ id: 'delete', label: 'Delete', danger: true }] : null}
          onAction={(a, row) => { if (a === 'delete') delPurchase(row); }}
          emptyMessage="No feed purchases yet." />
      )}
      {showPurchase && <PurchaseForm inv={inv} onClose={() => setShowPurchase(false)} onSaved={() => { setShowPurchase(false); load(); }} />}
      {showMix && <MixForm onClose={() => setShowMix(false)} onSaved={() => { setShowMix(false); load(); }} />}
    </>
  );
}

function PurchaseForm({ inv, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ date: todayEAT(), product: 'Brand', qty_kg: '', unit_cost: '', supplier: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save() {
    if (!f.date || !f.qty_kg || !f.unit_cost) { toast('error', 'Date, quantity and unit cost are required'); return; }
    setBusy(true);
    const qty = Number(f.qty_kg) || 0, unit = Number(f.unit_cost) || 0;
    const { error } = await supabase.from('feed_purchases').insert({
      project_id: 'LUK54', date: f.date, product: f.product, qty_kg: qty,
      unit_cost: unit, total_cost: qty * unit, supplier: f.supplier || '',
    });
    if (error) { toast('error', error.message); setBusy(false); return; }
    const existing = (inv || []).find((x) => x.product === f.product);
    if (existing) {
      await supabase.from('feed_inventory').update({
        closing_stock: Number(existing.closing_stock || 0) + qty,
        purchases: Number(existing.purchases || 0) + qty, unit_cost: unit,
      }).eq('id', existing.id);
    } else {
      await supabase.from('feed_inventory').insert({ project_id: 'LUK54', product: f.product, closing_stock: qty, purchases: qty, unit_cost: unit });
    }
    setBusy(false);
    audit('CREATE', 'feed_purchases', '', 'Purchase ' + f.product + ' ' + f.qty_kg + 'kg on ' + f.date);
    toast('success', 'Feed purchase recorded');
    onSaved();
  }

  return (
    <Modal title="Feed purchase" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></>}>
      <Field label="Date" type="date" required value={f.date} onChange={set('date')} />
      <Field label="Product" type="select" required value={f.product} onChange={set('product')} options={PRODUCTS} />
      <div className="form-row">
        <Field label="Quantity (kg)" type="number" required value={f.qty_kg} onChange={set('qty_kg')} />
        <Field label="Unit cost (UGX)" type="number" required value={f.unit_cost} onChange={set('unit_cost')} />
      </div>
      <Field label="Supplier" value={f.supplier} onChange={set('supplier')} />
    </Modal>
  );
}

function MixForm({ onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ week_start: todayEAT(), week_end: '', notes: '', brand_kg: '0', concentrate_kg: '0', lime_powder_kg: '0', limestone_kg: '0', soya_kg: '0', sunflower_kg: '0', broken_kg: '0', maize_kg: '0', others_kg: '0' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const total = MIX_FIELDS.reduce((s, [k]) => s + (Number(f[k]) || 0), 0);

  async function save() {
    if (!f.week_start) { toast('error', 'Week start is required'); return; }
    setBusy(true);
    const payload = { project_id: 'LUK54', week_start: f.week_start, week_end: f.week_end || null, total_kg: total, notes: f.notes || '' };
    MIX_FIELDS.forEach(([k]) => { payload[k] = Number(f[k]) || 0; });
    const { data: insData, error } = await supabase.from('weekly_feed_mix').insert(payload).select('id').single();
    setBusy(false);
    if (error) toast('error', error.message);
    else { audit('CREATE', 'weekly_feed_mix', insData?.id, 'Mix week ' + f.week_start + ' total ' + total + 'kg'); toast('success', 'Weekly mix saved (total calculated from ingredients)'); onSaved(); }
  }

  return (
    <Modal title="Weekly feed mix / formulation" size="lg" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save mix'}</button></>}>
      <Field label="Week start" type="date" required value={f.week_start} onChange={set('week_start')} />
      <Field label="Week end" type="date" value={f.week_end} onChange={set('week_end')} />
      <p className="u-text-sm u-text-secondary">Ingredient breakdown for this week mix. Total is calculated automatically.</p>
      <div className="form-row">
        {MIX_FIELDS.map(([k, label]) => <Field key={k} label={label} type="number" value={f[k]} onChange={set(k)} />)}
      </div>
      <div className="card pad-3 mb-4"><span className="u-text-sm">Calculated total: </span><strong>{Math.round(total * 10) / 10}</strong> kg</div>
      <Field label="Notes" type="textarea" value={f.notes} onChange={set('notes')} />
    </Modal>
  );
}
