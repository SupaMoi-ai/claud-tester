/**
 * Tiny event bus for cross-module signals that are events rather than state:
 * "a signal was confirmed", "the feed went offline", "show a toast".
 *
 * Keeps modules from importing each other just to call one function.
 */

const handlers = new Map();

export function on(type, fn) {
  if (!handlers.has(type)) handlers.set(type, new Set());
  handlers.get(type).add(fn);
  return () => handlers.get(type)?.delete(fn);
}

export function emit(type, payload) {
  const set = handlers.get(type);
  if (!set) return;
  for (const fn of [...set]) {
    try {
      fn(payload);
    } catch (err) {
      // One bad listener must not take down the rest of the app.
      console.error(`[bus] handler for "${type}" threw`, err);
    }
  }
}

export const EVENTS = {
  TOAST: 'toast',
  SIGNAL_SENT: 'signal:sent',
  SIGNAL_VOTED: 'signal:voted',
  SIGNALS_CHANGED: 'signals:changed',
  FEED_CHANGED: 'feed:changed',
  MAP_SELECT_SIGNAL: 'map:select-signal',
  MAP_SELECT_STATION: 'map:select-station',
};
