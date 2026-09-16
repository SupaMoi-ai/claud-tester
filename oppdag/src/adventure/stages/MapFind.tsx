import { motion, useReducedMotion } from 'framer-motion';
import type { MapFindStage } from '../types';
import type { SupportLevel } from '../../learning/types';

interface Props {
  stage: MapFindStage;
  support: SupportLevel;
  chosen: string | null;
  correct: boolean;
  disabled: boolean;
  onChoose: (key: string) => void;
}

/**
 * Find a place on a simplified map.
 *
 * Deliberately not an atlas: a few soft landmasses in the Nordic sea, with
 * generous circular hit targets. The child is learning "Svalbard is the one far
 * up north", not coastline shapes.
 */
export function MapFind({
  stage,
  support,
  chosen,
  correct,
  disabled,
  onChoose,
}: Props) {
  const reduced = useReducedMotion();
  const pointing =
    (support === 'visual' || support === 'guided') &&
    stage.hints[1].visual?.kind === 'pointer'
      ? stage.hints[1].visual.targetId
      : null;

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-xl overflow-hidden rounded-lg bg-sky-soft shadow-soft">
      <svg viewBox="0 0 400 300" className="absolute inset-0 h-full w-full" aria-hidden>
        {/* Sea */}
        <rect width="400" height="300" fill="#D8EEFA" />

        {/* A compass, so "nord er oppover" is learnable from the picture */}
        <g transform="translate(360 40)">
          <circle r="22" fill="#FDF8F0" opacity="0.9" />
          <path d="M 0 -15 L 5 2 L 0 -2 L -5 2 Z" fill="#F78A77" />
          <text
            x="0" y="-17" textAnchor="middle"
            fontSize="10" fontWeight="700" fill="#3A2E28"
            fontFamily="Fredoka Variable, sans-serif"
          >
            N
          </text>
        </g>

        {/* Svalbard — small, far north, clearly apart from the rest */}
        <path d="M 210 24 C 228 12 250 20 246 36 C 242 52 214 56 206 44 C 200 36 202 30 210 24 Z" fill="#EAF4FA" />
        <path d="M 216 30 C 226 24 238 28 236 36 C 234 44 218 46 214 40 Z" fill="#FFFFFF" />

        {/* Mainland Norway + Sweden, one soft blob */}
        <path
          d="M 150 210 C 140 176 156 140 176 116 C 196 92 214 82 224 92
             C 232 100 220 120 212 140 C 206 156 210 176 200 196
             C 190 216 176 236 162 234 C 150 232 152 222 150 210 Z"
          fill="#D9EDC6"
        />
        {/* Northern tip, shaded so "Nord-Norge" reads as a region */}
        <path
          d="M 176 116 C 196 92 214 82 224 92 C 232 100 220 120 212 140 C 196 136 182 128 176 116 Z"
          fill="#C6E3AF"
        />

        {/* Iceland */}
        <path d="M 36 108 C 54 96 82 100 84 114 C 86 130 54 138 40 128 C 30 122 28 114 36 108 Z" fill="#D9EDC6" />
      </svg>

      {stage.targets.map((target) => {
        const isChosen = chosen === target.id;
        const isRight = isChosen && correct;
        const isClose = isChosen && !correct;

        return (
          <motion.button
            key={target.id}
            onClick={() => onChoose(target.id)}
            disabled={disabled}
            aria-label={target.label}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${target.x}%`, top: `${target.y}%` }}
            whileTap={disabled || reduced ? undefined : { scale: 0.9 }}
            whileHover={disabled || reduced ? undefined : { scale: 1.08 }}
            animate={isClose && !reduced ? { x: [0, -6, 6, -3, 0] } : {}}
          >
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-full
                text-nano font-bold shadow-lifted transition-colors sm:h-16 sm:w-16
                ${
                  isRight
                    ? 'bg-moss text-ink ring-4 ring-moss-deep/40'
                    : isClose
                      ? 'bg-butter text-ink'
                      : 'bg-snow/90 text-ink-soft'
                }`}
            >
              {isRight ? '✓' : '?'}
            </span>
            <span className="rounded-full bg-snow/92 px-2.5 py-1 font-display text-nano font-semibold text-ink shadow-soft">
              {target.label}
            </span>

            {/* Visual hint rung: an arrow that bounces over the right place */}
            {pointing === target.id && !isChosen && (
              <motion.span
                className="absolute -top-9 text-[1.6rem]"
                animate={reduced ? undefined : { y: [0, -7, 0] }}
                transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
              >
                ⬇️
              </motion.span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
