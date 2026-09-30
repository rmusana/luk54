/* Gap engine — the system runs on facts, never guesses.
 * Coverage starts at the first-ever log (nothing before that is "missed").
 * A date counts as logged if ANY section has a row for it.
 * Only yesterday-and-before can be "missed" — today is still loggable. */

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
 * Can the partner save a log for `candidate`?
 * - No logs yet → anything goes (first log sets the start).
 * - Must fill the earliest missing day first — no jumping over gaps.
 * - Otherwise the date must be newer than everything logged (no silent gaps).
 * - Re-saving an already-logged date (multi-section / correction) is allowed.
 */
export function canLogDate(rows, candidate) {
  const day = key10(candidate);
  if (!day) return { ok: false, reason: 'Pick a date first.' };
  const logged = new Set((rows || []).map((r) => key10(r.date)));
  if (!logged.size) return { ok: true };
  const missing = getMissingDays(rows);
  if (logged.has(day)) return { ok: true }; // correction / second section
  if (missing.length && day !== missing[0]) {
    return {
      ok: false,
      reason: 'Log ' + missing[0] + ' first — ' + missing.length + ' day(s) missing (' + missing.join(', ') + '). Days must be logged in order.',
      missing,
    };
  }
  const max = latestDate(rows);
  if (!missing.length && max && day <= max) return { ok: true }; // duplicate edge, harmless
  return { ok: true };
}
