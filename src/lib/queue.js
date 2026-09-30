/* Offline outbox — queue writes while offline, sync on reconnect.
 * Phase 1 covers the core forms (daily log, sale, expense, disbursement).
 * Reads always come from the server; the banner tells the truth about state. */
import { supabase } from './supabaseClient.js';

const KEY = 'luk54_outbox';
const listeners = new Set();

export function readOutbox() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch (e) { return []; }
}
function writeOutbox(items) {
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((fn) => fn(items));
}
export function onOutbox(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/** Queue a create for later. Returns the queued entry. */
export function enqueue(table, payload, label) {
  const items = readOutbox();
  const entry = {
    id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    table, payload, label: label || table,
    queuedAt: new Date().toISOString(),
    attempts: 0,
  };
  items.push(entry);
  writeOutbox(items);
  return entry;
}

function drop(id) {
  writeOutbox(readOutbox().filter((e) => e.id !== id));
}

/** Push everything queued, oldest first. Returns { synced, failed }. */
export async function syncOutbox() {
  if (!isOnline()) return { synced: 0, failed: 0 };
  const items = [...readOutbox()].sort((a, b) => new Date(a.queuedAt) - new Date(b.queuedAt));
  let synced = 0, failed = 0;
  for (const e of items) {
    try {
      const { error } = await supabase.from(e.table).insert(e.payload);
      if (error) throw error;
      drop(e.id);
      synced++;
    } catch (err) {
      failed++;
    }
  }
  return { synced, failed };
}

export function startOutboxAutoSync(onDone) {
  const run = async () => {
    if (!readOutbox().length) return;
    const res = await syncOutbox();
    if (onDone && (res.synced || res.failed)) onDone(res);
  };
  window.addEventListener('online', run);
  const t = setInterval(run, 30000);
  return () => { window.removeEventListener('online', run); clearInterval(t); };
}

/** Run an insert: online → direct; offline/network fail → queue. */
export async function smartInsert(table, payload, label) {
  if (!isOnline()) {
    enqueue(table, payload, label);
    return { queued: true };
  }
  try {
    const { data, error } = await supabase.from(table).insert(payload).select('id').single();
    if (error) throw error;
    return { data };
  } catch (e) {
    if (!isOnline()) {
      enqueue(table, payload, label);
      return { queued: true };
    }
    throw e;
  }
}
