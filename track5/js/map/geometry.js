/**
 * Map layout maths.
 *
 * Two layouts over one station list:
 *
 *   STRIP — a vertical chain spaced by running time. Answers "where am I and
 *           what is ahead" in one glance, which is priorities 1 and 2 of the
 *           LIVE hierarchy.
 *
 *   GEO   — the real corridor, Mercator-projected, aspect preserved. The
 *           corridor's true bounding box is roughly 21 km east-west by 58 km
 *           north-south; it is not the hairline a schematic implies, and the
 *           line bends noticeably east after Sirevåg. Whole-line GEO is still
 *           unusable on a phone — 19 stations would sit about 30 px apart with
 *           colliding labels — so GEO auto-frames a neighbourhood and STRIP
 *           carries the whole-line view.
 */

import { STATIONS, minutesFromNorth, TOTAL_MINUTES } from '../transport/stations.js';
import { project, fitToBox } from '../domain/geo.js';

/* --- STRIP ---------------------------------------------------------------- */

/** Vertical pixels per minute of running time. */
export const STRIP_PX_PER_MIN = 13;
/**
 * Enough headroom that Stavanger — the first station — clears the floating map
 * chrome instead of sitting behind the view toggle.
 */
export const STRIP_TOP_PAD = 72;
export const STRIP_BOTTOM_PAD = 40;
/** X position of the rail line within the strip. Left third, so labels get room. */
export const STRIP_RAIL_X = 46;

export const STRIP_HEIGHT =
  STRIP_TOP_PAD + TOTAL_MINUTES * STRIP_PX_PER_MIN + STRIP_BOTTOM_PAD;

/** Y position of a station in the strip. */
export function stripY(idx) {
  return STRIP_TOP_PAD + minutesFromNorth(idx) * STRIP_PX_PER_MIN;
}

/** Every station with its strip coordinates. */
export function stripLayout() {
  return STATIONS.map((s) => ({ station: s, x: STRIP_RAIL_X, y: stripY(s.idx) }));
}

/**
 * Interpolated Y for a position between two stations — used to place a train
 * or the user partway down a leg rather than snapping to the nearest dot.
 *
 * @param {number} fromIdx
 * @param {number} toIdx
 * @param {number} t  0..1 progress along the leg
 */
export function stripYBetween(fromIdx, toIdx, t) {
  const a = stripY(fromIdx);
  const b = stripY(toIdx);
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

/* --- GEO ------------------------------------------------------------------ */

/**
 * Project the whole line into a box, preserving aspect.
 *
 * @param {{width:number, height:number, pad?:number}} box
 * @returns {{points:Array, railPath:string, fit:Object}}
 */
export function geoLayout({ width, height, pad = 28 }) {
  const projected = STATIONS.map((s) => project(s.lat, s.lon));
  const fit = fitToBox(projected, { width, height, pad });
  const points = STATIONS.map((s, i) => ({
    station: s,
    ...fit.apply(projected[i]),
  }));
  return { points, railPath: polyline(points), fit };
}

/** Build an SVG path through a list of {x,y}. */
export function polyline(points) {
  if (!points.length) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
}

/**
 * A viewBox framing a neighbourhood around a station.
 *
 * `span` is how many stations either side to include. Returns a box in the
 * same coordinate space as geoLayout's points, so the map can animate between
 * the whole line and a local view without reprojecting.
 */
export function frameAround(points, centreIdx, span = 3, aspect = 1) {
  const lo = Math.max(0, centreIdx - 1 - span);
  const hi = Math.min(points.length - 1, centreIdx - 1 + span);
  const slice = points.slice(lo, hi + 1);
  if (!slice.length) return null;

  const xs = slice.map((p) => p.x);
  const ys = slice.map((p) => p.y);
  const pad = 30;

  let minX = Math.min(...xs) - pad;
  let maxX = Math.max(...xs) + pad;
  let minY = Math.min(...ys) - pad;
  let maxY = Math.max(...ys) + pad;

  let w = maxX - minX;
  let h = maxY - minY;

  // Grow the narrow axis so the framed region matches the viewport's shape
  // rather than being squeezed.
  const wanted = h * aspect;
  if (wanted > w) {
    const grow = (wanted - w) / 2;
    minX -= grow;
    maxX += grow;
    w = maxX - minX;
  } else {
    const grow = (w / aspect - h) / 2;
    minY -= grow;
    maxY += grow;
    h = maxY - minY;
  }

  return { x: minX, y: minY, w, h };
}

/** Clamp a viewBox so panning cannot lose the line off-screen. */
export function clampFrame(frame, bounds) {
  const x = Math.min(Math.max(frame.x, bounds.minX - frame.w * 0.5), bounds.maxX - frame.w * 0.5);
  const y = Math.min(Math.max(frame.y, bounds.minY - frame.h * 0.5), bounds.maxY - frame.h * 0.5);
  return { ...frame, x, y };
}

/** Bounding box of a point set. */
export function boundsOf(points) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}
