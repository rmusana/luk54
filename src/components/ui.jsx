import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

/* ── Toast ── */
const ToastCtx = createContext(() => {});
let toastSeq = 0;
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((type, message) => {
    const id = ++toastSeq;
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toast-root">
        {toasts.map((t) => (
          <div key={t.id} className={'toast ' + t.type}>
            <div className="toast-content"><div className="toast-title">{t.message}</div></div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ── Modal + confirm ── */
export function Modal({ title, onClose, footer, size, children }) {
  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal' + (size === 'lg' ? ' modal-lg' : '')} role="dialog" aria-modal="true">
        <div className="modal-header"><h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close">✕</button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

const ConfirmCtx = createContext(async () => false);
export function ConfirmProvider({ children }) {
  const [req, setReq] = useState(null);
  const resolver = useRef(null);
  const confirm = useCallback((opts) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setReq(opts);
    });
  }, []);
  const done = (v) => { setReq(null); if (resolver.current) resolver.current(v); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      {req && (
        <Modal title={req.title} onClose={() => done(false)}
          footer={<><button className="btn btn-secondary" onClick={() => done(false)}>Cancel</button>
            <button className={'btn ' + (req.danger ? 'btn-danger' : 'btn-primary')} onClick={() => done(true)}>{req.confirmLabel || 'Confirm'}</button></>}>
          <p style={{ margin: 0 }}>{req.message}</p>
        </Modal>
      )}
    </ConfirmCtx.Provider>
  );
}
export const useConfirm = () => useContext(ConfirmCtx);

/* ── Data table ── */
export function DataTable({ columns, rows, actions, onAction, emptyMessage }) {
  if (!rows || !rows.length) {
    return <div className="empty-state"><p className="empty-state-desc">{emptyMessage || 'No records yet.'}</p></div>;
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead><tr>{columns.map((c) => <th key={c.key}>{c.label}</th>)}{actions && <th />}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || i}>
              {columns.map((c) => <td key={c.key}>{c.accessor(r)}</td>)}
              {actions && (
                <td><div className="actions">
                  {actions.map((a) => (
                    <button key={a.id} className={'btn btn-sm ' + (a.danger ? 'btn-danger' : 'btn-secondary')}
                      onClick={() => onAction(a.id, r)}>{a.label}</button>
                  ))}
                </div></td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Form field ── */
export function Field({ label, hint, type = 'text', options, required, ...rest }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}{required && <span className="required">*</span>}</label>
      {type === 'select' ? (
        <select className="form-select" required={required} {...rest}>
          {(options || []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea className="form-textarea" required={required} {...rest} />
      ) : (
        <input className="form-input" type={type} required={required} {...rest} />
      )}
      {hint && <div className="form-hint">{hint}</div>}
    </div>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={'badge badge-' + tone}>{children}</span>;
}

/* ── Teaching empty state ── */
export function EmptyState({ title, desc, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      {title && <p className="empty-state-title">{title}</p>}
      {desc && <p className="empty-state-desc">{desc}</p>}
      {actionLabel && <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}

/* ── Receipt thumbnail (money rows) ── */
export function ReceiptThumb({ path, name }) {
  const [open, setOpen] = React.useState(false);
  const [url, setUrl] = React.useState('');
  const [err, setErr] = React.useState('');
  if (!path) return <span className="u-text-muted">—</span>;
  async function view() {
    setOpen(true);
    setErr('');
    try {
      const { supabase } = await import('../lib/supabaseClient.js');
      const { data, error } = await supabase.storage.from('receipts').createSignedUrl(path, 3600);
      if (error) throw error;
      setUrl(data.signedUrl);
    } catch (e) {
      setErr(e.message || 'Preview unavailable');
    }
  }
  const isImg = /\.(png|jpe?g|gif|webp|svg)$/i.test(name || path);
  return (
    <>
      <button className="btn btn-ghost btn-sm" title={name || path} onClick={view}>🧾</button>
      {open && (
        <Modal title={name || 'Receipt'} onClose={() => { setOpen(false); setUrl(''); }}
          footer={<>
            {url && <a className="btn btn-secondary" href={url} target="_blank" rel="noreferrer">Open / Download</a>}
            <button className="btn btn-secondary" onClick={() => { setOpen(false); setUrl(''); }}>Close</button>
          </>}>
          {err ? <div className="form-error-global">{err}</div>
            : !url ? <div className="skeleton" style={{ height: 200 }} />
            : isImg ? <img src={url} alt="" style={{ width: '100%', borderRadius: 8 }} />
            : <p className="u-text-sm u-text-secondary">Preview not available inline — use Open / Download.</p>}
        </Modal>
      )}
    </>
  );
}
export function Gauge({ pct }) {
  const color = pct == null ? 'var(--color-text-muted)'
    : pct >= 88 ? 'var(--color-positive)' : pct >= 80 ? 'var(--color-caution)' : 'var(--color-critical)';
  return (
    <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
      <svg viewBox="0 0 36 36" style={{ width: 84, height: 84, transform: 'rotate(-90deg)' }}>
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke="var(--color-border)" strokeWidth="3" />
        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke={color} strokeWidth="3" strokeDasharray={(pct ?? 0) + ',100'} strokeLinecap="round" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <span style={{ fontWeight: 800, fontSize: 16 }}>{pct != null ? pct + '%' : '—'}</span>
        <span style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Today</span>
      </div>
    </div>
  );
}

/* ── Sparkline (SVG, Chart.js look) ── */
export function Sparkline({ values, stroke }) {
  const w = 220, h = 70;
  if (!values || !values.length) return <div style={{ width: w, height: h }} />;
  const max = Math.max(100, ...values);
  const step = values.length > 1 ? w / (values.length - 1) : w;
  const pts = values.map((v, i) => [i * step, h - 6 - (v / max) * (h - 14)]);
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `0,${h} ` + line + ` ${w},${h}`;
  return (
    <svg viewBox={'0 0 ' + w + ' ' + h} style={{ width: w, height: h }}>
      <polygon points={area} fill={stroke + '26'} />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
