import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

interface ScreenProps {
  children: ReactNode;
  /** Sits behind the content — hills, sky, aurora. */
  backdrop?: ReactNode;
  /** Fixed chrome that should not scroll, e.g. a back button. */
  overlay?: ReactNode;
  /** `narrow` for reading and forms, `wide` for the world and dashboards. */
  width?: 'narrow' | 'wide' | 'full';
  /** Vertically centre the content — right for single-question screens. */
  center?: boolean;
  /**
   * Lock the screen to exactly one viewport and let a `flex-1` child shrink to
   * fit. The world screen needs this: with `min-h-screen` the page simply grows
   * and pushes Lumi's speech bubble — the one primary action — below the fold.
   */
  fit?: boolean;
  className?: string;
  background?: string;
}

/**
 * The page shell every screen sits in.
 *
 * Tablet-first: the comfortable case is a ~1024px iPad in landscape, and the
 * same layout compresses to a phone and caps out on desktop rather than
 * stretching into a dashboard.
 */
export function Screen({
  children,
  backdrop,
  overlay,
  width = 'narrow',
  center = false,
  fit = false,
  className = '',
  background = 'bg-cream',
}: ScreenProps) {
  const reduced = useReducedMotion();

  const maxWidth =
    width === 'narrow'
      ? 'max-w-3xl'
      : width === 'wide'
        ? 'max-w-6xl'
        : 'max-w-none';

  return (
    <div className={`relative min-h-full w-full overflow-hidden ${background}`}>
      {backdrop}

      <motion.main
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={`relative z-10 mx-auto flex w-full flex-col
          ${fit ? 'h-[100dvh] max-h-[100dvh] overflow-hidden pb-5' : 'min-h-screen pb-10'}
          ${maxWidth} px-5 pt-6 sm:px-8 md:px-10
          ${center ? 'justify-center' : ''} ${className}`}
      >
        {children}
      </motion.main>

      {overlay}
    </div>
  );
}
