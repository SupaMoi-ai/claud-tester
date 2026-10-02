import { useCallback, useRef, useState } from 'react';
import { WorldCanvas } from '../world/engine/WorldCanvas';
import { bryggaScene } from '../world/scenes/brygga.scene';
import type { WorldApi, WorldTap } from '../world/engine/types';

/**
 * The harbour, on its own.
 *
 * The chapter's interface — dialogue, the counting activity, the journal — is
 * not here yet. This screen exists so the scene can be walked and looked at
 * against the painted plate before any of that is built on top of it, because
 * a walkable area that disagrees with the picture is the one defect no test
 * catches and every child notices.
 *
 * Portrait by construction: the specification's play area is 360 x 640 logical
 * units, so the canvas is held to 9:16 and centred, with the surplus filled by
 * the same cream the interface uses.
 */
export function Brygga() {
  const worldRef = useRef<WorldApi | null>(null);
  const [where, setWhere] = useState<string | null>(null);

  const handleTap = useCallback((tap: WorldTap) => {
    const api = worldRef.current;
    if (!api) return;

    if (tap.id === 'kiki' || tap.id === 'ellie') {
      setWhere(tap.id === 'kiki' ? 'Kiki ser opp på deg.' : 'Hvor skal vi gå?');
      window.setTimeout(() => setWhere(null), 2400);
      return;
    }

    if (!tap.walkable) {
      // Section 2.2 is explicit: never steer the child into water.
      setWhere('Vi kan gå her.');
      window.setTimeout(() => setWhere(null), 1800);
      return;
    }

    api.walkTo('ellie', tap.worldX, tap.worldY);
  }, []);

  const handleReady = useCallback((api: WorldApi) => {
    worldRef.current = api;
    api.followActor('ellie');
  }, []);

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-cream">
      <div
        className="relative h-full w-full overflow-hidden bg-cream"
        style={{ aspectRatio: '9 / 16', maxHeight: '100dvh', maxWidth: '100vw' }}
      >
        <WorldCanvas scene={bryggaScene} onTap={handleTap} onReady={handleReady} />

        {where && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto w-full max-w-xs px-4">
            <p className="rounded-lg bg-snow/95 px-4 py-3 text-center font-display text-body font-semibold text-ink shadow-lifted">
              {where}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
