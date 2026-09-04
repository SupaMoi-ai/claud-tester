/**
 * Transport data provider.
 *
 * One interface, two implementations: Entur for real departures, and a
 * synthetic timetable for when Entur cannot be reached. Screens never know
 * which one is serving — they read `state.feed` to tell the user the truth.
 *
 *   departuresFor(stationIdx, nowMs, count) -> Promise<Call[]>
 *   disruptions() -> Promise<Disruption[]>
 *
 * Call shape:
 *   { serviceId, line, direction, destination, stationIdx,
 *     aimedMs, expectedMs, delayMin, cancelled, realtime }
 */

import * as mock from './mock.js';
import * as entur from './entur.js';
import * as store from '../core/state.js';
import { emit, EVENTS } from '../core/bus.js';

const CACHE_KEY = 'track5.departures.v1';
/** Never re-request the same station more often than this. */
const MIN_INTERVAL_MS = 30_000;
/** After falling back, retry the live feed on this cadence. */
const RETRY_LIVE_MS = 120_000;

let active = entur;
let lastLiveAttempt = 0;
const inflight = new Map();
const memo = new Map(); // stationIdx -> { at, calls }

/**
 * Last-good departures, persisted so LIVE renders something the instant it
 * opens rather than waiting on the network. This is what makes the brief's
 * two-second rule achievable — stale numbers labelled as stale beat a spinner.
 */
function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return;
    for (const [idx, entry] of Object.entries(parsed)) {
      if (entry && Array.isArray(entry.calls)) memo.set(Number(idx), entry);
    }
  } catch {
    /* A corrupt or unavailable cache is not an error — we just start cold. */
  }
}

function saveCache() {
  try {
    const out = {};
    for (const [idx, entry] of memo) out[idx] = entry;
    localStorage.setItem(CACHE_KEY, JSON.stringify(out));
  } catch {
    /* Private mode, quota, or blocked storage. Non-fatal. */
  }
}

function setFeed(next) {
  if (store.get().feed === next) return;
  store.set({ feed: next });
  emit(EVENTS.FEED_CHANGED, next);
}

/** Switch to the synthetic timetable and say so. */
function fallback(reason) {
  if (active !== mock) {
    console.warn('[transport] falling back to schedule-only:', reason);
    active = mock;
  }
  setFeed('offline');
}

function promoteToLive() {
  if (active !== entur) active = entur;
  setFeed('live');
}

/**
 * Departures for a station.
 *
 * Returns cached data immediately when it is fresh, and never throws: a
 * transport app that shows an error instead of a timetable has failed at its
 * only job.
 */
export async function departuresFor(stationIdx, nowMs = Date.now(), count = 6) {
  const cached = memo.get(stationIdx);
  if (cached && nowMs - cached.at < MIN_INTERVAL_MS) return cached.calls;

  if (inflight.has(stationIdx)) return inflight.get(stationIdx);

  // Periodically try the live feed again after a fallback.
  if (active === mock && nowMs - lastLiveAttempt > RETRY_LIVE_MS) {
    active = entur;
  }

  const attempt = (async () => {
    try {
      lastLiveAttempt = nowMs;
      const calls = await active.departuresFor(stationIdx, nowMs, count);
      if (active === entur) promoteToLive();
      else setFeed('offline');
      memo.set(stationIdx, { at: nowMs, calls });
      saveCache();
      return calls;
    } catch (err) {
      fallback(err?.message ?? err);
      const calls = await mock.departuresFor(stationIdx, nowMs, count);
      memo.set(stationIdx, { at: nowMs, calls });
      return calls;
    } finally {
      inflight.delete(stationIdx);
    }
  })();

  inflight.set(stationIdx, attempt);
  return attempt;
}

/** Cached departures without touching the network. Used for first paint. */
export function cachedFor(stationIdx) {
  return memo.get(stationIdx)?.calls ?? null;
}

export async function disruptions() {
  try {
    return await active.disruptions();
  } catch {
    return [];
  }
}

/** Force the synthetic provider — used by the offline demo toggle. */
export function forceMock() {
  active = mock;
  setFeed('offline');
}

export function init() {
  loadCache();
  // If we have anything cached at all, we can paint before the network answers.
  setFeed(memo.size ? 'offline' : 'connecting');
}
