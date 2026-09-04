/**
 * Saved journeys.
 *
 * PURE MODULE. No I/O, no DOM.
 *
 * The point of a saved journey is that Track 5 stops being a map of the whole
 * line and becomes an app about the two trains you actually catch. Everything
 * here answers one of two questions: is this journey relevant right now, and
 * is this signal relevant to it.
 */

import { stopsAhead, signalOnJourney } from './geo.js';
import { minutesOfDay, weekdayIndex, parseHHMM } from '../core/time.js';

/**
 * A journey looks like:
 *   { id, label: 'HOME → WORK', fromIdx: 1, toIdx: 6,
 *     days: [0,1,2,3,4],            // 0 = Monday
 *     windowStart: '07:30', windowEnd: '08:30' }
 */

/** Direction of travel for a journey. */
export function journeyDirection(journey) {
  return journey.toIdx > journey.fromIdx ? 'south' : 'north';
}

/** Stations a journey passes through, in travel order. */
export function journeyStations(journey) {
  const step = journey.toIdx > journey.fromIdx ? 1 : -1;
  const out = [];
  for (let i = journey.fromIdx; i !== journey.toIdx + step; i += step) out.push(i);
  return out;
}

/**
 * Is this journey happening now?
 *
 * A window is widened by a lead time at the front, because someone leaving at
 * 07:30 wants to know about delays at 07:10, not at 07:30 when they are
 * already on the platform.
 */
export function isJourneyActive(journey, now = new Date(), leadMinutes = 25) {
  if (!journey.days?.includes(weekdayIndex(now))) return false;
  const mins = minutesOfDay(now);
  const start = parseHHMM(journey.windowStart) - leadMinutes;
  const end = parseHHMM(journey.windowEnd);
  return mins >= start && mins <= end;
}

/** The journey the app should be talking about, or null. */
export function activeJourney(journeys = [], now = new Date()) {
  return journeys.find((j) => isJourneyActive(j, now)) ?? null;
}

/**
 * Signals worth telling this traveller about.
 *
 * A signal is relevant when it sits on the journey's route. Where the user's
 * position is known, it is also annotated with how many stops ahead it is —
 * and `stopsAhead` returns null rather than guessing, so "2 STOPS AHEAD" only
 * ever appears when it is literally true.
 */
export function relevantSignals(signals, journey, userStationIdx = null) {
  if (!journey) return [];
  const heading = journeyDirection(journey);
  return signals
    .filter((s) => signalOnJourney(s.stationIdx, journey))
    .map((s) => ({
      signal: s,
      ahead: userStationIdx == null
        ? null
        : stopsAhead(userStationIdx, heading, s.stationIdx),
    }))
    .sort((a, b) => {
      // Things in front of you first, nearest first; everything else after.
      const aa = a.ahead ?? Infinity;
      const bb = b.ahead ?? Infinity;
      return aa - bb;
    });
}

/**
 * The next departure serving this journey.
 *
 * Filtered by direction, because a saved journey to Sandnes has no use for the
 * northbound platform.
 */
export function nextDeparture(calls = [], journey, nowMs = Date.now()) {
  if (!journey) return null;
  const heading = journeyDirection(journey);
  return (
    calls
      .filter((c) => c.expectedMs >= nowMs - 60_000)
      .filter((c) => c.direction == null || c.direction === heading)
      .sort((a, b) => a.expectedMs - b.expectedMs)[0] ?? null
  );
}

/** A short human label, e.g. "STAVANGER → SANDNES SENTRUM". */
export function journeyRouteLabel(journey, nameFor) {
  return `${nameFor(journey.fromIdx)} → ${nameFor(journey.toIdx)}`.toUpperCase();
}

export const DAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

/** "WEEKDAYS" / "WEEKENDS" / "MON WED FRI" / "EVERY DAY" */
export function daysLabel(days = []) {
  const set = [...days].sort((a, b) => a - b);
  if (set.length === 7) return 'EVERY DAY';
  if (set.join() === '0,1,2,3,4') return 'WEEKDAYS';
  if (set.join() === '5,6') return 'WEEKENDS';
  if (!set.length) return 'NEVER';
  return set.map((d) => DAY_NAMES[d]).join(' ');
}
