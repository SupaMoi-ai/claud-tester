import { useState } from 'react';
import { motion } from 'framer-motion';
import { NumberChoice } from '../adventure/stages/NumberChoice';
import { HintLadder } from '../adventure/HintLadder';
import { nextSupport } from '../learning/adaptive';
import type { StageOutcome, SupportLevel } from '../learning/types';
import type { ChoiceStatus } from '../design/ChoiceButton';
import type { ChapterTask } from './scenes/brygga.chapter';

/**
 * Milla's question, over the harbour.
 *
 * The same loop the adventures run — TRY, then hints the child pulls for,
 * then the answer — built from the adventures' own parts: `NumberChoice` for
 * the cards and `HintLadder` for the help. What it does not borrow is the
 * adventure engine's full-screen layout, because the harbour should stay in
 * view behind the question: the basket being asked about is right there.
 *
 * No failure state. A wrong card shakes gently and returns; the child keeps
 * trying, and help is always one tap away but never pushed at them.
 */

interface Props {
  task: ChapterTask;
  /** Milla's portraits, resolved by the screen. */
  portraits: { talk: string; pleased: string };
  /** Fires once, on the right answer, with the outcome to record. */
  onSolved: (outcome: StageOutcome) => void;
  /** After the praise, when the child taps on. */
  onDone: () => void;
}

export function BasketTask({ task, portraits, onSolved, onDone }: Props) {
  const { stage, difficulty, praise } = task;
  const variant = stage.variants[difficulty];

  const [attempts, setAttempts] = useState(1);
  const [support, setSupport] = useState<SupportLevel>('none');
  const [chosen, setChosen] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  const right = String(variant.answer);

  const choose = (key: string) => {
    if (settled) return;
    setChosen(key);
    if (key === right) {
      setSettled(true);
      onSolved({
        conceptId: stage.conceptId,
        correct: true,
        attempts,
        support,
        difficulty,
        at: Date.now(),
      });
      return;
    }
    setAttempts((a) => a + 1);
    window.setTimeout(() => setChosen(null), 750);
  };

  const statusFor = (key: string): ChoiceStatus => {
    if (chosen !== key) return 'idle';
    return key === right ? 'right' : 'close';
  };

  return (
    // Same rule as every overlay over the world: the wrapper takes no taps.
    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
      <motion.section
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
        aria-label="Milla spør"
        data-task={stage.id}
        className="pointer-events-auto max-h-[78dvh] overflow-y-auto rounded-2xl bg-snow p-4 shadow-lifted"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-16 w-16 shrink-0 items-end overflow-hidden rounded-xl bg-sky-soft">
            <img
              src={settled ? portraits.pleased : portraits.talk}
              alt=""
              aria-hidden
              className="h-full w-full object-cover object-bottom"
            />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-label font-semibold uppercase tracking-wide text-moss-deep">
              Milla
            </p>
            <p className="font-display text-body font-semibold leading-snug text-ink" role="status">
              {settled ? praise : variant.prompt}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <NumberChoice
            stage={stage}
            difficulty={difficulty}
            statusFor={statusFor}
            disabled={settled}
            onChoose={choose}
          />
        </div>

        <HintLadder
          hints={stage.hints}
          support={support}
          onAskForMore={() => setSupport(nextSupport(support))}
          visible={!settled}
          helper={
            <img
              src="assets/characters/kiki/pose-tilt.png"
              alt=""
              aria-hidden
              className="h-14 w-14 shrink-0 object-contain"
            />
          }
        />

        {settled && (
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onDone}
            className="mt-4 min-h-[3.25rem] w-full rounded-lg bg-coral px-6 font-display
              text-body font-semibold text-ink shadow-soft active:scale-95"
          >
            Videre
          </motion.button>
        )}
      </motion.section>
    </div>
  );
}
