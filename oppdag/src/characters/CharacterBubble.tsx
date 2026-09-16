import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Character, type Mood, type Who } from './Character';

interface CharacterBubbleProps {
  who: Who;
  children: ReactNode;
  mood?: Mood;
  size?: number;
  /** Which side the character stands on. */
  side?: 'left' | 'right';
  /** Anything that should sit under the speech, e.g. the answer buttons. */
  footer?: ReactNode;
  /** Changing this replays the bubble's entrance — use the line's id. */
  speechKey?: string | number;
  className?: string;
  compact?: boolean;
}

/**
 * A character saying something.
 *
 * This is the product's main narrative device, so it is a real component and
 * not a layout that gets re-invented per screen: the character is always
 * prominent, the bubble always has the same tail, and new lines always arrive
 * with the same small spring.
 */
export function CharacterBubble({
  who,
  children,
  mood = 'idle',
  size = 150,
  side = 'left',
  footer,
  speechKey,
  className = '',
  compact = false,
}: CharacterBubbleProps) {
  const reduced = useReducedMotion();

  return (
    <div
      className={`flex items-end gap-2 sm:gap-4 ${
        side === 'right' ? 'flex-row-reverse' : ''
      } ${className}`}
    >
      <Character
        who={who}
        mood={mood}
        size={size}
        flip={side === 'right'}
        className="shrink-0"
      />

      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={speechKey ?? 'speech'}
            initial={reduced ? false : { opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className={`relative rounded-lg bg-snow shadow-lifted
              ${compact ? 'px-5 py-4' : 'px-6 py-5 md:px-8 md:py-6'}`}
          >
            {/* Tail — a plain triangle, matched to the bubble's corner radius */}
            <span
              aria-hidden
              className={`absolute bottom-6 h-0 w-0 border-y-[11px] border-y-transparent
                ${
                  side === 'right'
                    ? '-right-[13px] border-l-[14px] border-l-snow'
                    : '-left-[13px] border-r-[14px] border-r-snow'
                }`}
            />
            <div className="font-display text-lead font-semibold leading-snug text-ink md:text-title">
              {children}
            </div>
            {footer && <div className="mt-5">{footer}</div>}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
