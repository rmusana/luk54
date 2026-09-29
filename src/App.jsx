import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import { ConfirmProvider, Field, ToastProvider, useToast } from './components/ui.jsx';
import Finance from './tabs/Finance.jsx';

const ROLE_LABEL = { admin: 'Administrator', operating_partner: 'Operating Partner', investment_partner: 'Investment Partner' };

function EggMark({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <ellipse cx="32" cy="34" rx="14" ry="17" fill="#fff" />
      <ellipse cx="27" cy="28" rx="3.5" ry="5" fill="#f2ede6" opacity="0.8" />
    </svg>
  );
}

function Shell() {
  const toast = useToast();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [auth, setAuth] = useState({ email: '', password: '' });
  const [authErr, setAuthErr] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('luk54_theme') || 'light');
  const [actions, setActions] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('luk54_theme', theme);
  }, [theme]);

  async function loadProfile(uid) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (error) { setProfile(null); return; }
    setProfile(data);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id);
      else setProfile(null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function login(e) {
    e.preventDefault();
    setAuthErr('');
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithPassword(auth);
    setAuthBusy(false);
    if (error) setAuthErr(error.message);
    else toast('success', 'Signed in');
  }

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-visual">
          <div className="login-visual-shade" />
          <div className="login-visual-content">
            <h1 className="login-brand-name">LUK54</h1>
            <p className="login-brand-sub">Investment & operations platform</p>
          </div>
        </div>
        <div className="login-panel">
          <div className="login-panel-inner">
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em', color: '#1a1f1c' }}>LUK54</div>
              <div className="u-text-xs u-text-muted">Farm investment platform</div>
            </div>
            <h2 className="login-title">Sign in</h2>
            <p className="login-subtitle">Use your farm account to continue.</p>
            <form onSubmit={login}>
              {authErr && <div className="form-error-global">{authErr}</div>}
              <Field label="Email" type="email" required value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} />
              <div className="form-group">
                <label className="form-label">Password<span className="required">*</span></label>
                <div className="password-field">
                  <input className="form-input" type={showPw ? 'text' : 'password'} required
                    value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} />
                  <button type="button" className="password-toggle" aria-label={showPw ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPw(!showPw)}>
                    {showPw ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="23" x2="23" y2="1" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <button className="login-submit" disabled={authBusy}>{authBusy ? 'Signing in…' : 'Sign in'}</button>
            </form>
            <p className="login-secure">Secure access for your farm investment.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <main className="page">
        <div className="card pad-4">
          <h3>Signed in, but no role assigned</h3>
          <p className="u-text-sm u-text-secondary">Ask the Administrator to assign your role (Admin, Operating Partner or Investment Partner), then refresh.</p>
          <button className="btn btn-secondary btn-sm" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="top-strip">
        <span className="brand" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <EggMark size={28} /> LUK54 · {ROLE_LABEL[profile.role] || profile.role}
        </span>
        <span className="row">
          <button className="btn btn-sm" style={{ background: '#ffffff22', color: '#fff' }}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Light' : 'Dark'}</button>
          <button className="btn btn-sm" style={{ background: '#ffffff22', color: '#fff' }}
            onClick={() => supabase.auth.signOut()}>Sign out</button>
        </span>
      </div>
      <div className="page">
        <div className="page-header">
          <div>
            <div className="breadcrumb"><span>Main</span><span>/</span><span>Finance</span></div>
            <h1>Finance</h1>
            <p className="u-text-secondary u-text-sm">Disbursements, expenses, budget, allocation and profit</p>
          </div>
          <div className="page-header-actions">{actions}</div>
        </div>
        <Finance role={profile.role} setActions={setActions} />
      </div>
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <Shell />
      </ConfirmProvider>
    </ToastProvider>
  );
}
