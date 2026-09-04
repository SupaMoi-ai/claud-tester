/**
 * Geography helpers.
 *
 * PURE MODULE. No I/O, no DOM. Takes station data as arguments rather than
 * importing it, so it stays testable and so the map can project any point set.
 */

const EARTH_R_KM = 6371;
const DEG = Math.PI / 180;

/**
 * Web Mercator projection, normalised.
 *
 * Returns unitless x/y where x grows east and y grows SOUTH (screen-natural,
 * so no flip is needed when writing SVG coordinates). Scale is arbitrary and
 * consistent; the map fits the result to its viewBox.
 */
export function project(lat, lon) {
  const x = lon * DEG;
  const y = -Math.log(Math.tan(Math.PI / 4 + (lat * DEG) / 2));
  return { x, y };
}

/**
 * Fit a set of projected points into a box, preserving aspect ratio.
 *
 * The L5 corridor is roughly 75 km north-south and a few km wide. Preserving
 * the true aspect ratio is what keeps the GEO view honest — the alternative,
 * stretching it to fill the screen, would misrepresent the geography the brief
 * says must never be replaced.
 *
 * @param {Array<{x:number,y:number}>} pts
 * @param {{width:number, height:number, pad:number}} box
 * @returns {{scale:number, ox:number, oy:number, apply:Function}}
 */
export function fitToBox(pts, { width, height, pad = 24 }) {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const spanX = maxX - minX || 1e-9;
  const spanY = maxY - minY || 1e-9;

  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);

  // Centre the fitted content in the box.
  const ox = pad + (width - pad * 2 - spanX * scale) / 2 - minX * scale;
  const oy = pad + (height - pad * 2 - spanY * scale) / 2 - minY * scale;

  const apply = (p) => ({ x: p.x * scale + ox, y: p.y * scale + oy });
  return { scale, ox, oy, apply };
}

/** Great-circle distance in kilometres. */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * DEG;
  const dLon = (lon2 - lon1) * DEG;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Nearest station to a coordinate.
 *
 * Returns null when the user is nowhere near the line — someone in Oslo should
 * not be told they are "at Bryne". maxKm is deliberately generous (Jæren is
 * rural and a user may be a few km from the track) but finite.
 *
 * @returns {{station:Object, km:number}|null}
 */
export function nearestStation(lat, lon, stations, maxKm = 12) {
  let best = null;
  for (const s of stations) {
    const km = distanceKm(lat, lon, s.lat, s.lon);
    if (!best || km < best.km) best = { station: s, km };
  }
  if (!best || best.km > maxKm) return null;
  return best;
}

/**
 * How many stops ahead a signal is, relative to a user's position and travel
 * direction. Returns null when the signal is behind the user or off-route —
 * "2 STOPS AHEAD" must only ever appear when it is literally true.
 *
 * @param {number} userIdx
 * @param {'north'|'south'} heading   Direction the user is travelling.
 * @param {number} signalIdx
 * @returns {number|null}
 */
export function stopsAhead(userIdx, heading, signalIdx) {
  if (userIdx == null || heading == null) return null;
  const delta = signalIdx - userIdx;
  if (delta === 0) return 0;
  if (heading === 'south' && delta > 0) return delta;
  if (heading === 'north' && delta < 0) return -delta;
  return null;
}

/**
 * Is a signal relevant to a saved journey?
 * True when the reported station falls within the journey's station span.
 */
export function signalOnJourney(signalIdx, journey) {
  const lo = Math.min(journey.fromIdx, journey.toIdx);
  const hi = Math.max(journey.fromIdx, journey.toIdx);
  return signalIdx >= lo && signalIdx <= hi;
}
