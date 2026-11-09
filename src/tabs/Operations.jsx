import React, { useState } from 'react';
import DailyTab from './ops/DailyTab.jsx';
import FlockTab from './ops/FlockTab.jsx';
import FeedTab from './ops/FeedTab.jsx';
import SalesTab from './ops/SalesTab.jsx';
import HealthTab from './ops/HealthTab.jsx';
import { InventoryTab, MortalityTab, NotesTab, WorkersTab } from './ops/OtherTabs.jsx';
import { Icon } from '../components/shell.jsx';

const TABS = [
  { id: 'daily', label: 'Daily Log', icon: Icon.clipboard },
  { id: 'flock', label: 'Flock', icon: Icon.egg },
  { id: 'feed', label: 'Feed', icon: Icon.truck },
  { id: 'sales', label: 'Sales', icon: Icon.cart },
  { id: 'health', label: 'Health & Vaccination', icon: Icon.heartPulse },
  { id: 'mortality', label: 'Mortality', icon: Icon.activity },
  { id: 'inventory', label: 'Inventory', icon: Icon.package },
  { id: 'workers', label: 'Workers', icon: Icon.users },
  { id: 'notes', label: 'Staff Notes', icon: Icon.fileText },
];

export default function Operations({ role, setActions }) {
  const [tab, setTab] = useState('daily');
  const writable = role === 'admin' || role === 'operating_partner';
  const gated = (node) => setActions(writable ? node : null);
  const props = { setActions: gated, writable };

  return (
    <>
      {!writable && (
        <div className="card pad-3 mb-4"><span className="u-text-xs u-text-muted">Read-only for Investment Partner — daily records are entered by the Operating Partner.</span></div>
      )}
      <div className="pill-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={'btn btn-sm ' + (t.id === tab ? 'btn-primary' : 'btn-ghost')}
            onClick={() => { setActions(null); setTab(t.id); }}><span className="btn-icon">{t.icon}</span>{t.label}</button>
        ))}
      </div>
      <div key={tab}>
        {tab === 'daily' && <DailyTab {...props} />}
        {tab === 'flock' && <FlockTab {...props} />}
        {tab === 'feed' && <FeedTab {...props} />}
        {tab === 'sales' && <SalesTab {...props} />}
        {tab === 'health' && <HealthTab {...props} />}
        {tab === 'mortality' && <MortalityTab />}
        {tab === 'inventory' && <InventoryTab {...props} />}
        {tab === 'workers' && <WorkersTab {...props} />}
        {tab === 'notes' && <NotesTab {...props} />}
      </div>
    </>
  );
}
