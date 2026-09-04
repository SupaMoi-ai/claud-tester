/**
 * Pixel sprites.
 *
 * Hard-edged shapes on an integer grid, rendered with shape-rendering
 * crispEdges so they stay pixels rather than becoming soft vector art.
 *
 * Two families:
 *   - functional marks (station, signal, train, user) — these carry meaning and
 *     are always legible first
 *   - creatures — the inspectors. Small, strange, and strictly decorative.
 *     They live only in empty map margins, never over the railway or a station
 *     label, and never receive pointer events. The brief allows humour but is
 *     explicit that it must never interfere with transport information.
 */

import { svg } from '../core/dom.js';

/**
 * Build a <defs> block of reusable symbols.
 * Everything is drawn in a 16x16 user space and scaled at use sites.
 */
export function spriteDefs() {
  return svg('defs', {}, [
    // --- Inspector creature A: tall, thin, peaked cap, too many eyes -------
    svg('symbol', { id: 'sp-insp-a', viewBox: '0 0 16 16' }, [
      px('M5 2h6v1H5z'),          // cap brim
      px('M6 3h4v2H6z'),          // cap
      px('M5 5h6v5H5z'),          // head/body
      px('M6 6h1v1H6z', 'bg'),    // eye
      px('M9 6h1v1H9z', 'bg'),    // eye
      px('M7 8h2v1H7z', 'bg'),    // mouth
      px('M5 10h1v4H5z'),         // leg
      px('M10 10h1v4h-1z'),       // leg
    ]),

    // --- Inspector creature B: squat, wide, one enormous eye ---------------
    svg('symbol', { id: 'sp-insp-b', viewBox: '0 0 16 16' }, [
      px('M4 4h8v1H4z'),
      px('M3 5h10v6H3z'),
      px('M6 7h4v3H6z', 'bg'),    // the eye
      px('M7 8h2v1H7z'),          // pupil
      px('M4 11h2v3H4z'),
      px('M10 11h2v3h-2z'),
    ]),

    // --- Commuter creature: hunched, hood up, minding its own business -----
    svg('symbol', { id: 'sp-commuter', viewBox: '0 0 16 16' }, [
      px('M6 3h4v1H6z'),
      px('M5 4h6v4H5z'),
      px('M6 5h1v1H6z', 'bg'),
      px('M9 5h1v1H9z', 'bg'),
      px('M5 8h6v4H5z'),
      px('M5 12h2v2H5z'),
      px('M9 12h2v2H9z'),
    ]),

    // --- Seagull: it is Jæren, there are gulls -----------------------------
    svg('symbol', { id: 'sp-gull', viewBox: '0 0 16 16' }, [
      px('M2 7h3v1H2z'),
      px('M5 6h2v1H5z'),
      px('M7 5h2v1H7z'),
      px('M9 6h2v1H9z'),
      px('M11 7h3v1h-3z'),
    ]),

    // --- Train mark --------------------------------------------------------
    svg('symbol', { id: 'sp-train', viewBox: '0 0 16 16' }, [
      px('M4 2h8v10H4z'),
      px('M5 4h6v3H5z', 'bg'),
      px('M5 12h2v2H5z'),
      px('M9 12h2v2H9z'),
    ]),
  ]);
}

/** One path of the sprite. `bg` fills with the page ground to punch a hole. */
function px(d, fill = 'fg') {
  return svg('path', {
    d,
    fill: fill === 'bg' ? 'var(--bg)' : 'currentColor',
    'shape-rendering': 'crispEdges',
  });
}

/** Place a sprite. Decorative by construction — never interactive. */
export function sprite(id, { x, y, size = 16, className = '', opacity = 1 }) {
  return svg('use', {
    href: `#${id}`,
    x,
    y,
    width: size,
    height: size,
    class: `sprite ${className}`.trim(),
    opacity,
    'aria-hidden': 'true',
    'pointer-events': 'none',
  });
}

/** The creature pool the map draws from, weighted toward the mundane ones. */
export const CREATURES = [
  'sp-commuter',
  'sp-gull',
  'sp-commuter',
  'sp-insp-a',
  'sp-gull',
  'sp-insp-b',
];
