/**
 * Map marker builders.
 *
 * Each function returns a detached SVG node. The map controller owns placement
 * and lifecycle; these only decide what a thing looks like, so both the STRIP
 * and GEO views draw identical vocabulary.
 *
 * Readability order, from strongest to weakest ink:
 *   railway > stations > signals > user > trains > creatures
 * The railway is the strongest geographical element, per the brief. Creatures
 * are the faintest thing on screen and never overlap the line.
 */

import { svg } from '../core/dom.js';
import { STATE } from '../domain/signals.js';

/** The rail line itself. Heaviest stroke on the map. */
export function railLayer(pathData) {
  return svg('g', { class: 'ly-rail' }, [
    svg('path', {
      d: pathData,
      fill: 'none',
      stroke: 'var(--fg)',
      'stroke-width': 3,
      'stroke-linejoin': 'miter',
      'stroke-linecap': 'butt',
    }),
  ]);
}

/**
 * A station.
 *
 * Squares, not circles — the whole interface is hard rectangles, and a filled
 * square reads at a smaller size than a ring does. The tap target is a
 * transparent rect far larger than the mark, because thumbs on trains are not
 * precise.
 */
export function stationMark({ x, y, station, active = false, hasSignal = false, onSelect }) {
  const g = svg('g', {
    class: 'ly-station',
    dataset: { idx: station.idx },
    tabindex: '0',
    role: 'button',
    'aria-label': `${station.name} stasjon`,
  });

  // Hit area first so it sits under the visible mark.
  g.append(
    svg('rect', {
      x: x - 22,
      y: y - 14,
      width: 190,
      height: 28,
      fill: 'transparent',
      style: 'cursor:pointer',
    }),
  );

  const size = active ? 11 : 8;
  g.append(
    svg('rect', {
      x: x - size / 2,
      y: y - size / 2,
      width: size,
      height: size,
      fill: active ? 'var(--fg)' : 'var(--bg)',
      stroke: 'var(--fg)',
      'stroke-width': 2,
      'shape-rendering': 'crispEdges',
    }),
  );

  // A station carrying a signal gets a hard outer bracket, not a colour change,
  // so it still reads in the monochrome scheme.
  if (hasSignal) {
    g.append(
      svg('rect', {
        x: x - 9,
        y: y - 9,
        width: 18,
        height: 18,
        fill: 'none',
        stroke: 'var(--alert)',
        'stroke-width': 2,
        'shape-rendering': 'crispEdges',
      }),
    );
  }

  g.append(
    svg(
      'text',
      {
        x: x + 16,
        y: y + 4,
        class: 'ly-label',
        fill: active ? 'var(--fg)' : 'var(--fg-dim)',
      },
      station.name.toUpperCase(),
    ),
  );

  if (onSelect) {
    g.addEventListener('click', () => onSelect(station.idx));
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(station.idx);
      }
    });
  }
  return g;
}

/**
 * A community inspection signal.
 *
 * State is carried by shape and weight rather than colour alone, so it survives
 * both the monochrome palette and colour-blind viewers:
 *   UNCONFIRMED      hollow diamond, thin
 *   CONFIRMED        filled diamond
 *   HIGH_CONFIDENCE  filled diamond with an outer ring, in the alert tone
 * A decaying signal switches to a dashed outline — age becomes visible without
 * reading the timestamp.
 */
export function signalMark({ x, y, signal, state, decaying, onSelect }) {
  const g = svg('g', {
    class: 'ly-signal',
    dataset: { id: signal.id, state },
    tabindex: '0',
    role: 'button',
    'aria-label': `Inspection signal, ${state.replace('_', ' ').toLowerCase()}`,
  });

  g.append(
    svg('rect', {
      x: x - 20,
      y: y - 20,
      width: 40,
      height: 40,
      fill: 'transparent',
      style: 'cursor:pointer',
    }),
  );

  const filled = state !== STATE.UNCONFIRMED;
  const tone = state === STATE.HIGH_CONFIDENCE ? 'var(--alert)' : 'var(--fg)';

  if (state === STATE.HIGH_CONFIDENCE) {
    g.append(
      svg('path', {
        d: diamond(x, y, 15),
        fill: 'none',
        stroke: tone,
        'stroke-width': 2,
      }),
    );
  }

  g.append(
    svg('path', {
      d: diamond(x, y, 9),
      fill: filled ? tone : 'var(--bg)',
      stroke: tone,
      'stroke-width': 2,
      'stroke-dasharray': decaying ? '3 3' : null,
    }),
  );

  if (onSelect) {
    g.addEventListener('click', (e) => {
      e.stopPropagation();
      onSelect(signal.id);
    });
    g.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(signal.id);
      }
    });
  }
  return g;
}

function diamond(cx, cy, r) {
  return `M${cx},${cy - r} L${cx + r},${cy} L${cx},${cy + r} L${cx - r},${cy} Z`;
}

/**
 * The user's own position.
 *
 * Only drawn when we actually know it. An app that guesses where you are and
 * draws it with confidence is worse than one that admits it does not know.
 */
export function userMark({ x, y, approximate = false }) {
  return svg('g', { class: 'ly-user', 'aria-hidden': 'true' }, [
    approximate
      ? svg('circle', {
          cx: x, cy: y, r: 16,
          fill: 'none',
          stroke: 'var(--fg-dim)',
          'stroke-width': 1,
          'stroke-dasharray': '2 3',
        })
      : null,
    svg('rect', {
      x: x - 5, y: y - 5, width: 10, height: 10,
      fill: 'var(--bg)', stroke: 'var(--fg)', 'stroke-width': 3,
      'shape-rendering': 'crispEdges',
    }),
  ].filter(Boolean));
}

/** A train, drawn only where live position data justifies it. */
export function trainMark({ x, y, delayed = false, cancelled = false }) {
  const tone = cancelled ? 'var(--alert)' : delayed ? 'var(--warn)' : 'var(--fg)';
  return svg('g', { class: 'ly-train', 'aria-hidden': 'true' }, [
    svg('rect', {
      x: x - 4, y: y - 7, width: 8, height: 14,
      fill: tone, 'shape-rendering': 'crispEdges',
    }),
  ]);
}
