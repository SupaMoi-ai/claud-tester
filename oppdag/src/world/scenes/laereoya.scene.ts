import type { SceneConfig, WorldLayer } from '../engine/types';
import { LOCATIONS } from '../worldLayout';

/**
 * LÆREØYA — the home world.
 *
 * Blocked out with placeholder colour so the *composition* can be judged and
 * the camera tuned before a single painted asset exists. Every entry names the
 * asset that will replace it and the size that asset must be, so swapping in
 * artwork is one-for-one with no code change.
 *
 * World is 1700×900 against a roughly 944×508 view on a landscape iPad. That
 * shows a bit over half the island at a time — enough that panning reveals
 * something and the world feels bigger than the screen, small enough that a
 * child is never more than one drag from anything. The brief asks for a
 * carefully composed small scene where every visible object matters, not an
 * open world to get lost in.
 *
 * Vertical bands, back to front:
 * Layer positions are derived backwards from where each band should land ON
 * SCREEN at the opening camera, because parallax means world-y and screen-y
 * are not the same thing — an island placed by eye in world coordinates
 * silently covered the mountains behind it.
 */

const W = 1700;
const H = 900;

/** Palette from tokens.css, as Pixi hex. Placeholders stay on-brand. */
const C = {
  sky: 0xd8eefa,
  skyFar: 0xeaf4fa,
  sea: 0xbedcef,
  mountain: 0xc9d8e4,
  forestFar: 0xb8d4be,
  land: 0xe9f3dc,
  sand: 0xf3e7cf,
  grass: 0xd7eac4,
  moss: 0x84cfa6,
  coral: 0xf78a77,
  butter: 0xffcf76,
  lavender: 0xb8a5e4,
  cloud: 0xffffff,
  fore: 0x9ec69f,
} as const;

/**
 * Where each place sits on the island.
 *
 * Positions live here rather than in `worldLayout.ts` because they are a
 * property of *this scene's* composition — a future second island would place
 * the same locations differently. `worldLayout.ts` keeps owning what a place
 * means and what unlocks it.
 */
const LOCATION_POSITIONS: Record<string, { x: number; y: number }> = {
  oppfinneroya: { x: 300, y: 572 },
  skoglandet: { x: 470, y: 545 },
  tallfjellet: { x: 700, y: 500 },
  nordlysobservatoriet: { x: 880, y: 478 },
  havna: { x: 1180, y: 578 },
  fortellerbyen: { x: 1330, y: 520 },
  historiedalen: { x: 1470, y: 578 },
};

export const laereoyaScene: SceneConfig = {
  id: 'laereoya',
  world: { width: W, height: H },
  background: C.sky,
  camera: {
    // Open on the middle of the island, low enough that sky reads generous.
    start: { x: 850, y: 450 },
    minZoom: 1,
    maxZoom: 1,
  },

  layers: [
    /* ---------------------------------------------------------------- sky */
    {
      id: 'sky-wash',
      asset: 'assets/worlds/laereoya/sky/sky.webp',
      layer: 'sky',
      parallax: 0.1,
      position: { x: -150, y: -209 },
      size: { width: W + 300, height: 240 },
      placeholderColor: C.skyFar,
      placeholderLabel: 'himmel',
    },
    {
      id: 'cloud-a',
      asset: 'assets/worlds/laereoya/sky/cloud-a.webp',
      layer: 'sky',
      parallax: 0.18,
      position: { x: 160, y: -123 },
      size: { width: 300, height: 120 },
      ambient: { kind: 'drift', speed: 6 },
      placeholderColor: C.cloud,
    },
    {
      id: 'cloud-b',
      asset: 'assets/worlds/laereoya/sky/cloud-b.webp',
      layer: 'sky',
      parallax: 0.24,
      position: { x: 980, y: -116 },
      size: { width: 230, height: 96 },
      ambient: { kind: 'drift', speed: 10 },
      placeholderColor: C.cloud,
    },
    {
      id: 'cloud-c',
      asset: 'assets/worlds/laereoya/sky/cloud-c.webp',
      layer: 'sky',
      parallax: 0.3,
      position: { x: 560, y: -29 },
      size: { width: 180, height: 76 },
      ambient: { kind: 'drift', speed: 14 },
      placeholderColor: C.cloud,
    },
    {
      id: 'birds',
      asset: null,
      layer: 'sky',
      parallax: 0.35,
      position: { x: 0, y: 24 },
      size: { width: 1, height: 1 },
      // A flock crosses every 20–45 seconds. Rare enough to feel like luck.
      ambient: { kind: 'passing', everyMs: [20000, 45000], durationMs: 13000, from: 'left' },
    },

    /* --------------------------------------------------------------- far */
    {
      id: 'mountains-far',
      asset: 'assets/worlds/laereoya/far/mountains.webp',
      layer: 'far',
      parallax: 0.45,
      position: { x: -80, y: 48 },
      size: { width: W + 160, height: 130 },
      placeholderColor: C.mountain,
      placeholderLabel: 'fjell',
    },
    {
      id: 'forest-far',
      asset: 'assets/worlds/laereoya/far/forest.webp',
      layer: 'far',
      parallax: 0.6,
      position: { x: -60, y: 221 },
      size: { width: W + 120, height: 60 },
      placeholderColor: C.forestFar,
      placeholderLabel: 'skog i det fjerne',
    },

    /* --------------------------------------------------------------- mid */
    {
      id: 'sea',
      asset: 'assets/worlds/laereoya/mid/sea.webp',
      layer: 'mid',
      parallax: 0.85,
      position: { x: -80, y: 378 },
      size: { width: W + 160, height: 320 },
      placeholderColor: C.sea,
      placeholderLabel: 'hav',
    },
    {
      id: 'island',
      asset: 'assets/worlds/laereoya/mid/island.webp',
      layer: 'mid',
      parallax: 1,
      position: { x: 180, y: 451 },
      size: { width: 1340, height: 185 },
      placeholderColor: C.land,
      placeholderLabel: 'Læreøya',
    },
    {
      id: 'meadow',
      asset: 'assets/worlds/laereoya/mid/meadow.webp',
      layer: 'mid',
      parallax: 1,
      position: { x: 350, y: 520 },
      size: { width: 550, height: 80 },
      placeholderColor: C.grass,
    },
    {
      id: 'shore',
      asset: 'assets/worlds/laereoya/mid/shore.webp',
      layer: 'mid',
      parallax: 1,
      position: { x: 1060, y: 596 },
      size: { width: 340, height: 40 },
      placeholderColor: C.sand,
      placeholderLabel: 'strand',
    },
    {
      id: 'river',
      asset: 'assets/worlds/laereoya/mid/river.webp',
      layer: 'mid',
      parallax: 1,
      position: { x: 690, y: 445 },
      size: { width: 64, height: 195 },
      placeholderColor: C.sea,
      placeholderLabel: 'elv',
    },
    {
      id: 'cottage',
      asset: 'assets/worlds/laereoya/mid/cottage.webp',
      layer: 'mid',
      parallax: 1,
      position: { x: 960, y: 505 },
      size: { width: 110, height: 100 },
      placeholderColor: C.coral,
      placeholderLabel: 'hytta',
    },
    {
      id: 'cottage-smoke',
      asset: null,
      layer: 'mid',
      parallax: 1,
      position: { x: 1012, y: 503 },
      size: { width: 1, height: 1 },
      ambient: { kind: 'smoke', rate: 0.7, rise: 24, spread: 12 },
    },

    /* --------------------------------------------------- swaying nature */
    ...[
      { id: 'tree-a', x: 380, y: 498, w: 60, h: 92 },
      { id: 'tree-b', x: 446, y: 512, w: 50, h: 78 },
      { id: 'tree-c', x: 322, y: 518, w: 44, h: 70 },
      { id: 'tree-d', x: 508, y: 504, w: 54, h: 86 },
    ].map((t) => ({
      id: t.id,
      asset: `assets/worlds/laereoya/mid/${t.id}.webp`,
      layer: 'mid' as const,
      parallax: 1,
      position: { x: t.x, y: t.y },
      size: { width: t.w, height: t.h },
      ambient: { kind: 'sway' as const, degrees: 1.4, period: 6.5, pivot: 'bottom' as const },
      placeholderColor: C.moss,
    })),

    /* --------------------------------------------------------- foreground */
    {
      id: 'fore-grass-left',
      asset: 'assets/worlds/laereoya/fore/grass-left.webp',
      layer: 'fore',
      parallax: 1.25,
      position: { x: -60, y: 738 },
      size: { width: 480, height: 130 },
      ambient: { kind: 'sway', degrees: 1, period: 4.5, pivot: 'bottom' },
      placeholderColor: C.fore,
      placeholderLabel: 'gress',
    },
    {
      id: 'fore-branch-right',
      asset: 'assets/worlds/laereoya/fore/branch-right.webp',
      layer: 'fore',
      parallax: 1.35,
      position: { x: 1500, y: 352 },
      size: { width: 230, height: 110 },
      ambient: { kind: 'sway', degrees: 0.8, period: 7.5, pivot: 'center' },
      placeholderColor: C.fore,
      placeholderLabel: 'grein',
    },
  ],

  /* ---------------------------------------------------------------------- */
  interactables: [
    ...LOCATIONS.map((location) => {
      const pos = LOCATION_POSITIONS[location.id] ?? { x: W / 2, y: H / 2 };
      return {
        id: location.id,
        x: pos.x,
        y: pos.y,
        hit: { shape: 'circle' as const, radius: 52 },
        asset: `assets/worlds/laereoya/interactive/${location.id}.webp`,
        size: { width: 104, height: 104 },
        label: location.name,
        placeholderColor: C.butter,
        placeholderLabel: location.name,
      };
    }),
    // Lumi stands by the cottage; Kiki sits slightly behind and below her —
    // the companion staging rule from the art bible, in world coordinates.
    {
      id: 'character:guide',
      x: 892,
      y: 596,
      hit: { shape: 'circle', radius: 46 },
      asset: null,
      size: { width: 86, height: 86 },
      label: 'Lumi',
      placeholderColor: C.cloud,
      placeholderLabel: 'Lumi',
    },
    {
      id: 'character:companion',
      x: 944,
      y: 614,
      hit: { shape: 'circle', radius: 34 },
      asset: null,
      size: { width: 62, height: 62 },
      label: 'Kiki',
      placeholderColor: C.lavender,
      placeholderLabel: 'Kiki',
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Progress                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The things that grow into Læreøya as the child learns.
 *
 * Keyed by the same scenery ids the growth rules in `worldLayout.ts` already
 * use, so the rule that says *why* a bridge appears and the data that says
 * *where* it appears stay in separate files — and neither one is code.
 */
const GROWN_SCENERY: Record<string, WorldLayer> = {
  skog: {
    id: 'scenery-skog',
    asset: 'assets/worlds/laereoya/mid/skog.webp',
    layer: 'mid',
    parallax: 1,
    position: { x: 296, y: 505 },
    size: { width: 280, height: 105 },
    ambient: { kind: 'sway', degrees: 1.1, period: 7, pivot: 'bottom' },
    placeholderColor: 0x4aa77b,
    placeholderLabel: 'skogen',
  },
  bro: {
    id: 'scenery-bro',
    // Spans the river, which runs down x≈700–770.
    asset: 'assets/worlds/laereoya/mid/bro.webp',
    layer: 'mid',
    parallax: 1,
    position: { x: 618, y: 546 },
    size: { width: 175, height: 42 },
    placeholderColor: 0xc08f6a,
    placeholderLabel: 'brua',
  },
  bat: {
    id: 'scenery-bat',
    asset: 'assets/worlds/laereoya/mid/bat.webp',
    layer: 'mid',
    parallax: 0.95,
    position: { x: 1250, y: 604 },
    size: { width: 100, height: 76 },
    ambient: { kind: 'bob', distance: 5, period: 5 },
    placeholderColor: 0xf0876f,
    placeholderLabel: 'båten',
  },
  fyr: {
    id: 'scenery-fyr',
    asset: 'assets/worlds/laereoya/mid/fyr.webp',
    layer: 'mid',
    parallax: 1,
    position: { x: 1552, y: 470 },
    size: { width: 62, height: 130 },
    ambient: { kind: 'pulse', min: 0.75, max: 1, period: 3.4 },
    placeholderColor: 0xfbfaf7,
    placeholderLabel: 'fyret',
  },
  hval: {
    id: 'scenery-hval',
    asset: 'assets/worlds/laereoya/mid/hval.webp',
    layer: 'mid',
    parallax: 0.9,
    position: { x: 196, y: 621 },
    size: { width: 155, height: 62 },
    ambient: { kind: 'bob', distance: 8, period: 8 },
    placeholderColor: 0x7fa8c9,
    placeholderLabel: 'hvalen',
  },
  nordlystaarn: {
    id: 'scenery-nordlystaarn',
    asset: 'assets/worlds/laereoya/mid/nordlystaarn.webp',
    layer: 'mid',
    parallax: 1,
    position: { x: 866, y: 356 },
    size: { width: 72, height: 142 },
    ambient: { kind: 'pulse', min: 0.8, max: 1, period: 2.8 },
    placeholderColor: 0x6b5f8c,
    placeholderLabel: 'Nordlystårnet',
  },
};

/**
 * The scene as this particular child currently sees it.
 *
 * The base scene above describes the place; this applies who is looking at it.
 * Keeping them separate means a second child's Læreøya is a different argument,
 * not a different file.
 */
export function buildLaereoyaScene(
  unlocked: string[],
  /** Locations with something waiting — they get the pulsing ring. */
  active: string[] = [],
): SceneConfig {
  const grown = Object.entries(GROWN_SCENERY)
    .filter(([id]) => unlocked.includes(id))
    .map(([, layer]) => layer);

  return {
    ...laereoyaScene,
    layers: [...laereoyaScene.layers, ...grown],
    interactables: laereoyaScene.interactables.map((item) =>
      item.id.startsWith('character:')
        ? item
        : {
            ...item,
            dimmed: !unlocked.includes(item.id),
            attention: active.includes(item.id) && unlocked.includes(item.id),
          },
    ),
  };
}
