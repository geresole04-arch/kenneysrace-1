// Ranking storage: Firestore REST API when configured, localStorage otherwise.
// One collection per track (track.collection, e.g. "scores", "scores_volcan").
// One document per player name (id "p_<lowercase name>") holding their best
// time, so showing the whole ranking costs one read per player:
// { name: string (1-15 chars), time: number (s), createdAt: timestamp }
// (older random-id documents from the first version are still read and merged).
import { FIREBASE } from './config.js';

export const NAME_MAX = 15;
const FETCH_LIMIT = 300;      // max players shown per track (each one costs a Firestore read)
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
    return { ...entry, improved: true };
  }
  // Keep only the player's best: skip the write if the stored time is better
  const url = `${BASE}/${collection}/${encodeURIComponent(playerDocId(entry.name))}?key=${FIREBASE.apiKey}`;
  const existing = await fetch(url);
  if (existing.ok) {
    const doc = await existing.json();
    const old = Number(doc.fields?.time?.doubleValue ?? doc.fields?.time?.integerValue);
    if (old <= entry.time) return { ...entry, improved: false, best: old };
  } else if (existing.status !== 404) {
    throw new Error(`lookup failed (${existing.status})`);
  }
  const res = await fetch(url, {
    method: 'PATCH',
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
  return { ...entry, improved: true };
}

function playerDocId(name) {
  return 'p_' + name.toLowerCase();
}

// Every player's best time, fastest first (the list scrolls past the top 10).
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
  return bestPerName(entries);
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
    localStorage.setItem(LOCAL_PREFIX + collection, JSON.stringify(bestPerName(entries).slice(0, 300)));
  } catch {
    /* storage unavailable */
  }
}
