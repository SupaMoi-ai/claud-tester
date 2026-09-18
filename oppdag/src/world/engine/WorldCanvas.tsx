import { useEffect, useRef, useState } from 'react';
import { Application } from 'pixi.js';
import { SceneRenderer } from './SceneRenderer';
import { Camera } from './Camera';
import type { SceneConfig, WorldEvents } from './types';

interface Props extends WorldEvents {
  scene: SceneConfig;
  className?: string;
  /** Rendered above the canvas — speech bubbles, chrome, the usual React UI. */
  children?: React.ReactNode;
}

/** A finger that moves less than this is a tap, not a drag. */
const TAP_SLOP = 10;
const TAP_MS = 600;
/** Retina looks better; 3x on a phone is a texture-memory bonfire. */
const MAX_RESOLUTION = 2;

/**
 * The world, as a canvas.
 *
 * This is the only place in the app that knows Pixi exists. It owns the
 * Application, the camera and the renderer, and it publishes two things
 * upward: taps (by id) and a frame-rate sample. Everything else — what a
 * location means, whether it is unlocked, what Lumi says about it — stays in
 * React and the existing game state.
 *
 * Accessibility: a canvas is a blank wall to a screen reader, so every
 * interactable is mirrored as a real, focusable DOM button positioned over it.
 * They are transparent but not hidden, which keeps keyboard and assistive-tech
 * navigation working without touching the rendering path.
 *
 * Failure is loud on purpose. An earlier version of this component rendered a
 * silent blank rectangle when initialisation went wrong, which is the single
 * most expensive kind of bug to have in a visual system — everything else in
 * the app looked perfect. It now reports what happened, on screen and on
 * `window.__oppdagWorld` for the QA harness.
 */
export function WorldCanvas({
  scene,
  className = '',
  children,
  onTap,
  onReady,
  onFps,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  const [overlays, setOverlays] = useState<
    { id: string; label: string; x: number; y: number }[]
  >([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    let disposed = false;
    let app: Application | null = null;
    let cleanupPointer: (() => void) | undefined;
    let cleanupResize: (() => void) | undefined;

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const diag = (patch: Record<string, unknown>) => {
      const w = window as unknown as Record<string, unknown>;
      w.__oppdagWorld = { ...((w.__oppdagWorld as object) ?? {}), ...patch };
    };

    diag({ phase: 'starting', scene: scene.id, error: null });

    /**
     * Flex layout can report a zero-height box on the frame the effect runs.
     * Initialising at 0×0 produces a canvas that never recovers, so wait for a
     * real measurement before touching Pixi.
     */
    const measure = async (): Promise<{ width: number; height: number }> => {
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const rect = host.getBoundingClientRect();
        if (rect.width >= 1 && rect.height >= 1) {
          return {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          };
        }
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
      return { width: 0, height: 0 };
    };

    /** Keep the CSS size authoritative; Pixi's autoDensity fights Tailwind. */
    const styleCanvas = (width: number, height: number) => {
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    (async () => {
      try {
        const { width, height } = await measure();
        diag({ phase: 'measured', hostWidth: width, hostHeight: height });

        if (disposed) return;
        if (width === 0 || height === 0) {
          throw new Error('world container never got a size');
        }

        const application = new Application();
        await application.init({
          canvas,
          width,
          height,
          background: scene.background,
          // The artwork is pre-rendered painted texture; there are no hard
          // vector edges for MSAA to help with, and in software rasterisation
          // it is pure cost.
          antialias: false,
          resolution: Math.min(window.devicePixelRatio || 1, MAX_RESOLUTION),
          autoDensity: true,
          powerPreference: 'high-performance',
        });

        // React 19 StrictMode mounts effects twice; bail out of the losing run.
        if (disposed) {
          application.destroy(true, { children: true });
          return;
        }
        app = application;
        styleCanvas(width, height);
        diag({
          phase: 'initialised',
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          cssWidth: canvas.style.width,
          cssHeight: canvas.style.height,
        });

        const camera = new Camera({ viewWidth: width, viewHeight: height, scene });
        const renderer = new SceneRenderer(scene, reducedMotion);

        await renderer.build(application);
        if (disposed) {
          application.destroy(true, { children: true });
          return;
        }
        application.stage.addChild(renderer.root);
        diag({
          phase: 'built',
          stageChildren: application.stage.children.length,
          rootChildren: renderer.root.children.length,
        });

        /* -------------------------------------------------------- input */
        let pointerDownAt = 0;
        let pointerStart = { x: 0, y: 0 };
        let moved = 0;

        const local = (e: PointerEvent) => {
          const r = canvas.getBoundingClientRect();
          return { x: e.clientX - r.left, y: e.clientY - r.top };
        };

        const onPointerDown = (e: PointerEvent) => {
          const p = local(e);
          pointerDownAt = performance.now();
          pointerStart = p;
          moved = 0;
          camera.beginDrag(p.x, p.y);
          canvas.setPointerCapture?.(e.pointerId);
        };

        const onPointerMove = (e: PointerEvent) => {
          if (!camera.isDragging) return;
          const p = local(e);
          moved = Math.max(
            moved,
            Math.hypot(p.x - pointerStart.x, p.y - pointerStart.y),
          );
          camera.moveDrag(p.x, p.y);
        };

        const onPointerUp = (e: PointerEvent) => {
          const p = local(e);
          const wasTap =
            moved < TAP_SLOP && performance.now() - pointerDownAt < TAP_MS;
          camera.endDrag();
          canvas.releasePointerCapture?.(e.pointerId);
          if (wasTap) {
            const hit = renderer.hitTest(camera, p.x, p.y);
            if (hit) onTapRef.current?.(hit);
          }
        };

        canvas.addEventListener('pointerdown', onPointerDown);
        canvas.addEventListener('pointermove', onPointerMove);
        canvas.addEventListener('pointerup', onPointerUp);
        canvas.addEventListener('pointercancel', onPointerUp);
        cleanupPointer = () => {
          canvas.removeEventListener('pointerdown', onPointerDown);
          canvas.removeEventListener('pointermove', onPointerMove);
          canvas.removeEventListener('pointerup', onPointerUp);
          canvas.removeEventListener('pointercancel', onPointerUp);
        };

        /* ------------------------------------------------------- resize */
        const observer = new ResizeObserver(() => {
          const r = host.getBoundingClientRect();
          const w = Math.max(1, Math.round(r.width));
          const h = Math.max(1, Math.round(r.height));
          application.renderer.resize(w, h);
          styleCanvas(w, h);
          camera.resize(w, h);
        });
        observer.observe(host);
        cleanupResize = () => observer.disconnect();

        /* -------------------------------------------------------- frame */
        let fpsAccum = 0;
        let fpsFrames = 0;
        let overlayAccum = 0;

        application.ticker.add((ticker) => {
          const deltaMs = ticker.deltaMS;
          camera.update();
          renderer.update(camera, deltaMs);

          fpsAccum += deltaMs;
          fpsFrames += 1;
          if (fpsAccum >= 1000) {
            onFps?.(Math.round((fpsFrames * 1000) / fpsAccum));
            fpsAccum = 0;
            fpsFrames = 0;
          }

          // Accessibility overlays follow the camera, but at 10Hz — they are
          // for assistive tech, not for animation.
          overlayAccum += deltaMs;
          if (overlayAccum >= 100) {
            overlayAccum = 0;
            setOverlays(renderer.overlayPositions(camera));
          }
        });

        diag({ phase: 'ready' });
        setReady(true);
        onReady?.();
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        diag({ phase: 'failed', error: message });
        if (!disposed) setError(message);
      }
    })();

    return () => {
      disposed = true;
      cleanupPointer?.();
      cleanupResize?.();
      app?.destroy(true, { children: true, texture: false });
      app = null;
    };
    // Rebuilding on a new scene is intended; the config object is memoised.
  }, [scene, onReady, onFps]);

  return (
    <div ref={hostRef} className={`relative h-full w-full overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 block touch-none"
        aria-hidden
      />

      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <p className="max-w-sm rounded-lg bg-coral-soft px-5 py-4 text-center text-body text-coral-deep">
            Verdenen klarte ikke å laste. ({error})
          </p>
        </div>
      )}

      {/* Real buttons over the canvas: invisible, but focusable and announced. */}
      <div className="absolute inset-0" role="group" aria-label="Læreøya">
        {ready &&
          overlays.map((item) => (
            <button
              key={item.id}
              onClick={() => onTapRef.current?.(item.id)}
              aria-label={item.label}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full
                opacity-0 focus-visible:opacity-100"
              style={{ left: item.x, top: item.y, width: 88, height: 88 }}
              tabIndex={0}
            />
          ))}
      </div>

      {children}
    </div>
  );
}
