/**
 * Entur Journey Planner v3 client.
 *
 * Free and open under NLOD. No API key — Entur asks only that consumers
 * identify themselves with an ET-Client-Name header, which is a courtesy worth
 * honouring properly rather than spoofing.
 *
 *   https://api.entur.io/journey-planner/v3/graphql
 *
 * NOTE: this module throws on any failure. That is deliberate — provider.js
 * catches and falls back to the synthetic timetable, and the UI says OFFLINE.
 * Silently returning empty data here would look identical to "no trains today".
 */

import { STATIONS, stationByIdx, LINE_CODE } from './stations.js';

const ENDPOINT = 'https://api.entur.io/journey-planner/v3/graphql';
const CLIENT_NAME = 'supamoi-track5';
const TIMEOUT_MS = 8000;

const BOARD_QUERY = `
query Board($id: String!, $n: Int!) {
  stopPlace(id: $id) {
    id
    name
    estimatedCalls(numberOfDepartures: $n, timeRange: 10800, arrivalDeparture: departures) {
      realtime
      realtimeState
      aimedDepartureTime
      expectedDepartureTime
      cancellation
      destinationDisplay { frontText }
      quay { id publicCode }
      serviceJourney {
        id
        line { id publicCode name transportMode }
        directionType
      }
    }
  }
}`;

async function gql(query, variables) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'ET-Client-Name': CLIENT_NAME,
      },
      body: JSON.stringify({ query, variables }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`entur http ${res.status}`);
    const json = await res.json();
    if (json.errors?.length) throw new Error(`entur graphql: ${json.errors[0].message}`);
    return json.data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Map an Entur estimated call into the app's Call shape.
 *
 * Delay is expected minus aimed. `realtime: false` means Entur is serving the
 * planned timetable rather than a live position — the UI marks those SCHED so
 * a user is never told a printed time is a live one.
 */
function toCall(call, stationIdx) {
  const aimedMs = Date.parse(call.aimedDepartureTime);
  const expectedMs = Date.parse(call.expectedDepartureTime ?? call.aimedDepartureTime);
  const delayMin = Math.round((expectedMs - aimedMs) / 60_000);

  // Entur's directionType is not reliable across operators, so direction is
  // derived from the destination against our own station order instead.
  const dest = call.destinationDisplay?.frontText ?? '';
  const direction = inferDirection(dest, stationIdx);

  return {
    serviceId: call.serviceJourney?.id ?? `${aimedMs}`,
    line: call.serviceJourney?.line?.publicCode ?? LINE_CODE,
    direction,
    destination: dest,
    stationIdx,
    aimedMs,
    expectedMs,
    delayMin,
    cancelled: Boolean(call.cancellation),
    realtime: Boolean(call.realtime),
  };
}

/**
 * Work out which way a service is heading from its destination name.
 * Falls back to null rather than guessing — an unknown direction is better
 * than a confidently wrong "2 STOPS AHEAD".
 */
function inferDirection(destination, stationIdx) {
  if (!destination) return null;
  const norm = destination.toLowerCase();
  const match = STATIONS.find((s) => norm.includes(s.name.toLowerCase()));
  if (!match) return null;
  if (match.idx > stationIdx) return 'south';
  if (match.idx < stationIdx) return 'north';
  return null;
}

/**
 * Departure board for one station, filtered to L5.
 *
 * @throws when the station has no resolved NSR id, or the request fails.
 */
export async function departuresFor(stationIdx, nowMs = Date.now(), count = 6) {
  const station = stationByIdx(stationIdx);
  if (!station) throw new Error(`unknown station ${stationIdx}`);
  if (!station.nsr) {
    // Expected until tools/resolve-stations.html has been run. Throwing puts
    // the app on the synthetic timetable with an honest OFFLINE badge.
    throw new Error(`no NSR id for ${station.name} — run tools/resolve-stations.html`);
  }

  // Over-fetch, because the board carries every line calling at the stop and
  // we only want L5.
  const data = await gql(BOARD_QUERY, { id: station.nsr, n: Math.max(count * 3, 12) });
  const calls = data?.stopPlace?.estimatedCalls ?? [];

  return calls
    .filter((c) => (c.serviceJourney?.line?.publicCode ?? '') === LINE_CODE)
    .map((c) => toCall(c, stationIdx))
    .filter((c) => c.expectedMs >= nowMs - 60_000)
    .sort((a, b) => a.expectedMs - b.expectedMs)
    .slice(0, count);
}

/**
 * Line-level disruptions.
 * Not yet wired: Entur exposes these through situation elements on the line,
 * which needs the resolved L5 line id. Returns empty until then rather than
 * inventing data.
 */
export async function disruptions() {
  return [];
}

export const PROVIDER_NAME = 'entur';
export { ENDPOINT, CLIENT_NAME };
