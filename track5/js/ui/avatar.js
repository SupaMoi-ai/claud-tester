/**
 * The avatar.
 *
 * A small pixel figure built from stacked layers, drawn as inline SVG on a
 * 24x32 grid with crispEdges so it stays pixel art rather than turning into
 * smooth vector shapes.
 *
 * Cosmetics are appearance only. Nothing here touches XP, confidence, or what
 * anyone can see on the map — the brief is explicit that no gameplay advantage
 * may come from them, and keeping the rendering entirely separate from the
 * domain modules is how that stays true rather than merely intended.
 */

import { svg } from '../core/dom.js';

const W = 24;
const H = 32;

/** One pixel rectangle. */
function px(x, y, w, h, fill = 'var(--fg)') {
  return svg('rect', { x, y, width: w, height: h, fill, 'shape-rendering': 'crispEdges' });
}

/* --- Base figure ----------------------------------------------------------
   Deliberately plain: a hooded silhouette that reads at 32px and leaves room
   for the cosmetics to be the thing you notice. */

function base() {
  return [
    px(8, 4, 8, 7),                       // head
    px(9, 6, 2, 2, 'var(--bg)'),          // eye
    px(13, 6, 2, 2, 'var(--bg)'),         // eye
    px(7, 11, 10, 11),                    // torso
    px(5, 12, 2, 8),                      // arm
    px(17, 12, 2, 8),                     // arm
    px(8, 22, 3, 7),                      // leg
    px(13, 22, 3, 7),                     // leg
    px(7, 29, 4, 2),                      // foot
    px(13, 29, 4, 2),                     // foot
  ];
}

/* --- Cosmetic layers ------------------------------------------------------
   Keyed by cosmetic id, matching the catalogue in supabase/schema.sql and the
   COSMETICS array in js/data/local.js. An unknown id simply draws nothing, so
   a catalogue that gains an item before the art does degrades quietly. */

const LAYERS = {
  /* jackets — torso overlays */
  'jacket-rail': () => [
    px(7, 11, 10, 11, 'var(--fg-dim)'),
    px(11, 11, 2, 11, 'var(--fg)'),
  ],
  'jacket-hivis': () => [
    px(7, 11, 10, 11, 'var(--warn)'),
    px(7, 15, 10, 2, 'var(--bg)'),
    px(11, 11, 2, 11, 'var(--bg)'),
  ],
  'jacket-leather': () => [
    px(7, 11, 10, 11, 'var(--fg-faint)'),
    px(11, 11, 1, 11, 'var(--fg)'),
    px(7, 11, 3, 4, 'var(--fg-dim)'),
    px(14, 11, 3, 4, 'var(--fg-dim)'),
  ],

  /* hats */
  'hat-beanie': () => [
    px(8, 2, 8, 3, 'var(--fg)'),
    px(7, 4, 10, 2, 'var(--fg-dim)'),
  ],
  'hat-cap': () => [
    px(8, 2, 8, 3, 'var(--fg)'),
    px(6, 5, 12, 1, 'var(--fg)'),
    px(8, 3, 8, 1, 'var(--bg)'),
  ],
  'hat-hood': () => [
    px(7, 2, 10, 4, 'var(--fg-dim)'),
    px(6, 4, 1, 8, 'var(--fg-dim)'),
    px(17, 4, 1, 8, 'var(--fg-dim)'),
  ],

  /* face */
  'glasses-dark': () => [
    px(8, 6, 3, 2, 'var(--fg)'),
    px(13, 6, 3, 2, 'var(--fg)'),
    px(11, 6, 2, 1, 'var(--fg)'),
  ],

  /* patches — small marks on the torso */
  'patch-jaeren': () => [px(8, 13, 2, 2, 'var(--ok)')],
  'patch-nightowl': () => [px(8, 13, 2, 2, 'var(--fg)'), px(8, 16, 2, 1, 'var(--fg)')],
  'patch-legend': () => [
    px(14, 13, 2, 2, 'var(--alert)'),
    px(14, 16, 2, 1, 'var(--alert)'),
  ],
};

/** Draw order. Jacket before patches so a patch sits on top of it. */
const ORDER = ['jacket', 'hat', 'face', 'patch'];

/**
 * Render an avatar.
 *
 * @param {object} avatar  { jacket, hat, face, patch } — cosmetic ids or null
 * @param {number} size    rendered pixel size
 */
export function renderAvatar(avatar = {}, size = 64) {
  const layers = [];
  for (const slot of ORDER) {
    const id = avatar?.[slot];
    const draw = id && LAYERS[id];
    if (draw) layers.push(...draw());
  }

  return svg('svg', {
    viewBox: `0 0 ${W} ${H}`,
    width: (size * W) / H,
    height: size,
    role: 'img',
    'aria-label': 'Your avatar',
    style: 'image-rendering:pixelated;display:block',
  }, [
    ...base(),
    ...layers,
  ]);
}

/** A tiny preview of a single item, for the cosmetics grid. */
export function renderItemPreview(cosmetic, size = 40) {
  return renderAvatar({ [cosmetic.slot]: cosmetic.id }, size);
}

export const SLOTS = ORDER;
