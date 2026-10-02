import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { TONES, type Tone } from './tones';

export type ChoiceStatus = 'idle' | 'chosen' | 'right' | 'close';

interface ChoiceButtonProps {
  children: ReactNode;
  onClick: () => void;
  tone?: Tone;
  status?: ChoiceStatus;
  disabled?: boolean;
  /** A big number or emoji shown above the label. */
  display?: ReactNode;
  className?: string;
}

/**
 * An answer option.
 *
 * Note what the states are called: `right` and `close`. There is no "wrong"
 * anywhere in this product — a near miss is drawn as a warm nudge, never a red
 * cross, so trying again costs the child nothing emotionally.
 */
export function ChoiceButton({
  children,
  onClick,
  tone = 'sky',
  status = 'idle',
  disabled = false,
  display,
  className = '',
}: ChoiceButtonProps) {
  const reduced = useReducedMotion();
  const t = TONES[tone];

  const look =
    status === 'right'
      ? 'bg-moss text-ink ring-4 ring-moss-deep/35'
      : status === 'close'
        ? 'bg-butter-soft text-ink ring-4 ring-butter/70'
        : status === 'chosen'
          ? `${t.solid} ring-4 ring-ink/10`
          : `${t.soft} text-ink`;

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex min-h-[var(--tap)] flex-col items-center justify-center
        gap-1 rounded-lg px-6 py-5 font-display font-semibold shadow-soft
        transition-colors disabled:cursor-not-allowed ${look} ${className}`}
      whileTap={disabled || reduced ? undefined : { scale: 0.95 }}
      whileHover={disabled || reduced ? undefined : { y: -3 }}
      animate={
        status === 'close' && !reduced
          ? { x: [0, -7, 7, -4, 0] }
          : status === 'right' && !reduced
            ? { scale: [1, 1.07, 1] }
            : {}
      }
      transition={{ type: 'spring', stiffness: 480, damping: 24 }}
    >
      {display !== undefined && (
        <span className="text-huge leading-none">{display}</span>
      )}
      <span className={display !== undefined ? 'text-body' : 'text-lead'}>
        {children}
      </span>
    </motion.button>
  );
}
