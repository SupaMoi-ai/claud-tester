import { motion, useReducedMotion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';

interface FloatingObjectProps {
  children: ReactNode;
  /** Seconds for one full float. Slow is the point — 6–14s reads as calm. */
  duration?: number;
  /** Offsets the loop so a group of objects never bobs in unison. */
  delay?: number;
  /** Vertical travel in px. */
  distance?: number;
  /** Degrees of sway. */
  rotate?: number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Ambient motion.
 *
 * Wraps anything that should drift rather than sit: clouds, location pins,
 * snowflakes, the boat in the harbour. Everything stops dead under
 * prefers-reduced-motion.
 */
export function FloatingObject({
  children,
  duration = 9,
  delay = 0,
  distance = 10,
  rotate = 0,
  className = '',
  style,
}: FloatingObjectProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      style={style}
      animate={{
        y: [0, -distance, 0],
        rotate: rotate ? [0, rotate, 0, -rotate, 0] : 0,
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {children}
    </motion.div>
  );
}
