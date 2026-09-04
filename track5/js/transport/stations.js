/**
 * L5 (Jærbanen) station table — Stavanger to Egersund.
 *
 * `idx` is authoritative and drives every direction calculation in the app:
 *   INSPECTION NORTH  = travelling toward a LOWER index (toward Stavanger)
 *   INSPECTION SOUTH  = travelling toward a HIGHER index (toward Egersund)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * COORDINATES AND NSR IDs ARE PROVISIONAL.
 *
 * The build environment for this project cannot reach api.entur.io, so these
 * values could not be resolved from the source of truth. They are close enough
 * to render a correct, readable corridor, but they are not canonical.
 *
 * To replace them with exact values, open  tools/resolve-stations.html  in a
 * normal browser. It queries Entur for all 19 stations and prints a
 * ready-to-paste replacement for the STATIONS array below, with canonical
 * NSR StopPlace IDs and exact coordinates.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `toNext` is the typical running time in minutes to the following station.
 * The STRIP map spaces stations by travel time rather than by distance,
 * because "how long until I'm there" is the question a commuter is actually
 * asking. The southern half of the line has long gaps in distance but the
 * spacing a passenger feels is time.
 */

export const STATIONS = [
  { idx: 1,  name: 'Stavanger',       lat: 58.9700, lon: 5.7331, toNext: 2, nsr: null },
  { idx: 2,  name: 'Paradis',         lat: 58.9603, lon: 5.7386, toNext: 3, nsr: null },
  { idx: 3,  name: 'Mariero',         lat: 58.9268, lon: 5.7367, toNext: 3, nsr: null },
  { idx: 4,  name: 'Jåttåvågen',      lat: 58.9078, lon: 5.7229, toNext: 2, nsr: null },
  { idx: 5,  name: 'Gausel',          lat: 58.8944, lon: 5.7189, toNext: 4, nsr: null },
  { idx: 6,  name: 'Sandnes sentrum', lat: 58.8517, lon: 5.7353, toNext: 2, nsr: null },
  { idx: 7,  name: 'Skeiane',         lat: 58.8437, lon: 5.7333, toNext: 3, nsr: null },
  { idx: 8,  name: 'Ganddal',         lat: 58.8214, lon: 5.7419, toNext: 4, nsr: null },
  { idx: 9,  name: 'Øksnavadporten',  lat: 58.7885, lon: 5.6960, toNext: 3, nsr: null },
  { idx: 10, name: 'Klepp',           lat: 58.7789, lon: 5.6410, toNext: 4, nsr: null },
  { idx: 11, name: 'Bryne',           lat: 58.7357, lon: 5.6462, toNext: 6, nsr: null },
  { idx: 12, name: 'Nærbø',           lat: 58.6650, lon: 5.6470, toNext: 5, nsr: null },
  { idx: 13, name: 'Varhaug',         lat: 58.6135, lon: 5.6540, toNext: 5, nsr: null },
  { idx: 14, name: 'Vigrestad',       lat: 58.5638, lon: 5.7031, toNext: 4, nsr: null },
  { idx: 15, name: 'Brusand',         lat: 58.5262, lon: 5.7392, toNext: 3, nsr: null },
  { idx: 16, name: 'Ogna',            lat: 58.5153, lon: 5.7910, toNext: 3, nsr: null },
  { idx: 17, name: 'Sirevåg',         lat: 58.5045, lon: 5.7950, toNext: 6, nsr: null },
  { idx: 18, name: 'Hellvik',         lat: 58.4680, lon: 5.9370, toNext: 6, nsr: null },
  { idx: 19, name: 'Egersund',        lat: 58.4520, lon: 6.0007, toNext: 0, nsr: null },
];

/** The line's public code in Entur. Used to filter departure boards. */
export const LINE_CODE = 'L5';

/** Terminus names, used for direction labels in the UI. */
export const NORTH_TERMINUS = STATIONS[0].name;
export const SOUTH_TERMINUS = STATIONS[STATIONS.length - 1].name;

const BY_IDX = new Map(STATIONS.map((s) => [s.idx, s]));

export function stationByIdx(idx) {
  return BY_IDX.get(idx) ?? null;
}

export function stationName(idx) {
  return BY_IDX.get(idx)?.name ?? 'UNKNOWN';
}

/** Full station name as signage renders it, e.g. "Bryne stasjon". */
export function stationFullName(idx) {
  const s = BY_IDX.get(idx);
  return s ? `${s.name} stasjon` : 'UNKNOWN';
}

/** Cumulative running time in minutes from Stavanger to a station. */
export function minutesFromNorth(idx) {
  let total = 0;
  for (const s of STATIONS) {
    if (s.idx >= idx) break;
    total += s.toNext;
  }
  return total;
}

/** Total end-to-end running time, used to scale the STRIP view. */
export const TOTAL_MINUTES = minutesFromNorth(STATIONS[STATIONS.length - 1].idx);

/**
 * Typical running time between two stations, in minutes.
 * Direction-agnostic.
 */
export function minutesBetween(aIdx, bIdx) {
  return Math.abs(minutesFromNorth(bIdx) - minutesFromNorth(aIdx));
}

/** Number of stops between two stations. */
export function stopsBetween(aIdx, bIdx) {
  return Math.abs(bIdx - aIdx);
}

/**
 * Direction of travel from one station to another.
 * @returns {'north'|'south'|null}
 */
export function directionBetween(fromIdx, toIdx) {
  if (toIdx < fromIdx) return 'north';
  if (toIdx > fromIdx) return 'south';
  return null;
}
