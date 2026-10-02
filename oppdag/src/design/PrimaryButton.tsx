import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { TONES, type Tone } from './tones';

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  tone?: Tone;
  /** `solid` is the one obvious action; `quiet` is everything else. */
  variant?: 'solid' | 'quiet' | 'ghost';
  size?: 'md' | 'lg';
  disabled?: boolean;
  full?: boolean;
  icon?: ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  'aria-label'?: string;
}

/**
 * The product's one button.
 *
 * Big, rounded, and physical — it presses down under a finger and springs back.
 * Minimum height is 64px (`--tap`) because the youngest user is six.
 */
export function PrimaryButton({
  children,
  onClick,
  tone = 'coral',
  variant = 'solid',
  size = 'lg',
  disabled = false,
  full = false,
  icon,
  className = '',
  type = 'button',
  'aria-label': ariaLabel,
}: PrimaryButtonProps) {
  const reduced = useReducedMotion();
  const t = TONES[tone];

  const base =
    'relative inline-flex items-center justify-center gap-3 font-display font-semibold ' +
    'rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  const sizing =
    size === 'lg'
      ? 'min-h-[var(--tap)] px-9 text-lead'
      : 'min-h-[3.25rem] px-6 text-body';

  const look =
    variant === 'solid'
      ? `${t.solid} shadow-lifted`
      : variant === 'quiet'
        ? `${t.soft} text-ink shadow-soft`
        : 'text-ink-soft hover:text-ink';

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${base} ${sizing} ${look} ${full ? 'w-full' : ''} ${className}`}
      whileTap={disabled || reduced ? undefined : { scale: 0.955, y: 2 }}
      whileHover={disabled || reduced ? undefined : { y: -2 }}
      transition={{ type: 'spring', stiffness: 520, damping: 26 }}
    >
      {icon}
      <span>{children}</span>
    </motion.button>
  );
}
