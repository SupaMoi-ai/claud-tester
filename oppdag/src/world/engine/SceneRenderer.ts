import {
  Assets,
  Container,
  Graphics,
  Sprite,
  Text,
  Texture,
  type Application,
} from 'pixi.js';
import type {
  AmbientSpec,
  Interactable,
  LayerName,
  SceneConfig,
  WorldLayer,
} from './types';
import { LAYER_ORDER } from './types';
import type { Camera } from './Camera';

/**
 * Turns a SceneConfig into a live Pixi scene graph.
 *
 * Two jobs, both narrow:
 *   1. Build one container per layer, in painter's order, and put things in them.
 *   2. Each frame, move those containers according to the camera and parallax,
 *      and advance any ambient motion.
 *
 * It knows nothing about adventures, unlocks or mastery. When an object is
 * tapped it reports the id and stops.
 *
 * Missing artwork is a first-class case, not an error: anything without an
 * asset (or whose asset fails to load) draws as a labelled block, so the whole
 * scene stays composable and readable long before an illustrator has touched it.
 */

interface Placed {
  /** Wrapper positioned in world space; ambient motion transforms this. */
  node: Container;
  parallax: number;
  ambient?: AmbientSpec;
  /** Base position, so ambient motion is always relative to the layout. */
  baseX: number;
  baseY: number;
  /** Per-object animation scratch. */
  phase: number;
  width: number;
  height: number;
  /** Particles/one-offs owned by this object. */
  extras?: Container;
  nextEventAt?: number;
}

export class SceneRenderer {
  readonly root = new Container();

  private layers = new Map<LayerName, Container>();
  private placed: Placed[] = [];
  private interactables: {
    config: Interactable;
    parallax: number;
  }[] = [];

  private attentionRings: { node: Graphics; phase: number }[] = [];
  private elapsed = 0;
  private scene: SceneConfig;
  private reducedMotion: boolean;

  constructor(scene: SceneConfig, reducedMotion: boolean) {
    this.scene = scene;
    this.reducedMotion = reducedMotion;

    for (const name of LAYER_ORDER) {
      const container = new Container();
      container.label = name;
      this.layers.set(name, container);
      this.root.addChild(container);
    }
  }

  /** Resolved textures, keyed by path. Absent or failed assets map to null. */
  private textures = new Map<string, Texture | null>();

  /**
   * Builds the scene.
   *
   * Assets are fetched **in parallel and with a deadline**, then the scene is
   * assembled synchronously. Doing it the obvious way — awaiting each sprite as
   * it is created — meant that during development, when no artwork exists yet,
   * two dozen failing requests ran end to end and the world stayed blank for
   * many seconds. Missing art is the normal state for most of this project's
   * life, so it has to be the fast path, not the slow one.
   */
  async build(app: Application): Promise<void> {
    const background = new Graphics()
      .rect(0, 0, app.screen.width, app.screen.height)
      .fill(this.scene.background);
    background.label = 'background';
    // Sits behind every layer and never moves.
    this.root.addChildAt(background, 0);

    const paths = [
      ...this.scene.layers.map((l) => l.asset),
      ...this.scene.interactables.map((i) => i.asset),
    ].filter((p): p is string => Boolean(p));

    await this.preload([...new Set(paths)]);

    for (const layer of this.scene.layers) this.addLayer(layer);
    for (const item of this.scene.interactables) this.addInteractable(item);
  }

  /* ------------------------------------------------------------ building */

  private async preload(paths: string[]): Promise<void> {
    if (paths.length === 0) return;

    const withDeadline = (path: string) =>
      Promise.race([
        Assets.load<Texture>(path).catch(() => null),
        // A dev server that answers a missing .webp with its SPA fallback can
        // leave a decode hanging forever. Never let that stall the world.
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
      ]).then((texture) => {
        this.textures.set(path, (texture as Texture | null) ?? null);
      });

    await Promise.all(paths.map(withDeadline));
  }

  private textureFor(path: string | null): Texture | null {
    return path ? (this.textures.get(path) ?? null) : null;
  }

  /**
   * Warns when a dropped-in illustration has a different shape from the slot
   * it is filling.
   *
   * Stretching art to fit is how a hand-painted world starts looking subtly
   * wrong in a way nobody can name — so this reports the mismatch with the
   * numbers needed to fix it, and the fix is normally to change the scene to
   * suit the art rather than the other way round. Dev-only; the scene renders
   * either way.
   */
  private checkFit(path: string | null, texture: Texture | null, w: number, h: number) {
    if (!import.meta.env.DEV || !path || !texture) return;
    const actual = texture.width / texture.height;
    const expected = w / h;
    if (!isFinite(actual) || !isFinite(expected)) return;
    const drift = Math.abs(actual - expected) / expected;
    if (drift > 0.02) {
      // eslint-disable-next-line no-console
      console.warn(
        `[oppdag] ${path} is ${texture.width}×${texture.height} ` +
          `(aspect ${actual.toFixed(3)}) but the scene gives it ${w}×${h} ` +
          `(aspect ${expected.toFixed(3)}). It will be stretched by ` +
          `${Math.round(drift * 100)}%. Change the slot size in the scene ` +
          `config to match the artwork.`,
      );
    }
  }

  private placeholder(
    width: number,
    height: number,
    color: number,
    label?: string,
  ): Container {
    const node = new Container();
    // Opaque, not 0.95: a stack of large translucent rects means every pixel
    // is blended several times over, which dominates the frame cost long
    // before anything interesting is happening.
    const block = new Graphics()
      .roundRect(0, 0, width, height, Math.min(24, width * 0.06))
      .fill({ color });
    node.addChild(block);

    if (label) {
      const text = new Text({
        text: label,
        style: {
          fontFamily: 'Nunito Variable, sans-serif',
          fontSize: Math.max(12, Math.min(22, width * 0.09)),
          fontWeight: '700',
          fill: 0x3a2e28,
          align: 'center',
        },
      });
      text.anchor.set(0.5);
      text.x = width / 2;
      text.y = height / 2;
      text.alpha = 0.55;
      node.addChild(text);
    }
    return node;
  }

  private addLayer(layer: WorldLayer) {
    const texture = this.textureFor(layer.asset);
    this.checkFit(layer.asset, texture, layer.size.width, layer.size.height);
    const wrapper = new Container();
    wrapper.label = layer.id;

    const visual = texture
      ? new Sprite(texture)
      : this.placeholder(
          layer.size.width,
          layer.size.height,
          layer.placeholderColor ?? 0xd8eefa,
          layer.placeholderLabel,
        );

    if (texture) {
      (visual as Sprite).width = layer.size.width;
      (visual as Sprite).height = layer.size.height;
    }
    wrapper.addChild(visual);

    // Sway pivots about the base, which is how a tree actually moves.
    if (layer.ambient?.kind === 'sway') {
      const pivot = layer.ambient.pivot ?? 'bottom';
      wrapper.pivot.set(
        layer.size.width / 2,
        pivot === 'bottom' ? layer.size.height : layer.size.height / 2,
      );
      wrapper.x = layer.position.x + layer.size.width / 2;
      wrapper.y =
        layer.position.y + (pivot === 'bottom' ? layer.size.height : layer.size.height / 2);
    } else {
      wrapper.x = layer.position.x;
      wrapper.y = layer.position.y;
    }

    const target = this.layers.get(layer.layer);
    target?.addChild(wrapper);

    const record: Placed = {
      node: wrapper,
      parallax: layer.parallax,
      ambient: layer.ambient,
      baseX: wrapper.x,
      baseY: wrapper.y,
      // Offsetting by id keeps a row of trees from swaying in lockstep.
      phase: hashPhase(layer.id),
      width: layer.size.width,
      height: layer.size.height,
    };

    if (layer.ambient?.kind === 'smoke' || layer.ambient?.kind === 'passing') {
      const extras = new Container();
      target?.addChild(extras);
      record.extras = extras;
      record.nextEventAt = 0;
    }

    this.placed.push(record);
  }

  private addInteractable(item: Interactable) {
    const texture = this.textureFor(item.asset);
    this.checkFit(item.asset, texture, item.size.width, item.size.height);
    const wrapper = new Container();
    wrapper.label = item.id;

    // A slow ring behind the object — the world's way of saying "over here".
    if (item.attention) {
      // Must be wider than the thing it sits behind, or the object hides it.
      const base =
        item.hit.shape === 'circle' ? item.hit.radius : item.size.width / 2;
      const ring = new Graphics().circle(0, 0, base * 1.45).fill({
        color: 0xf78a77,
        alpha: 0.35,
      });
      wrapper.addChild(ring);
      this.attentionRings.push({ node: ring, phase: hashPhase(item.id) });
    }

    const visual = texture
      ? new Sprite(texture)
      : this.placeholder(
          item.size.width,
          item.size.height,
          item.placeholderColor ?? 0xffcf76,
          item.placeholderLabel ?? item.label,
        );
    if (texture) {
      (visual as Sprite).width = item.size.width;
      (visual as Sprite).height = item.size.height;
    }
    // Anchor on the object's centre so x/y matches the hit area.
    visual.x = -item.size.width / 2;
    visual.y = -item.size.height / 2;
    wrapper.addChild(visual);

    wrapper.x = item.x;
    wrapper.y = item.y;
    if (item.dimmed) wrapper.alpha = 0.45;

    const layerName = item.layer ?? 'interactive';
    this.layers.get(layerName)?.addChild(wrapper);

    this.placed.push({
      node: wrapper,
      parallax: item.parallax ?? 1,
      ambient: item.ambient,
      baseX: wrapper.x,
      baseY: wrapper.y,
      phase: hashPhase(item.id),
      width: item.size.width,
      height: item.size.height,
    });

    this.interactables.push({ config: item, parallax: item.parallax ?? 1 });
  }

  /* -------------------------------------------------------------- frame */

  update(camera: Camera, deltaMs: number) {
    this.elapsed += deltaMs;

    for (const name of LAYER_ORDER) {
      const container = this.layers.get(name);
      if (container) container.position.set(0, 0);
    }

    for (const item of this.placed) {
      this.applyAmbient(item, deltaMs);
      // Parallax is applied per object rather than per layer, so a foreground
      // branch and a foreground flower can move at genuinely different rates.
      const anchored = camera.toScreen(item.baseX, item.baseY, item.parallax);
      item.node.x = anchored.x + (item.node.x - item.baseX);
      item.node.y = anchored.y + (item.node.y - item.baseY);
      item.node.scale.set(camera.zoom * (item.node.scale.x < 0 ? -1 : 1));
    }

    // Attention rings breathe rather than blink — an invitation, not an alarm.
    if (!this.reducedMotion) {
      for (const ring of this.attentionRings) {
        const t = this.elapsed / 1000 + ring.phase;
        const p = (Math.sin((t * Math.PI * 2) / 2.6) + 1) / 2;
        ring.node.scale.set(1 + p * 0.28);
        ring.node.alpha = 0.42 - p * 0.3;
      }
    }
  }

  private applyAmbient(item: Placed, deltaMs: number) {
    if (!item.ambient) {
      item.node.x = item.baseX;
      item.node.y = item.baseY;
      return;
    }
    if (this.reducedMotion) {
      item.node.x = item.baseX;
      item.node.y = item.baseY;
      item.node.rotation = 0;
      return;
    }

    const t = this.elapsed / 1000 + item.phase;
    const a = item.ambient;

    // Reset to base; each ambient kind re-applies its own offset.
    item.node.x = item.baseX;
    item.node.y = item.baseY;

    switch (a.kind) {
      case 'drift': {
        const span = this.scene.world.width + item.width;
        let x = item.baseX + ((this.elapsed / 1000) * a.speed + item.phase * span);
        if (a.wrap !== false) {
          x = ((x + item.width) % span) - item.width;
        }
        item.node.x = x;
        break;
      }
      case 'sway':
        item.node.rotation =
          Math.sin((t * Math.PI * 2) / a.period) * (a.degrees * Math.PI) / 180;
        break;
      case 'bob':
        item.node.y = item.baseY + Math.sin((t * Math.PI * 2) / a.period) * a.distance;
        break;
      case 'pulse':
        item.node.alpha =
          a.min + ((Math.sin((t * Math.PI * 2) / a.period) + 1) / 2) * (a.max - a.min);
        break;
      case 'smoke':
        this.updateSmoke(item, a, deltaMs);
        break;
      case 'passing':
        this.updatePassing(item, a, deltaMs);
        break;
    }
  }

  private updateSmoke(
    item: Placed,
    spec: Extract<AmbientSpec, { kind: 'smoke' }>,
    deltaMs: number,
  ) {
    const extras = item.extras;
    if (!extras) return;

    item.nextEventAt = (item.nextEventAt ?? 0) - deltaMs;
    if (item.nextEventAt <= 0) {
      item.nextEventAt = 1000 / Math.max(0.1, spec.rate);
      const puff = new Graphics().circle(0, 0, 6 + Math.random() * 5).fill({
        color: 0xffffff,
        alpha: 0.5,
      });
      puff.x = item.baseX + (Math.random() - 0.5) * spec.spread;
      puff.y = item.baseY;
      extras.addChild(puff);
    }

    for (const puff of [...extras.children]) {
      puff.y -= (spec.rise * deltaMs) / 1000;
      puff.alpha -= deltaMs / 4000;
      puff.scale.set(puff.scale.x + deltaMs / 9000);
      if (puff.alpha <= 0) {
        extras.removeChild(puff);
        puff.destroy();
      }
    }
  }

  private updatePassing(
    item: Placed,
    spec: Extract<AmbientSpec, { kind: 'passing' }>,
    deltaMs: number,
  ) {
    const extras = item.extras;
    if (!extras) return;

    item.nextEventAt = (item.nextEventAt ?? 0) - deltaMs;
    if (item.nextEventAt <= 0) {
      const [lo, hi] = spec.everyMs;
      item.nextEventAt = lo + Math.random() * (hi - lo);

      // A small flock, so one bird never looks like a bug.
      const flock = new Container();
      for (let i = 0; i < 3; i += 1) {
        const bird = new Graphics()
          .moveTo(-7, 0)
          .quadraticCurveTo(0, -5, 7, 0)
          .stroke({ color: 0x5b5148, width: 2, alpha: 0.7 });
        bird.x = i * 18;
        bird.y = i % 2 === 0 ? 0 : -9;
        flock.addChild(bird);
      }
      flock.y = item.baseY;
      (flock as Container & { _t?: number })._t = 0;
      extras.addChild(flock);
    }

    const width = this.scene.world.width;
    for (const flock of [...extras.children] as (Container & { _t?: number })[]) {
      flock._t = (flock._t ?? 0) + deltaMs / spec.durationMs;
      const p = flock._t;
      flock.x =
        spec.from === 'left' ? -80 + p * (width + 160) : width + 80 - p * (width + 160);
      // A shallow arc reads as flight rather than a slide.
      flock.y = item.baseY - Math.sin(p * Math.PI) * 40;
      if (p >= 1) {
        extras.removeChild(flock);
        flock.destroy({ children: true });
      }
    }
  }

  /* --------------------------------------------------------- hit testing */

  /** Returns the id of the topmost interactable under a screen point. */
  hitTest(camera: Camera, screenX: number, screenY: number): string | null {
    // Reverse so things drawn on top win.
    for (let i = this.interactables.length - 1; i >= 0; i -= 1) {
      const entry = this.interactables[i]!;
      const world = camera.toWorld(screenX, screenY, entry.parallax);
      const dx = world.x - entry.config.x;
      const dy = world.y - entry.config.y;
      const hit = entry.config.hit;

      if (hit.shape === 'circle') {
        if (dx * dx + dy * dy <= hit.radius * hit.radius) return entry.config.id;
      } else if (
        Math.abs(dx) <= hit.width / 2 &&
        Math.abs(dy) <= hit.height / 2
      ) {
        return entry.config.id;
      }
    }
    return null;
  }

  /** Screen positions of every interactable, for DOM overlays and a11y. */
  overlayPositions(camera: Camera) {
    return this.interactables.map((entry) => ({
      id: entry.config.id,
      label: entry.config.label ?? entry.config.id,
      ...camera.toScreen(entry.config.x, entry.config.y, entry.parallax),
    }));
  }

  setReducedMotion(reduced: boolean) {
    this.reducedMotion = reduced;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}

/** Stable 0..1 from an id, so phases are varied but reproducible. */
function hashPhase(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return (hash % 1000) / 1000;
}
