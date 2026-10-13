// Ranking storage: Firestore REST API when configured, localStorage otherwise.
// One collection per track (track.collection, e.g. "scores", "scores_volcan"):
// { name: string (1-15 chars), time: number (s), createdAt: timestamp }
import { FIREBASE } from './config.js';

export const NAME_MAX = 15;
export const RANKING_SIZE = 10;
const FETCH_LIMIT = 60;       // fetched to keep only each name's best time
const LOCAL_PREFIX = 'kenneysrace.ranking.';
const BEST_PREFIX = 'kenneysrace.best.';
const NAME_KEY = 'kenneysrace.name';

export const isOnline = Boolean(FIREBASE.projectId && FIREBASE.apiKey);
const BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;

// Letters (any language), digits, spaces and a few symbols; max 15 characters.
export function cleanName(raw) {
  const chars = Array.from(String(raw).replace(/[^\p{L}\p{N} ._-]/gu, '').replace(/\s+/g, ' ').trim());
  return chars.slice(0, NAME_MAX).join('').trim();
}

export function roundTime(t) {
  return Math.round(t * 100) / 100;
}

export async function submitScore(collection, name, time) {
  const entry = { name: cleanName(name), time: roundTime(time) };
  if (!entry.name) throw new Error('empty name');
  saveName(entry.name);
  if (!isOnline) {
    const all = readLocal(collection);
    all.push(entry);
    writeLocal(collection, all);
    return entry;
  }
  const res = await fetch(`${BASE}/${collection}?key=${FIREBASE.apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        name: { stringValue: entry.name },
        time: { doubleValue: entry.time },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });
  if (!res.ok) throw new Error(`submit failed (${res.status})`);
  return entry;
}

// Best time per name, fastest first.
export async function fetchRanking(collection) {
  let entries;
  if (!isOnline) {
    entries = readLocal(collection);
  } else {
    const res = await fetch(`${BASE}:runQuery?key=${FIREBASE.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: collection }],
          orderBy: [{ field: { fieldPath: 'time' }, direction: 'ASCENDING' }],
          limit: FETCH_LIMIT,
        },
      }),
    });
    if (!res.ok) throw new Error(`ranking failed (${res.status})`);
    const rows = await res.json();
    entries = rows
      .filter((r) => r.document)
      .map((r) => {
        const f = r.document.fields;
        return { name: f.name?.stringValue ?? '?', time: Number(f.time?.doubleValue ?? f.time?.integerValue ?? 0) };
      });
  }
  return bestPerName(entries).slice(0, RANKING_SIZE);
}

export function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

// Personal best per track on this device (shown in the menu).
export function loadBest(trackId) {
  try {
    const v = Number(localStorage.getItem(BEST_PREFIX + trackId));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

// Returns true when `time` is a new personal best.
export function saveBest(trackId, time) {
  const best = loadBest(trackId);
  if (best !== null && best <= time) return false;
  try {
    localStorage.setItem(BEST_PREFIX + trackId, String(roundTime(time)));
  } catch {
    /* storage unavailable */
  }
  return true;
}

function saveName(name) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    /* storage unavailable */
  }
}

function bestPerName(entries) {
  const best = new Map();
  for (const e of entries) {
    const key = e.name.toLowerCase();
    if (!best.has(key) || e.time < best.get(key).time) best.set(key, e);
  }
  return [...best.values()].sort((a, b) => a.time - b.time);
}

function readLocal(collection) {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_PREFIX + collection) ?? '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function writeLocal(collection, entries) {
  try {
    localStorage.setItem(LOCAL_PREFIX + collection, JSON.stringify(bestPerName(entries).slice(0, 50)));
  } catch {
    /* storage unavailable */
  }
}
