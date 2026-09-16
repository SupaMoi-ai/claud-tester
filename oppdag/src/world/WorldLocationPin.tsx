import { motion, useReducedMotion } from 'framer-motion';
import { TONES } from '../design/tones';
import type { WorldLocation } from './worldLayout';

interface Props {
  location: WorldLocation;
  unlocked: boolean;
  /** Something is waiting here — pulses gently to invite a tap. */
  hasAdventure?: boolean;
  onClick: (location: WorldLocation) => void;
  index?: number;
}

/**
 * A place on the island.
 *
 * Locked places are drawn as soft, fogged and still-inviting — a "her har jeg
 * ikke vært ennå" rather than a disabled control. Nothing in this world is
 * greyed out with a padlock.
 */
export function WorldLocationPin({
  location,
  unlocked,
  hasAdventure = false,
  onClick,
  index = 0,
}: Props) {
  const reduced = useReducedMotion();
  const t = TONES[location.tone];

  return (
    <motion.button
      onClick={() => onClick(location)}
      aria-label={location.name}
      className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1.5"
      style={{ left: `${(location.x / 1000) * 100}%`, top: `${(location.y / 640) * 100}%` }}
      initial={reduced ? false : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.15 + index * 0.07, type: 'spring', stiffness: 300, damping: 20 }}
      whileTap={reduced ? undefined : { scale: 0.92 }}
      whileHover={reduced ? undefined : { scale: 1.06 }}
    >
      <motion.span
        className={`relative flex h-16 w-16 items-center justify-center rounded-full
          text-[1.9rem] shadow-lifted sm:h-[4.5rem] sm:w-[4.5rem] sm:text-[2.2rem]
          ${unlocked ? t.solid : 'bg-snow/55 backdrop-blur-[2px]'}`}
        animate={
          reduced
            ? undefined
            : { y: [0, -7, 0] }
        }
        transition={{
          duration: 7 + index * 0.9,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: index * 0.5,
        }}
      >
        <span className={unlocked ? '' : 'opacity-40 grayscale'} aria-hidden>
          {location.emoji}
        </span>

        {/* Something to do here */}
        {unlocked && hasAdventure && (
          <>
            <motion.span
              className="absolute inset-0 rounded-full bg-coral/40"
              animate={reduced ? undefined : { scale: [1, 1.45], opacity: [0.6, 0] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
            />
            <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center
              rounded-full bg-coral text-nano font-bold text-snow shadow-soft">
              !
            </span>
          </>
        )}
      </motion.span>

      <span
        className={`rounded-full px-3 py-1 font-display text-nano font-semibold shadow-soft
          sm:text-label ${
            unlocked ? 'bg-snow/92 text-ink' : 'bg-snow/60 text-ink-faint'
          }`}
      >
        {location.name}
      </span>
    </motion.button>
  );
}
