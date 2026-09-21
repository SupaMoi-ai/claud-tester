import { buildLaereoyaScene } from './scenes/laereoya.scene';
import { LOCATIONS, SCENERY } from './worldLayout';
import type { SceneConfig } from './engine/types';

/**
 * Every piece of artwork the world expects, derived from the scene configs.
 *
 * Deliberately *derived* rather than hand-written: a manifest maintained
 * alongside the scene is a manifest that drifts from it, and then an
 * illustrator is working from a spec that quietly stopped being true. The
 * scene is the single source of truth; this reads it.
 *
 * The sizes here are layout intent, not a demand. They say how much space the
 * composition currently gives a thing — an illustration with different
 * proportions is fine and the scene gets refitted to it, which is a small edit
 * because the scene is plain data.
 */

export interface AssetSlot {
  /** Path relative to `public/`. */
  path: string;
  /** Layout width in CSS pixels at 1×. Export at 2× for retina. */
  width: number;
  /** Layout height in CSS pixels at 1×. */
  height: number;
  /** Which parallax band it belongs to. */
  band: string;
  /** The scene object that uses it. */
  id: string;
  /** True where the art can be opaque; everything else wants transparency. */
  opaque: boolean;
  /** Ambient motion applied to it, if any — affects how it should be drawn. */
  motion?: string;
}

/** Layers that legitimately fill their whole box and need no alpha. */
const OPAQUE_IDS = new Set(['sky-wash', 'sea', 'island']);

function slotsFor(scene: SceneConfig): AssetSlot[] {
  const slots: AssetSlot[] = [];

  for (const layer of scene.layers) {
    if (!layer.asset) continue;
    slots.push({
      path: layer.asset,
      width: layer.size.width,
      height: layer.size.height,
      band: layer.layer,
      id: layer.id,
      opaque: OPAQUE_IDS.has(layer.id),
      motion: layer.ambient?.kind,
    });
  }

  for (const item of scene.interactables) {
    if (!item.asset) continue;
    slots.push({
      path: item.asset,
      width: item.size.width,
      height: item.size.height,
      band: item.layer ?? 'interactive',
      id: item.id,
      opaque: false,
      motion: item.ambient?.kind,
    });
  }

  return slots;
}

/**
 * The full set, with every unlockable thing switched on so the scenery that
 * only appears once a child has learned something still shows up in the spec.
 */
export const ASSET_SLOTS: AssetSlot[] = slotsFor(
  buildLaereoyaScene([
    ...Object.keys(SCENERY),
    ...LOCATIONS.map((location) => location.id),
  ]),
);

/** Expected dimensions by path, for the drop-in size check. */
export const EXPECTED_SIZE: Record<string, { width: number; height: number }> =
  Object.fromEntries(
    ASSET_SLOTS.map((slot) => [slot.path, { width: slot.width, height: slot.height }]),
  );

/**
 * Characters are not scene layers — they are driven by the character
 * controller and need a state set rather than a single image, so they are
 * listed separately.
 */
export const CHARACTER_STATES = [
  'idle',
  'happy',
  'curious',
  'thinking',
  'talking',
  'walking',
  'sleeping',
] as const;

export const CHARACTER_SLOTS = [
  { id: 'lumi', role: 'guide', width: 86, height: 86 },
  { id: 'kiki', role: 'companion', width: 62, height: 62 },
] as const;
