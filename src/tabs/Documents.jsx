import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';
import { audit } from '../lib/audit.js';
import { formatDate, formatNumber } from '../lib/format.js';
import { DataTable, Field, Modal, useConfirm, useToast } from '../components/ui.jsx';

const CATEGORIES = ['General', 'Receipt', 'Invoice', 'Photo', 'Production', 'Statement', 'Contract', 'Vaccination', 'Other'];
const isImage = (mime, name) => (mime || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(name || '');

export default function Documents({ role, email, setActions }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState('all');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [coverage, setCoverage] = useState(null);
  const canDelete = role === 'admin';

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('documents').select('*')
        .eq('project_id', 'LUK54').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      setDocs(data || []);
      const [sales, exp, cap] = await Promise.all([
        supabase.from('sales').select('id,document_id').limit(1000),
        supabase.from('expenses').select('id,document_id').limit(1000),
        supabase.from('capital_contributions').select('id,document_id').limit(1000),
      ]);
      const missing = (rows) => (rows.data || []).filter((r) => !r.document_id).length;
      setCoverage({
        sales: (sales.data || []).length, salesMissing: missing(sales),
        exp: (exp.data || []).length, expMissing: missing(exp),
        cap: (cap.data || []).length, capMissing: missing(cap),
      });
    } catch (e) {
      toast('error', e.message || 'Failed to load documents');
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => {
    setActions(<button className="btn btn-primary btn-sm" onClick={() => setShowUpload(true)}>Upload</button>);
    return () => setActions(null);
  }, []);

  async function openPreview(doc) {
    setPreview(doc);
    setPreviewUrl('');
    try {
      const { data, error } = await supabase.storage.from('receipts').createSignedUrl(doc.path, 3600);
      if (error) throw error;
      setPreviewUrl(data.signedUrl);
    } catch (e) {
      toast('error', e.message || 'Preview unavailable');
    }
  }

  async function onDelete(doc) {
    const ok = await confirm({ title: 'Delete document', message: 'Delete "' + doc.name + '"? This cannot be undone.', confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    try {
      await supabase.storage.from('receipts').remove([doc.path]);
    } catch (e) { /* file may already be gone */ }
    const { error } = await supabase.from('documents').delete().eq('id', doc.id);
    if (error) toast('error', error.message);
    else { audit('DELETE', 'documents', doc.id, 'Deleted ' + doc.name); toast('success', 'Document deleted'); setPreview(null); load(); }
  }

  const list = filter === 'all' ? docs : docs.filter((d) => d.category === filter);

  return (
    <>
      <div className="card" style={{ padding: 14, marginBottom: 14, background: 'linear-gradient(135deg, var(--color-bg-elevated), var(--color-bg-subtle))', border: '1px solid var(--color-border)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Evidence — every UGX has a receipt</div>
          <div className="u-text-xs u-text-muted">Photos, invoices, statements. Linked to sales, expenses and disbursements.</div>
        </div>
        {coverage && (
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11 }}>
            <span className="u-text-muted">Missing evidence:</span>
            <span>Sales {coverage.salesMissing}/{coverage.sales}</span>
            <span>Expenses {coverage.expMissing}/{coverage.exp}</span>
            <span>Capital {coverage.capMissing}/{coverage.cap}</span>
          </div>
        )}
      </div>

      <div className="pill-tabs">
        {['all', ...CATEGORIES].map((c) => (
          <button key={c} className={'btn btn-sm ' + (filter === c ? 'btn-primary' : 'btn-ghost')}
            onClick={() => setFilter(c)}>{c === 'all' ? 'All' : c}</button>
        ))}
      </div>

      {loading ? <div className="skeleton" style={{ height: 160 }} /> : !list.length ? (
        <div className="card"><div className="card-body">
          <div className="empty-state">
            <p className="empty-state-title">No documents</p>
            <p className="empty-state-desc">Receipts, invoices, photos and statements will appear here once uploaded.</p>
          </div>
        </div></div>
      ) : (
        <div className="kpi-grid">
          {list.map((d) => (
            <div className="card kpi-card clickable" key={d.id} onClick={() => openPreview(d)}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div className="act-icon" style={{ width: 44, height: 44, borderRadius: 10 }}>
                  {d.category ? d.category[0] : '•'}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div className="u-text-sm u-font-medium u-truncate">{d.name}</div>
                  <div className="u-text-xs u-text-muted">{d.category} · {d.size_bytes ? formatNumber(d.size_bytes / 1024, 0) + ' KB' : ''}</div>
                  <div className="u-text-xs u-text-muted">{d.created_at ? formatDate(d.created_at) : ''}{d.uploaded_by ? ' · ' + d.uploaded_by : ''}</div>
                </div>
              </div>
              {d.notes && <div className="kpi-insight">{d.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {showUpload && <UploadForm email={email} onClose={() => setShowUpload(false)} onSaved={() => { setShowUpload(false); load(); }} />}
      {preview && (
        <Modal title={preview.name} onClose={() => { setPreview(null); setPreviewUrl(''); }}
          footer={<>
            {previewUrl && <a className="btn btn-secondary" href={previewUrl} target="_blank" rel="noreferrer">Open / Download</a>}
            {canDelete && <button className="btn btn-danger" onClick={() => onDelete(preview)}>Delete</button>}
            <button className="btn btn-secondary" onClick={() => { setPreview(null); setPreviewUrl(''); }}>Close</button>
          </>}>
          {!previewUrl ? <div className="skeleton" style={{ height: 200 }} /> : (
            isImage(preview.mime_type, preview.name)
              ? <img src={previewUrl} alt="" style={{ width: '100%', borderRadius: 8 }} />
              : <p className="u-text-sm u-text-secondary">Preview not available inline — use Open / Download.</p>
          )}
          {preview.notes && <p className="u-text-sm" style={{ marginTop: 8 }}>{preview.notes}</p>}
        </Modal>
      )}
    </>
  );
}

function UploadForm({ email, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState({ category: 'Receipt', linked: '', notes: '' });
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save() {
    if (!file) { toast('error', 'Choose a file to upload'); return; }
    setBusy(true);
    try {
      const path = 'LUK54/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const { error: upErr } = await supabase.storage.from('receipts').upload(path, file);
      if (upErr) throw upErr;
      const { data: insData, error: dbErr } = await supabase.from('documents').insert({
        project_id: 'LUK54', name: file.name, path,
        size_bytes: file.size || 0, mime_type: file.type || '',
        category: f.category, linked_table: '', linked_id: f.linked || '',
        notes: f.notes || '', uploaded_by: email || '',
      }).select('id').single();
      if (dbErr) throw dbErr;
      audit('UPLOAD', 'documents', insData?.id, file.name + ' (' + f.category + ')');
      toast('success', 'Document uploaded');
      onSaved();
    } catch (e) {
      toast('error', e.message || 'Upload failed');
    }
    setBusy(false);
  }

  return (
    <Modal title="Upload document" onClose={onClose}
      footer={<><button className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Uploading…' : 'Upload'}</button></>}>
      <Field label="Category" type="select" value={f.category} onChange={set('category')} options={CATEGORIES} />
      <div className="form-group">
        <label className="form-label">File</label>
        <input className="form-input" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
          onChange={(e) => setFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
        <div className="form-hint">Stored privately — only signed-in staff can open it.</div>
      </div>
      <Field label="Linked record ID (optional)" hint="e.g. sale, expense or disbursement reference" value={f.linked} onChange={set('linked')} />
      <Field label="Notes" type="textarea" value={f.notes} onChange={set('notes')} />
    </Modal>
  );
}
