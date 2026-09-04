/**
 * Synthetic L5 timetable.
 *
 * This is the fallback when Entur is unreachable — and it is also what makes
 * the app developable offline. It is deliberately *not* presented as real:
 * the feed indicator reads OFFLINE — SCHEDULE ONLY whenever this provider is
 * serving, because the brief is explicit that the interface must communicate
 * uncertainty rather than pretend.
 *
 * Departures are generated deterministically from the clock, so two devices
 * looking at the same minute see the same board, and so tests are stable.
 */

import { STATIONS, minutesFromNorth, LINE_CODE } from './stations.js';

/** Southbound departures from Stavanger, minutes past each hour. */
const SOUTH_PATTERN = [12, 42];
/** Northbound departures from Egersund, minutes past each hour. */
const NORTH_PATTERN = [6, 36];

const MIN = 60_000;

/**
 * Cheap deterministic hash -> 0..1. Used so "delays" are stable for a given
 * service on a given day rather than flickering on every poll.
 */
function hash01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

/**
 * Synthesise a delay in minutes for a service.
 * Most trains are on time; a minority run late; a very few are cancelled.
 * The distribution matters — an app where everything is always late teaches
 * users to ignore the delay field.
 */
function disruptionFor(serviceId) {
  const r = hash01(serviceId);
  if (r > 0.97) return { cancelled: true, delayMin: 0 };
  if (r > 0.86) return { cancelled: false, delayMin: 2 + Math.floor(hash01(serviceId + 'd') * 12) };
  if (r > 0.78) return { cancelled: false, delayMin: 1 };
  return { cancelled: false, delayMin: 0 };
}

/**
 * All L5 departures passing a station within the window.
 *
 * @param {number} stationIdx
 * @param {number} nowMs
 * @param {number} count      Max departures to return.
 * @returns {Array} calls in the shape the UI expects
 */
export function departuresFor(stationIdx, nowMs = Date.now(), count = 6) {
  const offsetSouth = minutesFromNorth(stationIdx);
  const total = minutesFromNorth(STATIONS[STATIONS.length - 1].idx);
  const offsetNorth = total - offsetSouth;

  const calls = [];
  const startHour = new Date(nowMs);
  startHour.setMinutes(0, 0, 0);

  // Look across a few hours so late-evening boards still fill.
  for (let h = -1; h <= 3; h++) {
    const hourMs = startHour.getTime() + h * 60 * MIN;

    for (const m of SOUTH_PATTERN) {
      const originMs = hourMs + m * MIN;
      const serviceId = `L5-S-${new Date(originMs).toISOString().slice(0, 16)}`;
      calls.push(makeCall(serviceId, originMs + offsetSouth * MIN, 'south', stationIdx));
    }
    for (const m of NORTH_PATTERN) {
      const originMs = hourMs + m * MIN;
      const serviceId = `L5-N-${new Date(originMs).toISOString().slice(0, 16)}`;
      calls.push(makeCall(serviceId, originMs + offsetNorth * MIN, 'north', stationIdx));
    }
  }

  return calls
    .filter((c) => c.expectedMs >= nowMs - 60_000)
    .sort((a, b) => a.expectedMs - b.expectedMs)
    .slice(0, count);
}

function makeCall(serviceId, aimedMs, direction, stationIdx) {
  const { cancelled, delayMin } = disruptionFor(serviceId);
  return {
    serviceId,
    line: LINE_CODE,
    direction,
    destination: direction === 'south' ? 'Egersund' : 'Stavanger',
    stationIdx,
    aimedMs,
    expectedMs: aimedMs + delayMin * MIN,
    delayMin,
    cancelled,
    /** False means: this is a printed timetable, not a live position. */
    realtime: false,
  };
}

/** Line-wide disruptions. The mock reports none — it has no way to know. */
export function disruptions() {
  return [];
}

export const PROVIDER_NAME = 'mock';
