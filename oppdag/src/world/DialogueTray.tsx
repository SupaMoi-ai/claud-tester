import { motion } from 'framer-motion';

/**
 * Someone talking to the child.
 *
 * Specification section 5.6: a portrait on the left at 80 logical units, the
 * line beside it, and the whole tray advances on a tap anywhere. No reply
 * buttons, no branching, no typing — the child listens and taps on, which is
 * the only conversation pattern that works before fluent reading.
 *
 * The portraits are painted as busts with a flat bottom edge, because that is
 * what a dialogue portrait is. Drawn loose on a card, a flat-bottomed bird
 * looks severed; clipped by a frame it sits in, with its base flush against
 * the frame's base, it reads as a portrait. Hence `overflow-hidden` and
 * `items-end` — both are load-bearing, not decoration.
 */

interface Props {
  /** Already-resolved image path, so the tray knows nothing about any cast. */
  portrait: string;
  /** Who is speaking. Shown, and announced. */
  name: string;
  line: string;
  /** Tap anywhere to advance. */
  onAdvance: () => void;
  /** Last line of the exchange — changes the hint, not the behaviour. */
  last?: boolean;
}

export function DialogueTray({ portrait, name, line, onAdvance, last }: Props) {
  return (
    // The world owns the pointer underneath; only the tray itself takes taps.
    // Same rule as the HUD, and the same bug if it is dropped.
    <div className="pointer-events-none absolute inset-x-0 bottom-0 p-3">
      <motion.button
        type="button"
        onClick={onAdvance}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        aria-label={`${name} sier: ${line}. Trykk for å fortsette.`}
        // Opaque, not translucent: the jetty's planks read straight through a
        // 95% panel and a child sounding out a word does not need the scenery
        // behind the letters.
        className="pointer-events-auto flex w-full items-stretch gap-3 rounded-2xl
          bg-snow p-3 text-left shadow-lifted"
      >
        <div
          className="flex h-20 w-20 shrink-0 items-end justify-center
            overflow-hidden rounded-xl bg-sky-soft"
        >
          {/* Fills the frame and is anchored to its base, so the flat cut at
            * the bottom of the bust lands on the frame's edge where it reads
            * as a crop rather than as a cut. */}
          <img
            src={portrait}
            alt=""
            aria-hidden
            className="h-full w-full object-cover object-bottom"
          />
        </div>

        <span className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="font-display text-label font-semibold uppercase tracking-wide text-moss-deep">
            {name}
          </span>
          <span className="font-display text-body font-semibold leading-snug text-ink">
            {line}
          </span>
          <span className="pt-1 text-nano text-ink-faint">
            {last ? 'Trykk for å lukke' : 'Trykk for mer'}
          </span>
        </span>
      </motion.button>
    </div>
  );
}
