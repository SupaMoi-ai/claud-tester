import { motion } from 'framer-motion';
import { ChoiceButton, type ChoiceStatus } from '../../design/ChoiceButton';
import type { ReadingStage } from '../types';
import type { SupportLevel } from '../../learning/types';

interface Props {
  stage: ReadingStage;
  support: SupportLevel;
  statusFor: (key: string) => ChoiceStatus;
  disabled: boolean;
  onChoose: (key: string) => void;
}

/**
 * Find the important thing in a short text.
 *
 * Drawn as a real note pinned to a door — not a comprehension exercise. Set at
 * a generous reading size with wide line height, because the hard part should
 * be the thinking, not the decoding.
 *
 * Once the child has pulled the visual rung of the hint ladder the key
 * sentence is highlighted in place, in the text itself, rather than repeated
 * somewhere else.
 */
export function Reading({ stage, support, statusFor, disabled, onChoose }: Props) {
  const highlight =
    support === 'visual' || support === 'guided'
      ? stage.hints[1].visual?.kind === 'highlight'
        ? stage.hints[1].visual.sentence
        : null
      : null;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, rotate: -1.5, y: 12 }}
        animate={{ opacity: 1, rotate: -0.8, y: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 24 }}
        className="relative rounded-lg bg-snow px-6 py-7 shadow-lifted md:px-8"
      >
        {/* Tape, so it reads as a physical note */}
        <span
          className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-[-3deg]
            rounded-sm bg-butter/70"
          aria-hidden
        />
        <p className="text-read leading-loose text-ink">
          {highlight ? <Highlighted body={stage.body} sentence={highlight} /> : stage.body}
        </p>
        <p className="mt-5 text-right font-display text-label font-semibold text-ink-faint">
          — {stage.from}
        </p>
      </motion.div>

      {/* The question lives in Lumi's bubble above; repeating it here would
          just push the answers off a tablet screen. */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {stage.options.map((option) => (
          <ChoiceButton
            key={option.id}
            tone="butter"
            display={option.emoji}
            status={statusFor(option.id)}
            disabled={disabled}
            onClick={() => onChoose(option.id)}
          >
            {option.label}
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
}

/** Splits the body so the key sentence can be marked in place. */
function Highlighted({ body, sentence }: { body: string; sentence: string }) {
  const at = body.indexOf(sentence);
  if (at === -1) return <>{body}</>;

  return (
    <>
      {body.slice(0, at)}
      <motion.mark
        initial={{ backgroundColor: 'rgba(255,207,118,0)' }}
        animate={{ backgroundColor: 'rgba(255,207,118,1)' }}
        transition={{ duration: 0.6 }}
        className="rounded px-1 text-ink"
      >
        {sentence}
      </motion.mark>
      {body.slice(at + sentence.length)}
    </>
  );
}
