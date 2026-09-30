import React from 'react';

const P = (d, extra) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={extra}>
    {d}
  </svg>
);

export const Icon = {
  dashboard: <>{P(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>, 'nav-icon')}</>,
  finance: <>{P(<><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></>, 'nav-icon')}</>,
  ops: <>{P(<><rect width="8" height="4" x="8" y="2" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></>, 'nav-icon')}</>,
  reports: <>{P(<><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></>, 'nav-icon')}</>,
  bell: <>{P(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>, 'nav-icon')}</>,
  docs: <>{P(<><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" /></>, 'nav-icon')}</>,
  settings: <>{P(<><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></>, 'nav-icon')}</>,
  collapse: <>{P(<><rect width="18" height="18" x="3" y="3" rx="2" /><path d="m9 3 0 18" /><path d="m13 8-2 2 2 2" /><path d="m15 8 2 2-2 2" /></>, 'nav-icon')}</>,
  menu: <>{P(<><line x1="4" x2="20" y1="6" y2="6" /><line x1="4" x2="20" y1="12" y2="12" /><line x1="4" x2="20" y1="18" y2="18" /></>)}</>,
  sun: <>{P(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></>)}</>,
  moon: <>{P(<><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></>)}</>,
  chevron: <>{P(<><path d="m6 9 6 6 6-6" /></>)}</>,
  plus: <>{P(<><path d="M5 12h14" /><path d="M12 5v14" /></>)}</>,
  banknote: <>{P(<><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></>)}</>,
  cart: <>{P(<><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></>)}</>,
  check: <>{P(<><path d="M21.801 10A10 10 0 1 1 17 3.335" /><path d="m9 11 3 3L22 4" /></>)}</>,
  warn: <>{P(<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>)}</>,
  octagon: <>{P(<><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></>)}</>,
  info: <>{P(<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>)}</>,
  package: <>{P(<><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></>)}</>,
  refresh: <>{P(<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>)}</>,
  trendUp: <>{P(<><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>)}</>,
  trendDown: <>{P(<><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" /></>)}</>,
};

export function Sidebar({ collapsed, onCollapse, onSoon, module, onNavigate, role }) {
  const canOps = role === 'admin' || role === 'operating_partner';
  const soon = (label) => (e) => { e.preventDefault(); onSoon(label); };
  const item = (icon, label, active, onClick, badge) => (
    <button className={'nav-item' + (active ? ' active' : '')} onClick={onClick} aria-label={label}>
      {icon}
      <span className="nav-label">{label}</span>
      {badge}
    </button>
  );
  return (
    <aside className={'sidebar' + (collapsed ? ' collapsed' : '')} aria-label="Main navigation">
      <div className="sidebar-brand">
        <div className="sidebar-brand-copy">
          <span className="sidebar-brand-text">LUK54</span>
          <span className="sidebar-brand-sub">Jalo Dream Farm</span>
        </div>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section">
          <div className="nav-section-title">Overview</div>
          {item(Icon.dashboard, 'Dashboard', module === 'dashboard', () => onNavigate('dashboard'))}
        </div>
        {canOps && (
        <div className="nav-section">
          <div className="nav-section-title">Operations</div>
          {item(Icon.ops, 'Operations', module === 'operations', () => onNavigate('operations'))}
        </div>
        )}
        <div className="nav-section">
          <div className="nav-section-title">Finance</div>
          {item(Icon.finance, 'Finance', module === 'finance', () => onNavigate('finance'))}
        </div>
        <div className="nav-section">
          <div className="nav-section-title">Insights</div>
          {item(Icon.reports, 'Reports', false, soon('Reports'))}
          {item(Icon.docs, 'Documents', false, soon('Documents'))}
        </div>
        <div className="nav-section">
          <div className="nav-section-title">System</div>
          {item(Icon.settings, 'Settings', false, soon('Settings'))}
        </div>
      </nav>
      <div className="sidebar-footer">
        <button className="nav-item" onClick={onCollapse} aria-label="Collapse sidebar">
          {Icon.collapse}
          <span className="nav-label">Collapse</span>
        </button>
      </div>
    </aside>
  );
}

export function Topbar({ title, onMenu, email, roleLabel, onSignOut }) {
  const [open, setOpen] = React.useState(false);
  const initials = (email || 'U').slice(0, 2).toUpperCase();
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn" onClick={onMenu} aria-label="Menu">{Icon.menu}</button>
        <span style={{ fontWeight: 600 }}>{title}</span>
      </div>
      <div className="topbar-right">
        <button className="icon-btn" aria-label="Notifications">{Icon.bell}</button>
        <div style={{ position: 'relative' }}>
          <button className="user-chip" onClick={() => setOpen(!open)} aria-label="Account">
            <span className="user-avatar">{initials}</span>
            <span className="user-meta">
              <span className="user-name">{email}</span>
              <span className="user-role">{roleLabel}</span>
            </span>
            {Icon.chevron}
          </button>
          {open && (
            <div className="card" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', minWidth: 160, padding: 6, zIndex: 50 }}>
              <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={onSignOut}>Sign out</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function MobileNav({ onSoon, module, onNavigate, role }) {
  const soon = (label) => (e) => { e.preventDefault(); onSoon(label); };
  return (
    <nav className="mobile-nav">
      <button className={'mobile-nav-item' + (module === 'dashboard' ? ' active' : '')} onClick={() => onNavigate('dashboard')}>{Icon.dashboard}<span>Dashboard</span></button>
      {(role === 'admin' || role === 'operating_partner') && (
      <button className={'mobile-nav-item' + (module === 'operations' ? ' active' : '')} onClick={() => onNavigate('operations')}>{Icon.ops}<span>Ops</span></button>
      )}
      <button className={'mobile-nav-item' + (module === 'finance' ? ' active' : '')} onClick={() => onNavigate('finance')}>{Icon.finance}<span>Finance</span></button>
      <button className="mobile-nav-item" onClick={soon('Reports')}>{Icon.reports}<span>Reports</span></button>
      <button className="mobile-nav-item" onClick={soon('Documents')}>{Icon.docs}<span>Docs</span></button>
    </nav>
  );
}
