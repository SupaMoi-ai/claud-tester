import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { TONES, type Tone } from './tones';

interface SoftCardProps {
  children: ReactNode;
  tone?: Tone;
  /** `snow` for content, a tone for something the eye should land on. */
  surface?: 'snow' | 'tone' | 'sand';
  onClick?: () => void;
  className?: string;
  /** Adds the paper-grain overlay. */
  grain?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

/**
 * The container everything sits in. Rounded to the point of being a pebble —
 * per the brief, almost nothing in this product has a sharp corner.
 */
export function SoftCard({
  children,
  tone = 'butter',
  surface = 'snow',
  onClick,
  className = '',
  grain = false,
  padding = 'md',
}: SoftCardProps) {
  const reduced = useReducedMotion();
  const interactive = Boolean(onClick);

  const bg =
    surface === 'snow'
      ? 'bg-snow'
      : surface === 'sand'
        ? 'bg-sand'
        : TONES[tone].soft;

  const pad =
    padding === 'lg' ? 'p-8 md:p-10' : padding === 'sm' ? 'p-4' : 'p-6 md:p-7';

  const Comp = interactive ? motion.button : motion.div;

  return (
    <Comp
      onClick={onClick}
      className={`relative rounded-lg ${bg} ${pad} shadow-soft ${
        grain ? 'grain' : ''
      } ${interactive ? 'text-left w-full' : ''} ${className}`}
      whileTap={interactive && !reduced ? { scale: 0.98 } : undefined}
      whileHover={interactive && !reduced ? { y: -3, boxShadow: 'var(--shadow-lifted)' } : undefined}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
    >
      {children}
    </Comp>
  );
}
