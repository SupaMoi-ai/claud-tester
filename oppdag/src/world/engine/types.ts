/**
 * Scene description format.
 *
 * Everything the world renderer draws is described by plain data, never by
 * code. That is the whole point: an illustrator can replace `laereoya.scene.ts`
 * and every asset it names without a single change to the engine, the game
 * logic or the learning model.
 *
 * The engine's contract is narrow on purpose — it renders layers, moves a
 * camera, and reports which interactable was hit. It never reads game state
 * and never decides anything.
 */

/** Painter's order, back to front. Depth is the index into this list. */
export const LAYER_ORDER = [
  'sky',
  'far',
  'mid',
  'interactive',
  'fore',
] as const;

export type LayerName = (typeof LAYER_ORDER)[number];

/**
 * Ambient motion a layer or object performs on its own, forever.
 *
 * Declared rather than coded so that "the trees sway" is a property of the
 * scene, not a special case inside the renderer. All of it stops under
 * prefers-reduced-motion.
 */
export type AmbientSpec =
  /** Horizontal drift that wraps around — clouds, distant boats. */
  | { kind: 'drift'; speed: number; wrap?: boolean }
  /** Gentle rotation about a pivot near the base — trees, grass, flowers. */
  | { kind: 'sway'; degrees: number; period: number; pivot?: 'bottom' | 'center' }
  /** Vertical bob — buoys, floating things. */
  | { kind: 'bob'; distance: number; period: number }
  /** Opacity pulse — lighthouse beam, window light, aurora. */
  | { kind: 'pulse'; min: number; max: number; period: number }
  /** Rising particles — chimney smoke. */
  | { kind: 'smoke'; rate: number; rise: number; spread: number }
  /** Occasional one-off crossing — birds, a train, a ferry. */
  | { kind: 'passing'; everyMs: [number, number]; durationMs: number; from: 'left' | 'right' };

export interface WorldLayer {
  id: string;
  /** Path into /assets. Null renders the placeholder block instead. */
  asset: string | null;
  layer: LayerName;
  /**
   * How much this layer moves relative to the camera. 0 = pinned (sky),
   * 1 = moves exactly with the world, >1 = foreground rushing past.
   */
  parallax: number;
  /** Position of the layer's top-left in world coordinates. */
  position: { x: number; y: number };
  /** Expected asset size. Used for the placeholder and to catch wrong art. */
  size: { width: number; height: number };
  ambient?: AmbientSpec;
  /** Placeholder fill while there is no artwork. */
  placeholderColor?: number;
  /** Label drawn on the placeholder so a blocked-out scene is readable. */
  placeholderLabel?: string;
}

export type HitArea =
  | { shape: 'rect'; width: number; height: number }
  | { shape: 'circle'; radius: number };

/**
 * Something the child can tap.
 *
 * Carries only identity and geometry. Whether it is unlocked, what adventure
 * it starts and what Lumi says about it all live in the existing game data —
 * the engine just reports `id` upward.
 */
export interface Interactable {
  id: string;
  /** World coordinates of the object's anchor point. */
  x: number;
  y: number;
  hit: HitArea;
  asset: string | null;
  size: { width: number; height: number };
  /** Drawn in the interactive layer unless overridden. */
  layer?: LayerName;
  parallax?: number;
  ambient?: AmbientSpec;
  placeholderColor?: number;
  placeholderLabel?: string;
  /** Accessibility name — the engine mirrors these into DOM buttons. */
  label?: string;
  /**
   * Drawn faded — a place the child has not opened yet. Still tappable, because
   * a locked place should feel like somewhere to wonder about, not a disabled
   * control.
   */
  dimmed?: boolean;
  /** Something is waiting here. Draws a slow pulsing ring to invite a tap. */
  attention?: boolean;
}

export interface SceneConfig {
  id: string;
  /** The full extent of the world in scene coordinates. */
  world: { width: number; height: number };
  /** Where the camera starts. */
  camera: {
    start: { x: number; y: number };
    /** Clamp so the child can never pan off into empty space. */
    minZoom: number;
    maxZoom: number;
  };
  /** Flat background behind every layer. */
  background: number;
  layers: WorldLayer[];
  interactables: Interactable[];
}

/** What the engine reports back. It never acts on these itself. */
export interface WorldEvents {
  onTap?: (id: string) => void;
  /** Fires once the scene's assets are ready and the first frame is drawn. */
  onReady?: () => void;
  /** Sustained frames-per-second sample, for the performance budget. */
  onFps?: (fps: number) => void;
}
