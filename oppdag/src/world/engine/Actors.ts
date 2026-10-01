import { Container, Sprite, Texture } from 'pixi.js';
import type { ActorSpec, Facing } from './types';

/**
 * Characters that walk around the scene.
 *
 * Each actor owns four drawings — front, back and a side view that gets
 * mirrored — and picks one from the direction it is travelling. That is the
 * whole animation system for now, and it is worth being clear about why:
 * the delivered character sheets specify lovely walk and run cycles, but lay
 * them out at roughly 32 px per frame, too small to cut into sprites. So
 * walking is conveyed by gait rather than by frames — a bob, a slight lean
 * and a small squash, timed to a stride. It reads convincingly at world scale
 * and is honest placeholder work: when the cycles are exported individually,
 * `setFrames` is where they go and nothing else changes.
 */

const STRIDE_HZ = 2.6;

export class Actor {
  readonly id: string;
  readonly spec: ActorSpec;
  readonly node = new Container();

  /** Current position, at the character's feet. */
  x: number;
  y: number;

  private sprite: Sprite;
  private textures: Partial<Record<'front' | 'back' | 'side' | 'rest', Texture>>;
  private facing: Facing = 'front';
  private walkPhase = 0;
  private moving = false;
  private resting = false;

  /** Where it is heading; null when it has arrived. */
  private target: { x: number; y: number } | null = null;
  private onArrive: (() => void) | null = null;

  constructor(
    spec: ActorSpec,
    textures: Partial<Record<'front' | 'back' | 'side' | 'rest', Texture>>,
  ) {
    this.id = spec.id;
    this.spec = spec;
    this.textures = textures;
    this.x = spec.x;
    this.y = spec.y;

    this.sprite = new Sprite(textures.front ?? Texture.EMPTY);
    // Anchored at the feet so the character stands on the ground and sorts
    // against scenery by the point they are actually standing on.
    this.sprite.anchor.set(0.5, 1);
    this.applyTexture('front');
    this.node.addChild(this.sprite);
    this.node.label = spec.id;
  }

  private applyTexture(key: 'front' | 'back' | 'side' | 'rest') {
    const texture = this.textures[key] ?? this.textures.front;
    if (!texture) return;
    this.sprite.texture = texture;
    const aspect = texture.width / texture.height;
    this.sprite.height = this.spec.height;
    this.sprite.width = this.spec.height * aspect;
  }

  /** Send the actor walking to a world point. */
  walkTo(x: number, y: number, onArrive?: () => void) {
    this.target = { x, y };
    this.onArrive = onArrive ?? null;
    this.resting = false;
  }

  stop() {
    this.target = null;
    this.onArrive = null;
  }

  /** Sit down — used by the companion when it has nothing to follow. */
  rest(on: boolean) {
    this.resting = on && Boolean(this.textures.rest);
  }

  get isMoving() {
    return this.moving;
  }

  teleport(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.target = null;
  }

  update(deltaMs: number) {
    const dt = deltaMs / 1000;
    this.moving = false;

    if (this.target) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const distance = Math.hypot(dx, dy);
      const step = this.spec.speed * dt;

      if (distance <= step) {
        this.x = this.target.x;
        this.y = this.target.y;
        this.target = null;
        const arrived = this.onArrive;
        this.onArrive = null;
        arrived?.();
      } else {
        this.x += (dx / distance) * step;
        this.y += (dy / distance) * step;
        this.moving = true;

        // Face the dominant axis of travel. Vertical wins ties so walking
        // away reads as walking away rather than sliding sideways.
        if (Math.abs(dx) > Math.abs(dy) * 1.2) {
          this.facing = dx > 0 ? 'right' : 'left';
        } else {
          this.facing = dy > 0 ? 'front' : 'back';
        }
      }
    }

    const key: 'front' | 'back' | 'side' | 'rest' =
      this.resting && !this.moving
        ? 'rest'
        : this.facing === 'front'
          ? 'front'
          : this.facing === 'back'
            ? 'back'
            : 'side';
    this.applyTexture(key);
    this.sprite.scale.x =
      Math.abs(this.sprite.scale.x) * (this.facing === 'left' ? -1 : 1);

    /* ---- gait ---------------------------------------------------------- */
    if (this.moving) {
      this.walkPhase += dt * STRIDE_HZ * Math.PI * 2;
      const bob = Math.abs(Math.sin(this.walkPhase));
      this.sprite.y = -bob * this.spec.height * 0.035;
      this.sprite.rotation = Math.sin(this.walkPhase * 0.5) * 0.028;
      // Squash on footfall, stretch at the top of the bob.
      this.sprite.scale.y = Math.abs(this.sprite.scale.y) * (1 + (0.5 - bob) * 0.02);
    } else {
      // Settle, then breathe.
      this.walkPhase = 0;
      this.sprite.rotation *= 0.85;
      this.sprite.y *= 0.85;
      const breath = Math.sin(performance.now() / 1400) * 0.006;
      this.applyTexture(key);
      this.sprite.scale.y *= 1 + breath;
      this.sprite.scale.x =
        Math.abs(this.sprite.scale.x) * (this.facing === 'left' ? -1 : 1);
    }
  }

  /** True when a world point lands on this character. */
  hit(worldX: number, worldY: number) {
    const dx = worldX - this.x;
    // Test against the body's middle rather than the feet.
    const dy = worldY - (this.y - this.spec.height * 0.45);
    return Math.hypot(dx, dy) <= this.spec.tapRadius;
  }
}

/**
 * Keeps a companion trailing its leader.
 *
 * The staging rule from the art bible, expressed as behaviour: the companion
 * sits slightly behind and below, and when it is not following it sits down
 * and looks up rather than standing to attention.
 */
export function followLeader(
  companion: Actor,
  leader: Actor,
  offset = { x: -46, y: 16 },
) {
  const goalX = leader.x + (leader.isMoving ? offset.x : offset.x * 0.8);
  const goalY = leader.y + offset.y;
  const distance = Math.hypot(companion.x - goalX, companion.y - goalY);

  // A dead zone stops the companion jittering when the leader is standing
  // still, which otherwise looks like a nervous animal rather than a calm one.
  if (distance > 26) {
    companion.walkTo(goalX, goalY);
    companion.rest(false);
  } else if (!leader.isMoving) {
    companion.stop();
    companion.rest(true);
  }
}
