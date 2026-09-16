import { motion, useReducedMotion } from 'framer-motion';
import type { Interest } from '../data/interests';
import { TONES } from './tones';

interface InterestChipProps {
  interest: Interest;
  selected: boolean;
  onToggle: (id: string) => void;
  /** Staggers the entrance so the grid assembles rather than snapping in. */
  index?: number;
}

/**
 * A big illustrated thing-you-like.
 *
 * Sized so a small hand cannot miss it, and selected state is shown by scale,
 * fill and a tick — three signals, because a six-year-old should not have to
 * detect a subtle border change.
 */
export function InterestChip({
  interest,
  selected,
  onToggle,
  index = 0,
}: InterestChipProps) {
  const reduced = useReducedMotion();
  const t = TONES[interest.tone];

  return (
    <motion.button
      onClick={() => onToggle(interest.id)}
      aria-pressed={selected}
      className={`relative flex min-h-[8.5rem] flex-col items-center justify-center gap-2
        rounded-lg px-3 py-5 font-display font-semibold shadow-soft
        ${selected ? `${t.solid} shadow-lifted` : `${t.soft} text-ink`}`}
      initial={reduced ? false : { opacity: 0, y: 18, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: selected ? 1.04 : 1 }}
      transition={{
        delay: reduced ? 0 : index * 0.035,
        type: 'spring',
        stiffness: 420,
        damping: 26,
      }}
      whileTap={reduced ? undefined : { scale: 0.95 }}
    >
      <span className="text-[2.75rem] leading-none" aria-hidden>
        {interest.emoji}
      </span>
      <span className="text-body leading-tight">{interest.label}</span>

      {selected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 18 }}
          className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center
            rounded-full bg-snow text-lead shadow-soft"
          aria-hidden
        >
          ✓
        </motion.span>
      )}
    </motion.button>
  );
}
