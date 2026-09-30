import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient.js';
import { ConfirmProvider, Field, ToastProvider, useToast } from './components/ui.jsx';
import { audit, setActor } from './lib/audit.js';
import { MobileNav, Sidebar, Topbar } from './components/shell.jsx';
import Finance from './tabs/Finance.jsx';
import Dashboard from './tabs/Dashboard.jsx';
import Operations from './tabs/Operations.jsx';
import Reports from './tabs/Reports.jsx';
import Alerts from './tabs/Alerts.jsx';
import Documents from './tabs/Documents.jsx';
import Settings from './tabs/Settings.jsx';

const ROLE_LABEL = { admin: 'Administrator', operating_partner: 'Operating Partner', investment_partner: 'Investment Partner' };

function Shell() {
  const toast = useToast();
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [auth, setAuth] = useState({ email: '', password: '' });
  const [authErr, setAuthErr] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [mode, setMode] = useState('signin');
  const [remember, setRemember] = useState(() => { try { return !!localStorage.getItem('luk54_remember'); } catch (e) { return false; } });
  const [collapsed, setCollapsed] = useState(false);
  const [actions, setActions] = useState(null);
  const [module, setModule] = useState('dashboard');
  const [bellAlerts, setBellAlerts] = useState([]);

  async function loadBell(uid, role) {
    if (role !== 'admin' && role !== 'operating_partner') { setBellAlerts([]); return; }
    const { data } = await supabase.from('alerts').select('id,priority,title')
      .eq('project_id', 'LUK54').in('status', ['Open', 'Acknowledged'])
      .order('created_at', { ascending: false }).limit(10);
    const rank = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    setBellAlerts([...(data || [])].sort((a, b) => (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9)));
  }

  useEffect(() => {
    if (!session || !profile) return;
    loadBell(session.user.id, profile.role);
    const t = setInterval(() => loadBell(session.user.id, profile.role), 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [session, profile]);

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
    if (to === 'finance' || to === 'dashboard' || to === 'operations' || to === 'reports' || to === 'alerts' || to === 'documents') setModule(to);
    else if (to === 'settings' && profile?.role === 'admin') setModule(to);
    else if (to === 'settings') toast('error', 'Settings is for Administrators');
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    try { localStorage.setItem('luk54_theme', 'dark'); } catch (e) {}
  }, []);

  useEffect(() => {
    if (profile?.role === 'investment_partner' && (module === 'operations' || module === 'alerts' || module === 'settings')) setModule('dashboard');
  }, [profile, module]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('luk54_remember');
      if (saved) setAuth((a) => ({ ...a, email: saved }));
    } catch (e) {}
  }, []);

  async function loadProfile(uid, email) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).single();
    if (error) { setProfile(null); return; }
    setProfile(data);
    setActor(email || data.email, data.role);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id, data.session.user.email);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s) loadProfile(s.user.id, s.user.email);
      else { setProfile(null); setActor('', ''); }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function login(e) {
    e.preventDefault();
    setAuthErr('');
    setAuthBusy(true);
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp(auth);
      setAuthBusy(false);
      if (error) setAuthErr(error.message);
      else {
        setActor(auth.email, '');
        audit('SIGNUP', 'auth', '', 'Self-registered account, awaiting role');
        setAuthErr('');
        toast('success', 'Account created — confirm the email, then ask the Admin for a role');
        setMode('signin');
      }
      return;
    }
    const { error } = await supabase.auth.signInWithPassword(auth);
    setAuthBusy(false);
    if (error) setAuthErr(error.message);
    else {
      try {
        if (remember) localStorage.setItem('luk54_remember', auth.email);
        else localStorage.removeItem('luk54_remember');
      } catch (e) {}
      setActor(auth.email, '');
      audit('LOGIN', 'auth', '', 'Sign-in from ' + (navigator.userAgent.includes('Mobile') ? 'mobile' : 'desktop'));
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
            <p className="glass-sub">{mode === 'signup' ? 'Create your farm account' : 'Sign in to continue to your farm'}</p>
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
              <button className="glass-submit" disabled={authBusy}>{authBusy ? (mode === 'signup' ? 'Creating…' : 'Signing in…') : (mode === 'signup' ? 'Create account' : 'Sign in')}</button>
            </form>
            <p className="glass-foot">
              {mode === 'signup' ? (
                <span>Have an account? <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#a7e3c3', height: 'auto', padding: '0 4px' }} onClick={() => setMode('signin')}>Sign in</button></span>
              ) : (
                <span>New here? <button type="button" className="btn btn-ghost btn-sm" style={{ color: '#a7e3c3', height: 'auto', padding: '0 4px' }} onClick={() => setMode('signup')}>Create account</button></span>
              )}
            </p>
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
        <Topbar title={module === 'dashboard' ? 'Overview' : module === 'operations' ? 'Operations' : module === 'reports' ? 'Reports' : module === 'alerts' ? 'Alerts' : module === 'documents' ? 'Documents' : 'Finance'}
          onMenu={() => setCollapsed(!collapsed)}
          email={session.user.email} roleLabel={ROLE_LABEL[profile.role] || profile.role}
          onSignOut={() => supabase.auth.signOut()}
          alerts={bellAlerts} onOpenAlerts={() => navigate('alerts')} />
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
          {module === 'documents' && (
            <>
              <div className="page-header">
                <div className="page-header-title">
                  <div className="breadcrumb"><span>Main</span><span>/</span><span>Documents</span></div>
                  <h1>Documents</h1>
                  <p className="u-text-secondary u-text-sm">Receipts, invoices, photos and statements</p>
                </div>
                <div className="page-header-actions">{actions}</div>
              </div>
              <Documents role={profile.role} email={session.user.email} setActions={setActions} />
            </>
          )}
          {module === 'settings' && profile?.role === 'admin' && (
            <>
              <div className="page-header">
                <div className="page-header-title">
                  <div className="breadcrumb"><span>System</span><span>/</span><span>Settings</span></div>
                  <h1>Settings</h1>
                  <p className="u-text-secondary u-text-sm">Project parameters, users and system preferences</p>
                </div>
                <div className="page-header-actions">{actions}</div>
              </div>
              <Settings setActions={setActions} />
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
