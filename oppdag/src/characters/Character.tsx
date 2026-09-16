import { motion, useReducedMotion } from 'framer-motion';
import { Lumi } from './Lumi';
import { Bolt } from './Bolt';
import { Birk } from './Birk';
import { Otto } from './Otto';
import type { Mood } from './Face';

export type Who = 'lumi' | 'bolt' | 'birk' | 'otto';
export type { Mood };

/**
 * The single entry point for drawing a character.
 *
 * Every call site uses `<Character who=… mood=… />` and nothing else, so when
 * final commissioned illustrations exist they can be dropped in by changing
 * only `RENDERERS` below (or adding an `<img>` branch keyed off the same
 * who/mood pair) — no screen has to be touched.
 */
const RENDERERS: Record<Who, (p: { mood?: Mood }) => React.ReactElement> = {
  lumi: Lumi,
  bolt: Bolt,
  birk: Birk,
  otto: Otto,
};

export const CHARACTER_NAMES: Record<Who, string> = {
  lumi: 'Lumi',
  bolt: 'Bolt',
  birk: 'Birk',
  otto: 'Otto',
};

interface CharacterProps {
  who: Who;
  mood?: Mood;
  /** Rendered width in px; the SVG is square. */
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
    </motion.div>
  );
}
