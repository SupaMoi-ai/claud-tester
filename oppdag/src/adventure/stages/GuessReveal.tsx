import { AnimatePresence, motion } from 'framer-motion';
import { ChoiceButton } from '../../design/ChoiceButton';
import { PrimaryButton } from '../../design/PrimaryButton';
import type { GuessRevealStage } from '../types';
import { useCopy } from '../../i18n';

interface Props {
  stage: GuessRevealStage;
  guessed: string | null;
  onGuess: (id: string) => void;
  onContinue: () => void;
}

/**
 * A guess with no wrong answer.
 *
 * This is the shape Lumi's "Hmm… hva tror DU?" takes in the interface. The
 * child commits to a belief first — including "aner ikke, gjetter!" — and only
 * then gets the explanation. Committing before finding out is what makes the
 * answer stick; being wrong here costs nothing at all.
 */
export function GuessReveal({ stage, guessed, onGuess, onContinue }: Props) {
  const copy = useCopy();

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {stage.options.map((option) => (
          <ChoiceButton
            key={option.id}
            tone="butter"
            display={option.emoji}
            status={guessed === option.id ? 'chosen' : 'idle'}
            disabled={guessed !== null}
            onClick={() => onGuess(option.id)}
          >
            {option.label}
          </ChoiceButton>
        ))}
      </div>

      <AnimatePresence>
        {guessed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 26, delay: 0.35 }}
            className="mt-6 rounded-lg bg-snow p-6 shadow-lifted md:p-7"
          >
            <div className="flex items-start gap-4">
              <motion.span
                className="flex h-16 w-16 shrink-0 items-center justify-center
                  rounded-full bg-moss-soft text-[2rem]"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 14, delay: 0.5 }}
                aria-hidden
              >
                {stage.revealEmoji}
              </motion.span>
              <div className="min-w-0">
                <h3 className="text-lead leading-snug text-ink md:text-title">
                  {stage.revealTitle}
                </h3>
                <p className="mt-3 text-read leading-relaxed text-ink-soft">
                  {stage.revealBody}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <PrimaryButton onClick={onContinue} tone="moss" size="md">
                {copy.adventure.continue}
              </PrimaryButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
