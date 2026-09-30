import React, { useState } from 'react';
import DailyTab from './ops/DailyTab.jsx';
import FlockTab from './ops/FlockTab.jsx';
import FeedTab from './ops/FeedTab.jsx';
import SalesTab from './ops/SalesTab.jsx';
import HealthTab from './ops/HealthTab.jsx';
import { InventoryTab, MortalityTab, NotesTab, WorkersTab } from './ops/OtherTabs.jsx';

const TABS = [
  { id: 'daily', label: 'Daily Log' },
  { id: 'flock', label: 'Flock' },
  { id: 'feed', label: 'Feed' },
  { id: 'sales', label: 'Sales' },
  { id: 'health', label: 'Health & Vaccination' },
  { id: 'mortality', label: 'Mortality' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'workers', label: 'Workers' },
  { id: 'notes', label: 'Staff Notes' },
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
            onClick={() => { setActions(null); setTab(t.id); }}>{t.label}</button>
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
