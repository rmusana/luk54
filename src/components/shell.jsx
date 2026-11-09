import React from 'react';

const P = (d, extra) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={'ui-icon' + (extra ? ' ' + extra : '')}>
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
  spark: <>{P(<><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></>, 'nav-icon')}</>,
  growth: <>{P(<><path d="M3 3v18h18" /><path d="m7 15 4-4 3 3 5-6" /><path d="M16 8h3v3" /></>)}</>,
  layers: <>{P(<><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5" /><path d="m3 17 9 5 9-5" /></>)}</>,
  egg: <>{P(<><path d="M12 2C8 2 5 8 5 13a7 7 0 0 0 14 0c0-5-3-11-7-11Z" /></>)}</>,
  edit: <>{P(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>)}</>,
  trash: <>{P(<><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M10 11v6" /><path d="M14 11v6" /></>)}</>,
  calendar: <>{P(<><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></>)}</>,
  flag: <>{P(<><path d="M4 22V4" /><path d="M4 4h12l-2 4 2 4H4" /></>)}</>,
  activity: <>{P(<><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>)}</>,
  sliders: <>{P(<><line x1="4" x2="4" y1="21" y2="14" /><line x1="4" x2="4" y1="10" y2="3" /><line x1="12" x2="12" y1="21" y2="12" /><line x1="12" x2="12" y1="8" y2="3" /><line x1="20" x2="20" y1="21" y2="16" /><line x1="20" x2="20" y1="12" y2="3" /><line x1="2" x2="6" y1="14" y2="14" /><line x1="10" x2="14" y1="8" y2="8" /><line x1="18" x2="22" y1="16" y2="16" /></>)}</>,
  minus: <>{P(<><path d="M5 12h14" /></>)}</>,
  x: <>{P(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>)}</>,
  receipt: <>{P(<><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" /></>)}</>,
  clipboard: <>{P(<><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M8 11h8" /><path d="M8 16h6" /></>)}</>,
  arrowUp: <>{P(<><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></>)}</>,
  arrowDown: <>{P(<><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></>)}</>,
  arrowLeft: <>{P(<><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>)}</>,
  arrowRight: <>{P(<><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>)}</>,
  arrowUpRight: <>{P(<><path d="M7 17 17 7" /><path d="M7 7h10v10" /></>)}</>,
  chevronLeft: <>{P(<><path d="m15 18-6-6 6-6" /></>)}</>,
  chevronRight: <>{P(<><path d="m9 18 6-6-6-6" /></>)}</>,
  lock: <>{P(<><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>)}</>,
  trophy: <>{P(<><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></>)}</>,
  clock: <>{P(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>)}</>,
  download: <>{P(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></>)}</>,
  upload: <>{P(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></>)}</>,
  eye: <>{P(<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>)}</>,
  eyeOff: <>{P(<><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></>)}</>,
  externalLink: <>{P(<><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>)}</>,
  printer: <>{P(<><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></>)}</>,
  save: <>{P(<><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" /><path d="M7 3v4a1 1 0 0 0 1 1h7" /></>)}</>,
  key: <>{P(<><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" /><path d="m21 2-9.6 9.6" /><circle cx="7.5" cy="15.5" r="5.5" /></>)}</>,
  user: <>{P(<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>)}</>,
  users: <>{P(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>)}</>,
  logOut: <>{P(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></>)}</>,
  search: <>{P(<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>)}</>,
  fileText: <>{P(<><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></>)}</>,
  image: <>{P(<><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></>)}</>,
  checkCircle: <>{P(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></>)}</>,
  checkCheck: <>{P(<><path d="M18 6 7 17l-5-5" /><path d="m22 10-7.5 7.5L13 16" /></>)}</>,
  xCircle: <>{P(<><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>)}</>,
  dot: <>{P(<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />)}</>,
  circle: <>{P(<circle cx="12" cy="12" r="8" />)}</>,
  shield: <>{P(<><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /></>)}</>,
  database: <>{P(<><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5V19A9 3 0 0 0 21 19V5" /><path d="M3 12A9 3 0 0 0 21 12" /></>)}</>,
  play: <>{P(<><polygon points="6 3 20 12 6 21 6 3" /></>)}</>,
  message: <>{P(<><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></>)}</>,
  send: <>{P(<><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>)}</>,
  mail: <>{P(<><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>)}</>,
  phone: <>{P(<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></>)}</>,
  home: <>{P(<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>)}</>,
  building: <>{P(<><rect width="16" height="20" x="4" y="2" rx="2" ry="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" /></>)}</>,
  truck: <>{P(<><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></>)}</>,
  pill: <>{P(<><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z" /><path d="m8.5 8.5 7 7" /></>)}</>,
  heartPulse: <>{P(<><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" /></>)}</>,
  wallet: <>{P(<><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></>)}</>,
  coins: <>{P(<><circle cx="8" cy="8" r="6" /><path d="M18.09 10.37A6 6 0 1 1 10.34 18" /><path d="M7 6h1v4" /><path d="m16.71 13.88.7.71-2.82 2.82" /></>)}</>,
  list: <>{P(<><line x1="8" x2="21" y1="6" y2="6" /><line x1="8" x2="21" y1="12" y2="12" /><line x1="8" x2="21" y1="18" y2="18" /><line x1="3" x2="3.01" y1="6" y2="6" /><line x1="3" x2="3.01" y1="12" y2="12" /><line x1="3" x2="3.01" y1="18" y2="18" /></>)}</>,
  filter: <>{P(<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></>)}</>,
  barChart: <>{P(<><line x1="12" x2="12" y1="20" y2="10" /><line x1="18" x2="18" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="16" /></>)}</>,
  pieChart: <>{P(<><path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" /></>)}</>,
  target: <>{P(<><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>)}</>,
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
          {item(Icon.reports, 'Reports', module === 'reports', () => onNavigate('reports'))}
          {(role === 'admin' || role === 'operating_partner') && item(Icon.bell, 'Alerts', module === 'alerts', () => onNavigate('alerts'))}
          {item(Icon.spark || Icon.info, 'Assistant', module === 'ai', () => onNavigate('ai'))}
          {item(Icon.docs, 'Documents', module === 'documents', () => onNavigate('documents'))}
          {role === 'admin' && (
          <div className="nav-section">
            <div className="nav-section-title">System</div>
            {item(Icon.settings, 'Settings', module === 'settings', () => onNavigate('settings'))}
          </div>
          )}
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

export function Topbar({ title, onMenu, email, roleLabel, onSignOut, alerts, onOpenAlerts }) {
  const [open, setOpen] = React.useState(false);
  const [bellOpen, setBellOpen] = React.useState(false);
  const initials = (email || 'U').slice(0, 2).toUpperCase();
  const openCount = (alerts || []).length;
  const canAlerts = roleLabel !== 'Investment Partner';
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-btn" onClick={onMenu} aria-label="Menu">{Icon.menu}</button>
        <span style={{ fontWeight: 600 }}>{title}</span>
      </div>
      <div className="topbar-right">
        {canAlerts && (
        <div style={{ position: 'relative' }}>
          <button className="icon-btn" onClick={() => setBellOpen(!bellOpen)} aria-label="Notifications">
            {Icon.bell}
            {openCount > 0 && <span className="badge-dot" />}
          </button>
          {bellOpen && (
            <div className="card" style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 320, maxWidth: '80vw', padding: 6, zIndex: 50 }}>
              <div style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700 }}>Notifications{openCount > 0 ? ' (' + openCount + ')' : ''}</div>
              {!openCount && <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--color-text-muted)' }}>All clear — no open alerts.</div>}
              {(alerts || []).slice(0, 4).map((a) => (
                <button key={a.id} className="btn btn-ghost btn-sm" style={{ width: '100%', justifyContent: 'flex-start', height: 'auto', padding: '8px 10px', whiteSpace: 'normal', textAlign: 'left' }}
                  onClick={() => { setBellOpen(false); onOpenAlerts(); }}>
                  <span className={'badge badge-' + (a.priority === 'Critical' ? 'critical' : a.priority === 'High' ? 'caution' : 'neutral')}>{a.priority}</span>
                  <span style={{ fontSize: 12 }}>{a.title}</span>
                </button>
              ))}
              <button className="btn btn-secondary btn-sm" style={{ width: '100%', marginTop: 4 }}
                onClick={() => { setBellOpen(false); onOpenAlerts(); }}>
                <span className="btn-icon">{Icon.arrowRight}</span>
                View all alerts
              </button>
            </div>
          )}
        </div>
        )}
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
              <button className="btn btn-ghost btn-sm" style={{ width: '100%' }} onClick={onSignOut}>
                <span className="btn-icon">{Icon.logOut}</span>
                Sign out
              </button>
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
      <button className={'mobile-nav-item' + (module === 'reports' ? ' active' : '')} onClick={() => onNavigate('reports')}>{Icon.reports}<span>Reports</span></button>
      {(role === 'admin' || role === 'operating_partner') && (
      <button className={'mobile-nav-item' + (module === 'alerts' ? ' active' : '')} onClick={() => onNavigate('alerts')}>{Icon.bell}<span>Alerts</span></button>
      )}
      <button className={'mobile-nav-item' + (module === 'ai' ? ' active' : '')} onClick={() => onNavigate('ai')}>{Icon.spark}<span>AI</span></button>
    </nav>
  );
}
