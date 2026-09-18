import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../design/Screen';
import { PrimaryButton } from '../design/PrimaryButton';
import { SoftCard } from '../design/SoftCard';
import { Character } from '../characters/Character';
import { WorldCanvas } from '../world/engine/WorldCanvas';
import { buildLaereoyaScene } from '../world/scenes/laereoya.scene';
import { UnlockModal } from '../adventure/UnlockModal';
import { LOCATIONS, LOCATIONS_BY_ID, type WorldLocation } from '../world/worldLayout';
import { adventuresAt, ADVENTURES } from '../data/adventures';
import { useActions, useGame } from '../state/store';
import { useCopy } from '../i18n';

/**
 * The world. The product's home screen and its most important surface.
 *
 * Not a menu: an illustrated island the child can look at and immediately want
 * to touch. Chrome is kept to two small corner buttons; everything else is
 * world. Lumi stands at the bottom and suggests exactly one thing to do, so
 * there is never a question of what the primary action is.
 */
export function Home() {
  const copy = useCopy();
  const navigate = useNavigate();
  const { profile, unlocked, pendingUnlocks, adventures } = useGame();
  const actions = useActions();
  const [peek, setPeek] = useState<WorldLocation | null>(null);
  /** A one-line reaction when a character is tapped. */
  const [aside, setAside] = useState<string | null>(null);

  /** The one adventure Lumi is nudging towards right now. */
  const suggestion =
    ADVENTURES.find((a) => !adventures[a.id]?.completedAt) ?? null;

  const activeLocations = suggestion ? [suggestion.locationId] : [];

  /** The scene as this child currently sees it. Rebuilt only when it changes. */
  const scene = useMemo(
    () => buildLaereoyaScene(unlocked, activeLocations),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unlocked.join('|'), activeLocations.join('|')],
  );

  const openLocation = (location: WorldLocation) => {
    const here = adventuresAt(location.id);
    const open = unlocked.includes(location.id);
    if (open && here.length > 0) {
      navigate(`/eventyr/${here[0]!.id}`);
      return;
    }
    setPeek(location);
    window.setTimeout(() => setPeek(null), 3400);
  };

  /**
   * The world reports an id and nothing else. Deciding what that id *means*
   * stays here, in React, next to the game state — the renderer never knows
   * what an adventure is.
   */
  const handleTap = (id: string) => {
    if (id.startsWith('character:')) {
      setAside(
        id === 'character:companion'
          ? copy.world.companionAside
          : copy.world.guideAside,
      );
      window.setTimeout(() => setAside(null), 3000);
      return;
    }
    const location = LOCATIONS_BY_ID[id as keyof typeof LOCATIONS_BY_ID];
    if (location) openLocation(location);
  };

  const openCount = LOCATIONS.filter((l) => unlocked.includes(l.id)).length;

  return (
    <Screen width="wide" background="bg-cream" fit>
      {/* ---- corner chrome ------------------------------------------- */}
      <div className="flex items-start justify-between">
        <button
          onClick={() => navigate('/meg')}
          className="flex items-center gap-3 rounded-full bg-snow/85 py-2 pl-2 pr-5 shadow-soft"
          aria-label={copy.world.profileLabel}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-butter-soft text-lead">
            <span aria-hidden>🙂</span>
          </span>
          <span className="font-display text-body font-semibold text-ink">
            {profile?.name}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/oppdagelser')}
            className="flex h-12 items-center gap-2 rounded-full bg-snow/85 px-4 shadow-soft"
            aria-label={copy.world.discoveriesLabel}
          >
            <span aria-hidden>🔎</span>
            <span className="hidden font-display text-label font-semibold text-ink sm:inline">
              {copy.world.discoveriesLabel}
            </span>
          </button>
          <button
            onClick={() => navigate('/port')}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-snow/85 shadow-soft"
            aria-label={copy.world.parentLabel}
          >
            <span aria-hidden>🔒</span>
          </button>
        </div>
      </div>

      {/* ---- the island ---------------------------------------------- */}
      <div className="relative mt-4 min-h-0 flex-1 overflow-hidden rounded-xl">
        <WorldCanvas scene={scene} onTap={handleTap} />

        {/* Lumi's aside when a character is tapped */}
        <AnimatePresence>
          {aside && (
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-full max-w-md px-4"
            >
              <div className="rounded-lg bg-snow/95 px-5 py-4 text-center shadow-lifted">
                <p className="font-display text-body font-semibold text-ink">{aside}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* …and when a closed place is tapped */}
        <AnimatePresence>
          {peek && (
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              className="pointer-events-none absolute inset-x-0 bottom-3 mx-auto w-full max-w-md px-4"
            >
              <div className="rounded-lg bg-snow/95 px-5 py-4 text-center shadow-lifted">
                <p className="font-display text-body font-semibold text-ink">
                  {peek.teaser}
                </p>
                <p className="mt-1 text-label text-ink-faint">
                  {copy.world.lockedHint}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ---- Lumi + the one obvious action --------------------------- */}
      <div className="mt-3">
        {/* Stacks on a phone: side by side, six lines of Lumi wrap into a
            column barely wider than the button. */}
        <SoftCard
          padding="sm"
          className="flex flex-col items-center gap-3 sm:flex-row sm:gap-5"
        >
          <div className="flex w-full items-center gap-3 sm:w-auto sm:flex-1">
            <Character who="lumi" mood="curious" size={96} className="shrink-0" />

            <div className="min-w-0 flex-1">
              <p className="font-display text-body font-semibold leading-snug text-ink sm:text-lead">
                {suggestion
                  ? copy.world.lumiInvite
                  : copy.world.lumiCaughtUp(profile?.name ?? '')}
              </p>
              <p className="mt-1 text-label text-ink-faint">
                {copy.profile.worldCount(openCount, LOCATIONS.length)}
              </p>
            </div>
          </div>

          <PrimaryButton
            onClick={() =>
              suggestion
                ? navigate(`/eventyr/${suggestion.id}`)
                : navigate('/oppdagelser')
            }
            tone="coral"
            size="md"
            full
            className="shrink-0 sm:w-auto"
          >
            {suggestion ? copy.common.yes : copy.discoveries.title}
          </PrimaryButton>
        </SoftCard>
      </div>

      <AnimatePresence>
        {pendingUnlocks.length > 0 && (
          <UnlockModal ids={pendingUnlocks} onClose={actions.consumeAllUnlocks} />
        )}
      </AnimatePresence>
    </Screen>
  );
}
