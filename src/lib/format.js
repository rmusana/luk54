const TZ = 'Africa/Kampala';

function toDate(val) {
  if (val == null || val === '') return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(s + 'T12:00:00+03:00');
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function parts(d) {
  const map = {};
  new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d).forEach((p) => { map[p.type] = p.value; });
  return map;
}

/** 14 Aug 2026 */
export function formatDate(val) {
  const d = toDate(val);
  if (!d) return val == null || val === '' ? '—' : String(val).slice(0, 10);
  const p = parts(d);
  return String(parseInt(p.day, 10)) + ' ' + p.month + ' ' + p.year;
}

/** YYYY-MM-DD in EAT */
export function todayEAT() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

export function formatUGX(n) {
  if (n == null || n === '' || isNaN(Number(n))) return '—';
  return 'UGX ' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.round(Number(n)));
}

export function formatNumber(n, digits = 0) {
  if (n == null || n === '' || isNaN(Number(n))) return '—';
  return new Intl.NumberFormat('en-UG', { maximumFractionDigits: digits }).format(Number(n));
}

export function formatPercent(n, digits = 1) {
  if (n == null || isNaN(Number(n))) return '—';
  return Number(n).toFixed(digits) + '%';
}
