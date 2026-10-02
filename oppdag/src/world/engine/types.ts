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
 * it starts and what Kiki says about it all live in the existing game data —
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
  /**
   * Built, but not in the scene yet — not drawn, not tappable, not announced.
   * For things a chapter reveals: a character who appears somewhere else
   * later, a prop that only exists after a story beat. Declared here rather
   * than hidden from React on the first frame, which shows it for one frame.
   */
  hidden?: boolean;
}

/**
 * A character that moves through the scene.
 *
 * Actors are separate from interactables because they are not part of the
 * layout — their position changes every frame, they sort against the scenery
 * by depth, and they face the direction they are travelling. The engine moves
 * and draws them; deciding *where* they should go stays outside.
 */
export interface ActorSpec {
  id: string;
  /** One image per facing. `side` is mirrored for the opposite direction. */
  sprites: { front: string; back: string; side: string; rest?: string };
  /** Rendered height in world units; width follows the artwork's aspect. */
  height: number;
  /** Starting position, in world coordinates, at the character's feet. */
  x: number;
  y: number;
  /** World units per second when walking. */
  speed: number;
  /** Hit radius for tapping the character itself. */
  tapRadius: number;
  label?: string;
  /**
   * Trail this other actor. Declared here rather than driven from React so
   * that "Kiki follows Ellie" is a property of the cast, not a line of game
   * code that has to remember to run every frame.
   */
  follows?: string;
}

export type Facing = 'front' | 'back' | 'left' | 'right';

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
    /**
     * Width of the design canvas in world units. Set it and the view scales so
     * exactly this much world spans the screen, whatever the device — the
     * specification's FIT viewport (section 2.1), and the reason a character's
     * authored height means the same thing on every phone. Omit it and one
     * world unit is one CSS pixel, which makes the visible world a property of
     * the handset rather than of the design.
     */
    designWidth?: number;
  };
  /** Flat background behind every layer. */
  background: number;
  layers: WorldLayer[];
  interactables: Interactable[];
  actors?: ActorSpec[];
  /**
   * Where a character may stand, in world coordinates. A tap outside these
   * rectangles is ignored rather than sending Ellie walking into the sea.
   */
  walkable?: { x: number; y: number; width: number; height: number }[];
  /**
   * Artwork a chapter will swap in later — a filled basket, a character's
   * second pose. Nothing draws these at build time; they are loaded with
   * everything else so that `updateInteractable` can swap a texture on the
   * frame it is asked to, rather than popping in a few hundred milliseconds
   * after the story beat that called for it.
   */
  preload?: string[];
}

/**
 * What a chapter may change about an object after the scene is built.
 *
 * Deliberately three fields. The engine renders and reports; a story that
 * could reposition and re-shape anything at runtime would make the scene file
 * stop describing the scene, which is the one thing it is for.
 */
export interface InteractablePatch {
  /** Swap the artwork. The path must be in the scene's `preload`. */
  asset?: string;
  /** Hide it: no longer drawn, no longer tappable, no longer announced. */
  visible?: boolean;
  /** Turn the "over here" ring on or off. */
  attention?: boolean;
}

/** Where a tap landed. The engine reports; it never decides what it means. */
export interface WorldTap {
  /** Interactable or actor under the finger, if any. */
  id: string | null;
  /** World coordinates of the tap, for walking somewhere empty. */
  worldX: number;
  worldY: number;
  /** False when the point is outside every walkable rectangle. */
  walkable: boolean;
}

/** Imperative handle for driving the world from React. */
export interface WorldApi {
  walkTo: (actorId: string, x: number, y: number, onArrive?: () => void) => void;
  positionOf: (actorId: string) => { x: number; y: number } | null;
  /** Glide the camera to a world point — used by story beats. */
  focusOn: (x: number, y: number) => void;
  /** Keep the camera centred on an actor as it walks. */
  followActor: (actorId: string | null) => void;
  /** Change an object the chapter has moved past — see `InteractablePatch`. */
  updateInteractable: (id: string, patch: InteractablePatch) => void;
}

/** What the engine reports back. It never acts on these itself. */
export interface WorldEvents {
  onTap?: (tap: WorldTap) => void;
  /** Fires once the scene is built, handing over the imperative handle. */
  onReady?: (api: WorldApi) => void;
  /** Sustained frames-per-second sample, for the performance budget. */
  onFps?: (fps: number) => void;
}
