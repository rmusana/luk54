import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import { ConfirmProvider, Field, ToastProvider, useToast } from './components/ui.jsx';
import { MobileNav, Sidebar, Topbar } from './components/shell.jsx';
import Finance from './tabs/Finance.jsx';
import Dashboard from './tabs/Dashboard.jsx';
import Operations from './tabs/Operations.jsx';
import Reports from './tabs/Reports.jsx';
import Alerts from './tabs/Alerts.jsx';

const ROLE_LABEL = { admin: 'Administrator', operating_partner: 'Operating Partner', investment_partner: 'Investment Partner' };

function Shell() {
  const toast = useToast();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [auth, setAuth] = useState({ email: '', password: '' });
  const [authErr, setAuthErr] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(() => { try { return !!localStorage.getItem('luk54_remember'); } catch (e) { return false; } });
  const [collapsed, setCollapsed] = useState(false);
  const [actions, setActions] = useState(null);
  const [module, setModule] = useState('dashboard');

  function navigate(to) {
    setActions(null);
    if (to === 'operations' && profile?.role === 'investment_partner') {
      toast('error', 'Operations is not available to Investment Partners');
      return;
    }
    if (to === 'alerts' && profile?.role === 'investment_partner') {
      toast('error', 'Alerts are not available to Investment Partners');
      return;
    }
    if (to === 'finance' || to === 'dashboard' || to === 'operations' || to === 'reports' || to === 'alerts') setModule(to);
    else toast('error', to + ' lands in the next update');
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('luk54_theme', 'dark'); } catch (e) {}
  }, []);

  useEffect(() => {
    if (profile?.role === 'investment_partner' && (module === 'operations' || module === 'alerts')) setModule('dashboard');
  }, [profile, module]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('luk54_remember');
      if (saved) setAuth((a) => ({ ...a, email: saved }));
    } catch (e) {}
  }, []);

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
    else {
      try {
        if (remember) localStorage.setItem('luk54_remember', auth.email);
        else localStorage.removeItem('luk54_remember');
      } catch (e) {}
      toast('success', 'Signed in');
    }
  }

  const soon = (label) => toast('error', label + ' lands in the next update — Finance is live now');

  if (!session) {
    return (
      <div className="glass-login">
        <div className="glass-card">
          <div className="glass-brand">
            <div className="glass-shade" />
            <div className="glass-brand-inner">
              <div className="glass-logo"><span className="glass-logo-mark">L</span>
                <span><strong>LUK54</strong><small>Jalo Dream Farm</small></span>
              </div>
              <h2>Your flock.<br />Your capital.<br /><span>One clear view.</span></h2>
              <p>Secure access for your farm operations.</p>
            </div>
          </div>
          <div className="glass-form">
            <h2>Welcome back</h2>
            <p className="glass-sub">Sign in to continue to your farm</p>
            <form onSubmit={login}>
              {authErr && <div className="form-error-global">{authErr}</div>}
              <label className="glass-label">Email</label>
              <input className="glass-input" type="email" required placeholder="you@farm.com"
                value={auth.email} onChange={(e) => setAuth({ ...auth, email: e.target.value })} />
              <label className="glass-label">Password</label>
              <div className="glass-password">
                <input className="glass-input" type={showPw ? 'text' : 'password'} required placeholder="••••••••"
                  value={auth.password} onChange={(e) => setAuth({ ...auth, password: e.target.value })} />
                <button type="button" className="glass-eye" aria-label={showPw ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPw(!showPw)}>
                  {showPw ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="23" x2="23" y2="1" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              <label className="glass-check">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Remember email</span>
              </label>
              <button className="glass-submit" disabled={authBusy}>{authBusy ? 'Signing in…' : 'Sign in'}</button>
            </form>
            <p className="glass-secure">🔒 Encrypted &nbsp;•&nbsp; Role-based access</p>
            <p className="glass-foot">Need access? Contact your administrator</p>
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
      <Sidebar collapsed={collapsed} onCollapse={() => setCollapsed(!collapsed)} onSoon={soon}
        module={module} onNavigate={navigate} role={profile.role} />
      <div className={'main-wrapper' + (collapsed ? ' wide' : '')}>
        <Topbar title={module === 'dashboard' ? 'Overview' : module === 'operations' ? 'Operations' : module === 'reports' ? 'Reports' : module === 'alerts' ? 'Alerts' : 'Finance'}
          onMenu={() => setCollapsed(!collapsed)}
          email={session.user.email} roleLabel={ROLE_LABEL[profile.role] || profile.role}
          onSignOut={() => supabase.auth.signOut()} />
        <div className="page-root" key={module}>
          {module === 'dashboard' && (
            <>
              <div className="page-header">
                <div className="page-header-title">
                  <div className="breadcrumb"><span>Main</span><span>/</span><span>Dashboard</span></div>
                  <h1>Dashboard</h1>
                  <p className="u-text-secondary u-text-sm">How healthy is this investment today?</p>
                </div>
                <div className="page-header-actions">{actions}</div>
              </div>
              <Dashboard role={profile.role} onNavigate={navigate} setActions={setActions} />
            </>
          )}
          {module === 'operations' && (
            <>
              <div className="page-header">
                <div className="page-header-title">
                  <div className="breadcrumb"><span>Main</span><span>/</span><span>Operations</span></div>
                  <h1>Operations</h1>
                  <p className="u-text-secondary u-text-sm">Daily farm operations</p>
                </div>
                <div className="page-header-actions">{actions}</div>
              </div>
              <Operations role={profile.role} setActions={setActions} />
            </>
          )}
          {module === 'reports' && (
            <>
              <div className="page-header">
                <div className="page-header-title">
                  <div className="breadcrumb"><span>Main</span><span>/</span><span>Reports</span></div>
                  <h1>Reports</h1>
                  <p className="u-text-secondary u-text-sm">Statements and audit packs for any period</p>
                </div>
                <div className="page-header-actions">{actions}</div>
              </div>
              <Reports setActions={setActions} />
            </>
          )}
          {module === 'alerts' && (
            <>
              <div className="page-header">
                <div className="page-header-title">
                  <div className="breadcrumb"><span>Main</span><span>/</span><span>Alerts</span></div>
                  <h1>Alerts</h1>
                  <p className="u-text-secondary u-text-sm">Proactive notifications and recommended actions</p>
                </div>
                <div className="page-header-actions">{actions}</div>
              </div>
              <Alerts role={profile.role} setActions={setActions} />
            </>
          )}
          {module === 'finance' && (
            <>
              <div className="page-header">
                <div className="page-header-title">
                  <div className="breadcrumb"><span>Main</span><span>/</span><span>Finance</span></div>
                  <h1>Finance</h1>
                  <p className="u-text-secondary u-text-sm">Disbursements, revenue, expenses and profit distribution</p>
                </div>
                <div className="page-header-actions">{actions}</div>
              </div>
              <Finance role={profile.role} setActions={setActions} />
            </>
          )}
        </div>
      </div>
      <MobileNav onSoon={soon} module={module} onNavigate={navigate} role={profile.role} />
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
