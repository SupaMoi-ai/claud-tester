import type { Container } from 'pixi.js';
import type { SceneConfig } from './types';

/**
 * Camera.
 *
 * Drag to pan, with momentum and a hard clamp so the child can never fling the
 * island off-screen and find themselves staring at empty blue. Zoom exists but
 * is deliberately conservative — a 7-year-old pinching by accident should not
 * be able to get lost.
 *
 * This deliberately does not use pixi-viewport's full plugin stack: we need
 * parallax, which means layers move at *different* rates than the camera, and
 * that is easier to reason about when the camera is just a position we apply
 * ourselves each frame.
 */

export interface CameraOptions {
  viewWidth: number;
  viewHeight: number;
  scene: SceneConfig;
}

const FRICTION = 0.92;
/** Below this, momentum has visually stopped. */
const STOP_THRESHOLD = 0.05;
/** How hard the camera is pulled back when dragged past the edge. */
const RUBBER_BAND = 0.35;

export class Camera {
  /** Camera position in world coordinates — the point at the view's centre. */
  x: number;
  y: number;
  zoom = 1;

  private vx = 0;
  private vy = 0;
  private dragging = false;
  private lastPointer: { x: number; y: number } | null = null;

  private viewWidth: number;
  private viewHeight: number;
  private scene: SceneConfig;

  /** Set while easing to a target; cleared on any user drag. */
  private target: { x: number; y: number; ease: number } | null = null;

  constructor({ viewWidth, viewHeight, scene }: CameraOptions) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.scene = scene;
    this.x = scene.camera.start.x;
    this.y = scene.camera.start.y;
    this.clamp();
  }

  resize(viewWidth: number, viewHeight: number) {
    this.viewWidth = viewWidth;
    this.viewHeight = viewHeight;
    this.clamp();
  }

  /* ----------------------------------------------------------- dragging */

  beginDrag(x: number, y: number) {
    this.dragging = true;
    this.lastPointer = { x, y };
    this.vx = 0;
    this.vy = 0;
    this.target = null; // a user drag always wins over an in-flight ease
  }

  moveDrag(x: number, y: number) {
    if (!this.dragging || !this.lastPointer) return;
    const dx = (x - this.lastPointer.x) / this.zoom;
    const dy = (y - this.lastPointer.y) / this.zoom;
    // Dragging right moves the camera left — the world follows the finger.
    this.x -= dx;
    this.y -= dy;
    this.vx = -dx;
    this.vy = -dy;
    this.lastPointer = { x, y };
  }

  endDrag() {
    this.dragging = false;
    this.lastPointer = null;
  }

  get isDragging() {
    return this.dragging;
  }

  /** Smoothly bring a world point to the centre — used by story beats. */
  easeTo(x: number, y: number, ease = 0.06) {
    this.target = { x, y, ease };
    this.vx = 0;
    this.vy = 0;
  }

  /* ------------------------------------------------------------- update */

  update() {
    if (this.target) {
      this.x += (this.target.x - this.x) * this.target.ease;
      this.y += (this.target.y - this.y) * this.target.ease;
      if (
        Math.abs(this.target.x - this.x) < 0.5 &&
        Math.abs(this.target.y - this.y) < 0.5
      ) {
        this.x = this.target.x;
        this.y = this.target.y;
        this.target = null;
      }
    } else if (!this.dragging) {
      // Momentum
      if (Math.abs(this.vx) > STOP_THRESHOLD || Math.abs(this.vy) > STOP_THRESHOLD) {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= FRICTION;
        this.vy *= FRICTION;
      } else {
        this.vx = 0;
        this.vy = 0;
      }
    }

    this.clamp();
  }

  /**
   * Keep the view inside the world. When the world is smaller than the view on
   * an axis, centre it rather than letting it drift.
   */
  private clamp() {
    const halfW = this.viewWidth / (2 * this.zoom);
    const halfH = this.viewHeight / (2 * this.zoom);
    const { width, height } = this.scene.world;

    if (width <= halfW * 2) {
      this.x = width / 2;
    } else {
      const min = halfW;
      const max = width - halfW;
      if (this.x < min) {
        // Rubber-band while dragging, snap hard once released.
        this.x = this.dragging ? this.x + (min - this.x) * RUBBER_BAND : min;
      } else if (this.x > max) {
        this.x = this.dragging ? this.x + (max - this.x) * RUBBER_BAND : max;
      }
    }

    if (height <= halfH * 2) {
      this.y = height / 2;
    } else {
      const min = halfH;
      const max = height - halfH;
      if (this.y < min) {
        this.y = this.dragging ? this.y + (min - this.y) * RUBBER_BAND : min;
      } else if (this.y > max) {
        this.y = this.dragging ? this.y + (max - this.y) * RUBBER_BAND : max;
      }
    }
  }

  /**
   * Position a layer container for this frame.
   *
   * parallax 0 pins the layer to the view (sky), 1 moves it exactly with the
   * world, >1 makes it rush past in front. The scene's centre is the anchor so
   * that a parallax layer stays registered with the world at the start point.
   */
  applyTo(container: Container, parallax: number) {
    const cx = this.viewWidth / 2;
    const cy = this.viewHeight / 2;
    container.x = cx - this.x * parallax * this.zoom;
    container.y = cy - this.y * parallax * this.zoom;
    container.scale.set(this.zoom);
  }

  /** Screen point → world point, for hit-testing at a given parallax. */
  toWorld(screenX: number, screenY: number, parallax = 1) {
    const cx = this.viewWidth / 2;
    const cy = this.viewHeight / 2;
    return {
      x: (screenX - cx) / this.zoom + this.x * parallax,
      y: (screenY - cy) / this.zoom + this.y * parallax,
    };
  }

  /** World point → screen point, for placing DOM overlays over world objects. */
  toScreen(worldX: number, worldY: number, parallax = 1) {
    const cx = this.viewWidth / 2;
    const cy = this.viewHeight / 2;
    return {
      x: (worldX - this.x * parallax) * this.zoom + cx,
      y: (worldY - this.y * parallax) * this.zoom + cy,
    };
  }
}
