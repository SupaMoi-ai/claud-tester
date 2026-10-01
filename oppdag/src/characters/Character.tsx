import { motion, useReducedMotion } from 'framer-motion';
import { Bolt } from './Bolt';
import { Birk } from './Birk';
import { Otto } from './Otto';
import type { Mood } from './Face';

export type Who = 'kiki' | 'bolt' | 'birk' | 'otto';
export type { Mood };

/**
 * The single entry point for drawing a character.
 *
 * Every call site uses `<Character who=… mood=… />` and nothing else, which is
 * what made swapping Lumi out for Kiki a change to this file rather than to
 * every screen.
 *
 * Two kinds of character live behind the same prop: Kiki is real artwork and
 * renders as an image; the others are still placeholder SVG and render through
 * `RENDERERS`. Call sites cannot tell the difference, which is the point.
 */
const ART: Partial<Record<Who, Record<Mood, string>>> = {
  // Kiki has poses rather than expressions, so moods map onto the pose that
  // carries that feeling. A cat says most of it with her tail and her ears.
  kiki: {
    idle: 'assets/characters/kiki/front34.webp',
    curious: 'assets/characters/kiki/front34.webp',
    happy: 'assets/characters/kiki/pose-hale-opp.webp',
    excited: 'assets/characters/kiki/pose-hale-opp.webp',
    thinking: 'assets/characters/kiki/pose-sittende.webp',
  },
};

const RENDERERS: Partial<Record<Who, (p: { mood?: Mood }) => React.ReactElement>> = {
  bolt: Bolt,
  birk: Birk,
  otto: Otto,
};

export const CHARACTER_NAMES: Record<Who, string> = {
  kiki: 'Kiki',
  bolt: 'Bolt',
  birk: 'Birk',
  otto: 'Otto',
};

interface CharacterProps {
  who: Who;
  mood?: Mood;
  /** Rendered width in px. The slot is square; artwork is letterboxed into it. */
  size?: number;
  /** Gentle idle breathing. On by default — it is what makes them feel alive. */
  breathing?: boolean;
  /** Mirror horizontally, e.g. when a character faces the other way. */
  flip?: boolean;
  className?: string;
}

export function Character({
  who,
  mood = 'idle',
  size = 160,
  breathing = true,
  flip = false,
  className = '',
}: CharacterProps) {
  const reduced = useReducedMotion();
  const art = ART[who]?.[mood];
  const Renderer = RENDERERS[who];
  const animate = breathing && !reduced;

  return (
    <motion.div
      className={`select-none ${className}`}
      style={{ width: size, height: size, transform: flip ? 'scaleX(-1)' : undefined }}
      animate={
        animate
          ? { scale: [1, 1.022, 1], y: [0, -3, 0] }
          : undefined
      }
      transition={
        animate
          ? { duration: 4.4, repeat: Infinity, ease: 'easeInOut' }
          : undefined
      }
    >
      {art ? (
        <img
          src={art}
          width={size}
          height={size}
          alt={CHARACTER_NAMES[who]}
          // Painted artwork is not square; letterbox it inside the slot rather
          // than squashing a cat.
          className="h-full w-full object-contain"
          draggable={false}
        />
      ) : Renderer ? (
        <svg
          viewBox="0 0 200 200"
          width={size}
          height={size}
          role="img"
          aria-label={CHARACTER_NAMES[who]}
          style={{ overflow: 'visible' }}
        >
          <Renderer mood={mood} />
        </svg>
      ) : null}
    </motion.div>
  );
}
