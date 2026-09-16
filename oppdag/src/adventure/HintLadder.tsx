import { AnimatePresence, motion } from 'framer-motion';
import type { SupportLevel } from '../learning/types';
import type { Hint } from './types';
import { Character } from '../characters/Character';
import { VisualHintView } from './VisualHintView';
import { hasMoreSupport } from '../learning/adaptive';
import { useCopy } from '../i18n';

interface Props {
  hints: [Hint, Hint, Hint];
  support: SupportLevel;
  onAskForMore: () => void;
  /** Hidden once the child has got there. */
  visible: boolean;
}

/**
 * TRY → HINT → VISUAL HINT → GUIDED SOLUTION.
 *
 * The child pulls each rung; nothing is ever pushed at them, and the answer is
 * never revealed automatically after N failures. Even the final rung explains
 * the reasoning rather than just stating the number.
 */
export function HintLadder({ hints, support, onAskForMore, visible }: Props) {
  const copy = useCopy();
  if (!visible) return null;

  const shown: Hint[] =
    support === 'hint'
      ? [hints[0]]
      : support === 'visual'
        ? [hints[0], hints[1]]
        : support === 'guided'
          ? [hints[0], hints[1], hints[2]]
          : [];

  const label =
    support === 'none'
      ? copy.adventure.helpMe
      : support === 'hint'
        ? copy.adventure.hintAgain
        : copy.adventure.showMe;

  return (
    <div className="mt-5">
      <AnimatePresence initial={false}>
        {shown.map((hint, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="mb-3 flex items-start gap-3 rounded-lg bg-lavender-soft/70 px-4 py-4">
              <Character who="lumi" mood="thinking" size={56} breathing={false} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-body leading-relaxed text-ink">{hint.text}</p>
                {hint.visual && (
                  <div className="mt-3">
                    <VisualHintView hint={hint.visual} />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {hasMoreSupport(support) && (
        <button
          onClick={onAskForMore}
          className="min-h-[3.25rem] rounded-lg bg-lavender-soft px-6 font-display
            text-body font-semibold text-lavender-deep shadow-soft
            transition-transform active:scale-95"
        >
          {label}
        </button>
      )}
    </div>
  );
}
