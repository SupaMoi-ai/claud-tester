/**
 * The map controller.
 *
 * IMPERATIVE BY DESIGN. State changes patch layers in place; the map is never
 * rebuilt from scratch by a render pass, because doing so would throw away the
 * pan and zoom position the user just set with their thumb.
 *
 * Two views over one data set, switched by a single control:
 *   STRIP  vertical time-spaced chain of the whole line (default)
 *   GEO    the real corridor, framed on the user's neighbourhood
 *
 * The map is the heart of LIVE and must stay visible: the sheet below it never
 * exceeds 82% height, and nothing here ever draws a full-width card.
 */

import { svg, replace } from '../core/dom.js';
import { STATIONS, stationByIdx } from '../transport/stations.js';
import { resolveState, isActive, isDecaying } from '../domain/signals.js';
import {
  STRIP_HEIGHT, STRIP_RAIL_X, stripY, stripLayout,
  geoLayout, polyline, frameAround, boundsOf,
} from './geometry.js';
import { railLayer, stationMark, signalMark, userMark, trainMark } from './layers.js';
import { spriteDefs, sprite, CREATURES } from './sprites.js';

let host = null;          // scroll container
let root = null;          // <svg>
let view = 'strip';
let geo = null;           // cached geo layout
let frame = null;         // current geo viewBox
let onSelectSignal = null;
let onSelectStation = null;

const layers = {};        // name -> <g>

/* --- Mount ---------------------------------------------------------------- */

export function mount(container, handlers = {}) {
  host = container;
  onSelectSignal = handlers.onSelectSignal ?? null;
  onSelectStation = handlers.onSelectStation ?? null;
  build();
}

function build() {
  root = svg('svg', {
    class: 'map',
    xmlns: 'http://www.w3.org/2000/svg',
    role: 'img',
    'aria-label': 'L5 line map, Stavanger to Egersund',
  });
  root.append(spriteDefs());

  for (const name of ['coast', 'rail', 'creatures', 'stations', 'trains', 'signals', 'user']) {
    layers[name] = svg('g', { class: `ly-${name}` });
    root.append(layers[name]);
  }

  replace(host, root);
  applyView();
}

/* --- View switching -------------------------------------------------------- */

export function setView(next) {
  if (next === view) return;
  view = next;
  applyView();
}

export function getView() {
  return view;
}

function applyView() {
  if (!root) return;
  host.dataset.view = view;
  if (view === 'strip') buildStrip();
  else buildGeo();
}

/* --- STRIP ---------------------------------------------------------------- */

function buildStrip() {
  const width = host.clientWidth || 360;
  root.setAttribute('viewBox', `0 0 ${width} ${STRIP_HEIGHT}`);
  root.setAttribute('width', '100%');
  root.setAttribute('height', String(STRIP_HEIGHT));
  root.removeAttribute('preserveAspectRatio');

  // No coastline in the strip — it is a schematic, and pretending otherwise
  // would be the fantasy layer replacing the geography.
  replace(layers.coast, []);

  const pts = stripLayout();
  replace(layers.rail, railLayer(polyline(pts.map((p) => ({ x: STRIP_RAIL_X, y: p.y })))));

  replace(
    layers.stations,
    pts.map(({ station, x, y }) =>
      stationMark({ x, y, station, onSelect: onSelectStation }),
    ),
  );

  drawCreatures(width, STRIP_HEIGHT, pts.map((p) => p.y));
}

/* --- GEO ------------------------------------------------------------------ */

function buildGeo() {
  const width = host.clientWidth || 360;
  const height = host.clientHeight || 480;

  geo = geoLayout({ width: 1000, height: 2800, pad: 60 });

  root.setAttribute('width', '100%');
  root.setAttribute('height', '100%');
  root.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  replace(layers.rail, railLayer(geo.railPath));
  replace(
    layers.stations,
    geo.points.map(({ station, x, y }) =>
      stationMark({ x, y, station, onSelect: onSelectStation }),
    ),
  );
  replace(layers.coast, []);
  replace(layers.creatures, []);

  const centre = currentFocusIdx() ?? 6;
  frame = frameAround(geo.points, centre, 3, width / height);
  applyFrame();
  attachPan();
}

function applyFrame() {
  if (!frame) return;
  root.setAttribute('viewBox', `${frame.x} ${frame.y} ${frame.w} ${frame.h}`);
}

let panAttached = false;
function attachPan() {
  if (panAttached) return;
  panAttached = true;

  let dragging = false;
  let last = null;

  root.addEventListener('pointerdown', (e) => {
    if (view !== 'geo') return;
    dragging = true;
    last = { x: e.clientX, y: e.clientY };
    root.setPointerCapture(e.pointerId);
  });

  root.addEventListener('pointermove', (e) => {
    if (!dragging || view !== 'geo' || !frame) return;
    const rect = root.getBoundingClientRect();
    const scaleX = frame.w / rect.width;
    const scaleY = frame.h / rect.height;
    frame = {
      ...frame,
      x: frame.x - (e.clientX - last.x) * scaleX,
      y: frame.y - (e.clientY - last.y) * scaleY,
    };
    last = { x: e.clientX, y: e.clientY };
    applyFrame();
  });

  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    try { root.releasePointerCapture(e.pointerId); } catch { /* already released */ }
    // Keep the line reachable — panning must not lose it off-screen.
    if (geo && frame) {
      const b = boundsOf(geo.points);
      frame = {
        ...frame,
        x: Math.min(Math.max(frame.x, b.minX - frame.w), b.maxX),
        y: Math.min(Math.max(frame.y, b.minY - frame.h), b.maxY),
      };
      applyFrame();
    }
  };
  root.addEventListener('pointerup', end);
  root.addEventListener('pointercancel', end);
}

/* --- Live layers ---------------------------------------------------------- */

let focusIdx = null;

function currentFocusIdx() {
  return focusIdx;
}

/** Centre the map on a station. In STRIP this scrolls; in GEO it reframes. */
export function focusStation(idx, { animate = true } = {}) {
  focusIdx = idx;
  if (!root) return;
  if (view === 'strip') {
    const y = stripY(idx);
    host.scrollTo({
      top: Math.max(0, y - host.clientHeight / 2),
      behavior: animate && !prefersReducedMotion() ? 'smooth' : 'auto',
    });
  } else if (geo) {
    const width = host.clientWidth || 360;
    const height = host.clientHeight || 480;
    frame = frameAround(geo.points, idx, 3, width / height);
    applyFrame();
  }
}

function prefersReducedMotion() {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Draw the active community signals.
 * Expired and dismissed signals are simply absent — a map that keeps showing
 * dead intel is worse than an empty one.
 */
export function renderSignals(signals, nowMs = Date.now()) {
  if (!root) return;

  const live = signals.filter((s) => isActive(resolveState(s, nowMs)));
  const nodes = live.map((s) => {
    const pos = positionForStation(s.stationIdx);
    if (!pos) return null;
    return signalMark({
      x: pos.x,
      y: pos.y,
      signal: s,
      state: resolveState(s, nowMs),
      decaying: isDecaying(s, nowMs),
      onSelect: onSelectSignal,
    });
  }).filter(Boolean);

  replace(layers.signals, nodes);

  // Re-mark stations that carry a signal, so the line reads even when a signal
  // marker is scrolled just out of view. Only corroborated signals get the
  // alert bracket — an unconfirmed report is a claim, not a finding.
  const flagged = new Set(
    live
      .filter((s) => resolveState(s, nowMs) !== 'UNCONFIRMED')
      .map((s) => s.stationIdx),
  );
  redrawStations(flagged);
}

function redrawStations(flagged) {
  const pts = view === 'strip'
    ? stripLayout()
    : (geo?.points ?? []).map((p) => ({ station: p.station, x: p.x, y: p.y }));

  replace(
    layers.stations,
    pts.map(({ station, x, y }) =>
      stationMark({
        x, y, station,
        active: station.idx === focusIdx,
        hasSignal: flagged.has(station.idx),
        onSelect: onSelectStation,
      }),
    ),
  );
}

/** Draw the user's position, or nothing when we do not know it. */
export function renderUser(position) {
  if (!root) return;
  if (!position || position.stationIdx == null) {
    replace(layers.user, []);
    return;
  }
  const pos = positionForStation(position.stationIdx);
  if (!pos) {
    replace(layers.user, []);
    return;
  }
  replace(layers.user, userMark({ x: pos.x, y: pos.y, approximate: (position.km ?? 0) > 1.5 }));
}

/** Draw trains. Only called when the feed actually carries live positions. */
export function renderTrains(trains = []) {
  if (!root) return;
  replace(
    layers.trains,
    trains.map((t) => {
      const pos = positionForStation(t.stationIdx);
      if (!pos) return null;
      return trainMark({ x: pos.x, y: pos.y, delayed: t.delayMin > 1, cancelled: t.cancelled });
    }).filter(Boolean),
  );
}

function positionForStation(idx) {
  if (view === 'strip') {
    const s = stationByIdx(idx);
    return s ? { x: STRIP_RAIL_X, y: stripY(idx) } : null;
  }
  const p = geo?.points.find((q) => q.station.idx === idx);
  return p ? { x: p.x, y: p.y } : null;
}

/* --- Creatures ------------------------------------------------------------
   Decoration only. Placed in the right-hand margin, never on the rail and
   never on a station row, so they cannot obscure a name or a signal. */

function drawCreatures(width, height, stationYs) {
  if (width < 300) {
    replace(layers.creatures, []);
    return;
  }

  const marginX = Math.max(240, width - 110);
  const nodes = [];

  // Keep clear of station rows so a creature can never sit on a name or a
  // signal marker. Nudged rather than dropped, so the line still feels
  // inhabited instead of losing most of them to collisions.
  const CLEARANCE = 22;
  const clearOf = (y) => !stationYs.some((sy) => Math.abs(sy - y) < CLEARANCE);

  // Deterministic placement so creatures do not jump around between renders.
  for (let i = 0; i < 7; i++) {
    let y = 120 + i * ((height - 220) / 7);
    if (!clearOf(y)) y += CLEARANCE + 6;
    if (!clearOf(y)) y -= 2 * (CLEARANCE + 6);
    if (!clearOf(y) || y < 60 || y > height - 60) continue;
    const id = CREATURES[(i * 3 + 1) % CREATURES.length];
    nodes.push(
      sprite(id, {
        x: marginX + ((i % 3) * 22),
        y,
        size: 16,
        className: 'creature',
        opacity: 0.28,
      }),
    );
  }
  replace(layers.creatures, nodes);
}

/* --- Resize --------------------------------------------------------------- */

let resizeTimer = null;
addEventListener('resize', () => {
  if (!root) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => applyView(), 150);
});
