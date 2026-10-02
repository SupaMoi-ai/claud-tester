import { useCallback, useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { WorldCanvas } from '../world/engine/WorldCanvas';
import { bryggaScene, BRYGGA_ANCHORS } from '../world/scenes/brygga.scene';
import type { WorldApi, WorldTap } from '../world/engine/types';
import { ChapterHud } from '../world/ChapterHud';
import { DialogueTray } from '../world/DialogueTray';
import { BasketTask } from '../world/BasketTask';
import {
  CLEARING,
  chapterTask,
  gradeOf,
  type ChapterTask,
  COUNT_WORDS,
  FAREWELL,
  INTRO,
  KEEPSAKES,
  REMINDER,
  SHELL_IDS,
  THANKS,
  type Beat,
  type MillaPortrait,
} from '../world/scenes/brygga.chapter';
import { useActions, useGame } from '../state/store';
import { emptyMomentum, pickDifficulty } from '../learning/adaptive';
import { readMastery } from '../learning/masteryEngine';
import type { StageOutcome } from '../learning/types';

/**
 * The harbour, and the first chapter played in it.
 *
 * The screen owns the chapter's state and the world's imperative handle;
 * everything it says lives in `brygga.chapter.ts` and everything it draws
 * lives in `brygga.scene.ts`. What is left here is the joining: which tap
 * means what, at which point in the story.
 *
 * Portrait by construction: the specification's play area is 360 x 640 logical
 * units, so the canvas is held to 9:16 and centred, with the surplus filled by
 * the same cream the interface uses.
 */

/** What each object answers with when it is only scenery. */
const LABELS: Record<string, string> = Object.fromEntries(
  (bryggaScene.interactables ?? [])
    .filter((i) => i.label)
    .map((i) => [i.id, i.label as string]),
);

const PORTRAIT: Record<MillaPortrait, string> = {
  calm: 'assets/characters/milla/portrait-calm.png',
  talk: 'assets/characters/milla/portrait-talk.png',
  pleased: 'assets/characters/milla/portrait-pleased.png',
};

/** Where the chapter has got to. It only ever moves forwards. */
type Phase = 'arrival' | 'asked' | 'thanking' | 'task' | 'open';

/** Close enough to the meadow to count as leaving by it. */
const EXIT_RADIUS = 40;

export function Brygga() {
  const navigate = useNavigate();
  const actions = useActions();
  const { profile, mastery } = useGame();
  const worldRef = useRef<WorldApi | null>(null);

  const [phase, setPhase] = useState<Phase>('arrival');
  const [collected, setCollected] = useState<string[]>([]);
  const [script, setScript] = useState<Beat[] | null>(null);
  const [beat, setBeat] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [task, setTask] = useState<ChapterTask | null>(null);

  /** Phase and tally are read inside world callbacks that outlive a render. */
  const phaseRef = useRef<Phase>('arrival');
  const collectedRef = useRef<string[]>([]);
  const toastTimer = useRef<number | null>(null);

  const say = useCallback((text: string, ms = 2200) => {
    setToast(text);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), ms);
  }, []);

  const open = useCallback((beats: Beat[]) => {
    setScript(beats);
    setBeat(0);
  }, []);

  const to = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  /* ------------------------------------------------------------- beats */

  /** Milla has asked for the shells: light them up and leave her be. */
  const beginSearch = useCallback(() => {
    const api = worldRef.current;
    to('asked');
    api?.updateInteractable('milla', { attention: false });
    for (const id of SHELL_IDS) api?.updateInteractable(id, { attention: true });
  }, [to]);

  /** The third shell is in the basket. */
  const finishSearch = useCallback(() => {
    const api = worldRef.current;
    to('thanking');
    api?.updateInteractable('basket', {
      asset: 'assets/worlds/brygga/props/basket-full.png',
    });
    actions.earnKeepsake(KEEPSAKES.shells);
    open(THANKS);
  }, [actions, open, to]);

  /**
   * Milla clears the path.
   *
   * She is drawn at the twigs rather than walked there: she has three painted
   * poses and no walk cycle, and sliding a standing gull up the beach would
   * look worse than a cut. The twigs go a beat later so the child sees her
   * arrive, then sees the path open — two events, not one.
   */
  const clearThePath = useCallback(() => {
    const api = worldRef.current;
    api?.updateInteractable('milla', { visible: false });
    api?.updateInteractable('milla-at-twigs', { visible: true });
    api?.focusOn(BRYGGA_ANCHORS.closedPath.x, BRYGGA_ANCHORS.closedPath.y);

    window.setTimeout(() => {
      worldRef.current?.updateInteractable('twigs', { visible: false });
      to('open');
      say('Stien nordover er åpen.', 2600);
    }, 1100);
  }, [say, to]);

  /**
   * Milla's question at the basket.
   *
   * Chosen when it opens, never re-picked: changing the numbers mid-question
   * would swap the basket under the child's feet. The level comes from the
   * player's school year and from what the learning engine already knows
   * about them, not from Ellie — she is the demo child, the game is for 5 to 9.
   */
  const openTask = useCallback(() => {
    to('task');
    const known = readMastery(mastery, profile?.id ?? 'anon', 'ganging-enkel');
    setTask(
      chapterTask(
        gradeOf(profile),
        pickDifficulty(emptyMomentum(), known),
        known.attempts === 0,
      ),
    );
  }, [mastery, profile, to]);

  const solved = useCallback(
    (outcome: StageOutcome) => actions.recordOutcome('brygga', outcome),
    [actions],
  );

  const afterTask = useCallback(() => {
    setTask(null);
    open(CLEARING);
  }, [open]);

  const advance = useCallback(() => {
    const beats = script;
    if (!beats) return;
    const next = beat + 1;
    if (next < beats.length) {
      setBeat(next);
      return;
    }

    setScript(null);
    setBeat(0);
    if (beats === INTRO) beginSearch();
    if (beats === THANKS) openTask();
    if (beats === CLEARING) clearThePath();
  }, [beat, beginSearch, clearThePath, openTask, script]);

  /* -------------------------------------------------------------- taps */

  const collect = useCallback(
    (id: string) => {
      if (collectedRef.current.includes(id)) return;
      const next = [...collectedRef.current, id];
      collectedRef.current = next;
      setCollected(next);
      worldRef.current?.updateInteractable(id, { visible: false });
      say(COUNT_WORDS[next.length - 1] ?? 'Et skjell');
      if (next.length === SHELL_IDS.length) {
        window.setTimeout(finishSearch, 900);
      }
    },
    [finishSearch, say],
  );

  const handleTap = useCallback(
    (tap: WorldTap) => {
      const api = worldRef.current;
      if (!api) return;
      // A tap during dialogue or the question belongs to the panel above.
      if (script || task) return;

      if (tap.id === 'milla' || tap.id === 'milla-at-twigs') {
        const beats =
          phaseRef.current === 'arrival'
            ? INTRO
            : phaseRef.current === 'asked'
              ? REMINDER
              : FAREWELL;
        if (phaseRef.current === 'arrival') {
          api.walkTo(
            'ellie',
            BRYGGA_ANCHORS.millaApproach.x,
            BRYGGA_ANCHORS.millaApproach.y,
            () => open(beats),
          );
        } else {
          open(beats);
        }
        return;
      }

      if (SHELL_IDS.includes(tap.id as (typeof SHELL_IDS)[number])) {
        if (phaseRef.current !== 'asked') {
          say('Et skjell.');
          return;
        }
        const shell = bryggaScene.interactables.find((i) => i.id === tap.id);
        if (!shell) return;
        // Walk to it first. Collecting from across the harbour would teach the
        // child that the picking up is a menu action rather than a journey.
        api.walkTo('ellie', shell.x, shell.y + 12, () => collect(shell.id));
        return;
      }

      if (tap.id === 'kiki' || tap.id === 'ellie') {
        say(tap.id === 'kiki' ? 'Kiki ser opp på deg.' : 'Hvor skal vi gå?');
        return;
      }

      // Everything else names itself. The chapter's own responses replace this
      // where it has one, but saying nothing reads as a broken tap.
      const object = tap.id ? LABELS[tap.id] : undefined;
      if (object) {
        say(object);
        return;
      }

      if (!tap.walkable) {
        // Section 2.2 is explicit: never steer the child into water.
        say('Vi kan gå her.', 1800);
        return;
      }

      api.walkTo('ellie', tap.worldX, tap.worldY, () => {
        const dx = tap.worldX - BRYGGA_ANCHORS.meadowExit.x;
        const dy = tap.worldY - BRYGGA_ANCHORS.meadowExit.y;
        if (phaseRef.current !== 'open') return;
        if (Math.hypot(dx, dy) > EXIT_RADIUS) return;
        actions.earnKeepsake(KEEPSAKES.milla);
        say('Ha det, Milla!', 1600);
        window.setTimeout(() => navigate('/kart'), 1400);
      });
    },
    [actions, collect, navigate, open, say, script, task],
  );

  const handleReady = useCallback(
    (api: WorldApi) => {
      worldRef.current = api;
      api.followActor('ellie');
      // One quiet nudge toward the only thing on the beach that wants
      // something. Without it the harbour is beautiful and mute, and a child
      // who does not think to tap the gull never finds the chapter at all.
      window.setTimeout(() => {
        if (phaseRef.current === 'arrival') say('Måken ser ut som hun leter etter noe.', 3200);
      }, 1400);
    },
    [say],
  );

  const current = script?.[beat];

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-cream">
      <div
        className="relative h-full w-full overflow-hidden bg-cream"
        style={{ aspectRatio: '9 / 16', maxHeight: '100dvh', maxWidth: '100vw' }}
      >
        <WorldCanvas scene={bryggaScene} onTap={handleTap} onReady={handleReady} />

        <ChapterHud total={SHELL_IDS.length} done={collected.length} />

        <AnimatePresence>
          {current && (
            <DialogueTray
              key={`${phase}-${beat}`}
              portrait={PORTRAIT[current.portrait]}
              name="Milla"
              line={current.line}
              last={beat === (script?.length ?? 0) - 1}
              onAdvance={advance}
            />
          )}
        </AnimatePresence>

        {task && !current && (
          <BasketTask
            task={task}
            portraits={{ talk: PORTRAIT.talk, pleased: PORTRAIT.pleased }}
            onSolved={solved}
            onDone={afterTask}
          />
        )}

        {toast && !current && !task && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto w-full max-w-xs px-4">
            <p className="rounded-lg bg-snow px-4 py-3 text-center font-display text-body font-semibold text-ink shadow-lifted">
              {toast}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
