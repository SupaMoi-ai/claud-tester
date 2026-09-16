import { motion, useReducedMotion } from 'framer-motion';
import { WorldScenery } from './WorldScenery';
import { WorldLocationPin } from './WorldLocationPin';
import { LOCATIONS, type WorldLocation } from './worldLayout';

interface Props {
  unlocked: string[];
  arriving?: string[];
  /** Location ids that currently have something to do. */
  active?: string[];
  onSelect: (location: WorldLocation) => void;
}

/**
 * The child's island.
 *
 * One illustrated place rather than a menu — the whole point is that a child
 * looks at this and sees somewhere to go, not a list of subjects. Water, land
 * and scenery are SVG; the taps are HTML buttons layered on top so they get
 * proper hit areas and readable labels at any size.
 */
export function WorldMap({ unlocked, arriving = [], active = [], onSelect }: Props) {
  const reduced = useReducedMotion();

  return (
    /* Width drives height, always.
       The pins are positioned as a percentage of THIS box, so the box must
       match the rendered SVG exactly. Letting height drive instead made the
       SVG letterbox inside a taller div and threw every pin out onto the sea.
       The max-width cap reserves room for the header and Lumi's bubble, so the
       island still shrinks to fit a short landscape screen rather than pushing
       the primary action below the fold. */
    <div
      className="relative mx-auto shrink-0"
      style={{
        aspectRatio: '1000 / 640',
        /* Ideally the island fills the height left over after the header and
           Lumi's bubble, but never narrower than 32rem (below that the place
           names collide) and never wider than the screen (a child should see
           their whole world, not a fragment of it). When the floor beats the
           ceiling — a phone — clamp returns the floor and the parent pans.
           1.5625 is 1000/640. */
        width: 'clamp(32rem, calc((100dvh - 15rem) * 1.5625), 100%)',
      }}
    >
      <svg
        viewBox="0 0 1000 640"
        className="absolute inset-0 h-full w-full"
        aria-hidden
      >
        {/* Sea */}
        <rect width="1000" height="640" fill="#DCEEF8" rx="44" />
        <Waves reduced={reduced ?? false} />

        {/* Island — deliberately lopsided; nothing here is a tidy rectangle */}
        <path
          d="M 158 372 C 92 316 132 214 236 190 C 286 106 428 76 508 128 C 596 84 730 122 758 206
             C 872 216 918 316 858 384 C 886 452 790 512 692 490 C 612 548 424 552 340 498
             C 226 502 150 444 158 372 Z"
          fill="#F3E7CF"
        />
        <path
          d="M 172 372 C 112 322 148 228 244 206 C 292 128 424 100 498 148 C 580 108 706 142 732 220
             C 838 230 878 320 824 382 C 850 444 762 496 674 476 C 600 528 428 532 350 482
             C 244 486 166 432 172 372 Z"
          fill="#E9F3DC"
        />
        {/* Grass shading */}
        <path
          d="M 210 330 C 268 290 360 300 420 328 C 372 356 262 364 210 330 Z"
          fill="#D7EAC4" opacity="0.9"
        />
        <path
          d="M 600 300 C 668 272 744 288 786 320 C 730 352 646 348 600 300 Z"
          fill="#D7EAC4" opacity="0.9"
        />
        {/* Sandy shore */}
        <path
          d="M 590 450 C 650 434 706 442 742 462 C 692 486 628 482 590 450 Z"
          fill="#F6E7C6"
        />

        {/* The river the bridge crosses.
            It is drawn always, bridge or no bridge — so before the child earns
            the crossing there is visibly a gap, and afterwards the bridge
            visibly solves it. A bridge over nothing means nothing. */}
        <path
          d="M 352 196 C 378 268 366 322 396 372 C 424 420 408 476 436 516"
          stroke="#CFE7F4"
          strokeWidth="26"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 352 196 C 378 268 366 322 396 372 C 424 420 408 476 436 516"
          stroke="#E4F1FA"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />

        <WorldScenery unlocked={unlocked} arriving={arriving} />
      </svg>

      {LOCATIONS.map((location, i) => (
        <WorldLocationPin
          key={location.id}
          location={location}
          index={i}
          unlocked={unlocked.includes(location.id)}
          hasAdventure={active.includes(location.id)}
          onClick={onSelect}
        />
      ))}
    </div>
  );
}

function Waves({ reduced }: { reduced: boolean }) {
  const rows = [
    { y: 92, delay: 0 },
    { y: 566, delay: 1.4 },
    { y: 606, delay: 2.6 },
    { y: 52, delay: 3.4 },
  ];
  return (
    <g opacity="0.55">
      {rows.map((row, i) => (
        <motion.g
          key={i}
          animate={reduced ? undefined : { x: [0, 26, 0] }}
          transition={
            reduced
              ? undefined
              : { duration: 11 + i * 2, repeat: Infinity, ease: 'easeInOut', delay: row.delay }
          }
        >
          {[120, 330, 560, 790].map((x) => (
            <path
              key={x}
              d={`M ${x} ${row.y} q 16 -9 32 0 t 32 0`}
              stroke="#BEDCEF"
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
          ))}
        </motion.g>
      ))}
    </g>
  );
}
