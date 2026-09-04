/**
 * Observable application state.
 *
 * Deliberately not a re-render engine. Screens subscribe to the slices they
 * care about and patch their own DOM. The map in particular is imperative and
 * must never be rebuilt from state — rebuilding it would throw away the pan
 * and zoom position the user just set.
 */

const state = {
  /** Which of the four destinations is showing. */
  tab: 'live',

  /** Session */
  user: null,              // { id, handle, xp, rank, avatar }
  authReady: false,

  /** Where the transport numbers came from: 'connecting' | 'live' | 'offline' */
  feed: 'connecting',

  /** Map */
  mapView: 'strip',        // 'strip' | 'geo'
  focusStation: null,      // station idx the user last tapped
  focusSignal: null,       // signal id the user last tapped

  /** Position, if the user granted it. null means we make no claims. */
  position: null,          // { lat, lon, stationIdx, km }
  heading: null,           // 'north' | 'south' | null

  /** Community */
  signals: [],             // active reports
  myReports: [],
  lastReportAtMs: null,

  /** Transport */
  departures: {},          // stationIdx -> array of calls
  disruptions: [],

  /** Personal */
  journeys: [],
  notifyPrefs: { departures: true, delays: true, disruptions: true, signals: true },

  /** Social */
  chat: [],
  crews: [],
  activeCrew: null,

  /** UI */
  sheet: 'peek',           // 'peek' | 'panel' | 'detail'
  toast: null,
};

const subscribers = new Set();

export function get() {
  return state;
}

/**
 * Merge a patch into state and notify subscribers with the set of changed keys.
 * Subscribers decide for themselves whether a change concerns them, which is
 * what keeps the map out of the render path.
 */
export function set(patch) {
  const changed = new Set();
  for (const [k, v] of Object.entries(patch)) {
    if (state[k] !== v) {
      state[k] = v;
      changed.add(k);
    }
  }
  if (changed.size === 0) return;
  for (const fn of subscribers) fn(state, changed);
}

/**
 * Subscribe to state changes.
 * @param {Function} fn      (state, changedKeys) => void
 * @param {string[]} [keys]  Only fire when one of these keys changed.
 * @returns {Function} unsubscribe
 */
export function subscribe(fn, keys = null) {
  const wrapped = keys
    ? (s, changed) => {
        if (keys.some((k) => changed.has(k))) fn(s, changed);
      }
    : fn;
  subscribers.add(wrapped);
  return () => subscribers.delete(wrapped);
}
