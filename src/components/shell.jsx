import React from 'react';

const P = (d, extra) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={extra}>
    {d}
  </svg>
);

export const Icon = {
  dashboard: <>{P(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>, 'nav-icon')}</>,
  finance: <>{P(<><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" /></>, 'nav-icon')}</>,
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
};

export function Sidebar({ collapsed, onCollapse, onSoon, module, onNavigate }) {
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

export function MobileNav({ onSoon, module, onNavigate }) {
  const soon = (label) => (e) => { e.preventDefault(); onSoon(label); };
  return (
    <nav className="mobile-nav">
      <button className={'mobile-nav-item' + (module === 'dashboard' ? ' active' : '')} onClick={() => onNavigate('dashboard')}>{Icon.dashboard}<span>Dashboard</span></button>
      <button className={'mobile-nav-item' + (module === 'finance' ? ' active' : '')} onClick={() => onNavigate('finance')}>{Icon.finance}<span>Finance</span></button>
      <button className="mobile-nav-item" onClick={soon('Reports')}>{Icon.reports}<span>Reports</span></button>
      <button className="mobile-nav-item" onClick={soon('Documents')}>{Icon.docs}<span>Docs</span></button>
    </nav>
  );
}
