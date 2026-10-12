/* Coverage helper — informational only.
 * The Daily Log accepts ANY date in ANY order; tables sort themselves.
 * getMissingDays simply reports dates with no log between the first log and
 * yesterday, so coverage banners and alerts can show the truth. Nothing here
 * blocks saving. */

export const key10 = (v) => String(v || '').slice(0, 10);

function eatToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** All missing dates from first log through yesterday, ascending. */
export function getMissingDays(rows, todayStr) {
  const today = todayStr || eatToday();
  const logged = new Set((rows || []).map((r) => key10(r.date)));
  if (!logged.size) return [];
  const first = [...logged].sort()[0];
  const out = [];
  for (let d = first; d < today; d = addDays(d, 1)) {
    if (!logged.has(d)) out.push(d);
  }
  return out;
}

export function latestDate(rows) {
  const keys = (rows || []).map((r) => key10(r.date)).filter(Boolean).sort();
  return keys.length ? keys[keys.length - 1] : null;
}

/**
 * Kept for compatibility — always allows the date.
 * Entry is free-order: any date, any sequence. Kept so older callers
 * never block a save.
 */
export function canLogDate(rows, candidate) {
  const day = key10(candidate);
  if (!day) return { ok: false, reason: 'Pick a date first.' };
  return { ok: true };
}
