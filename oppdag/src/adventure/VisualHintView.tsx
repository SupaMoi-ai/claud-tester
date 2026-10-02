import { motion } from 'framer-motion';
import type { VisualHint } from './types';

/**
 * Renders the visual rung of the support ladder.
 *
 * Visual support is the step between "a nudge in words" and "here is how you
 * do it": the child still answers, but the quantity or the sentence is made
 * concrete in front of them.
 */
export function VisualHintView({ hint }: { hint: VisualHint }) {
  switch (hint.kind) {
    case 'numberline':
      return <NumberLine {...hint} />;
    case 'groups':
      return <Groups {...hint} />;
    case 'equalGroups':
      return <EqualGroups {...hint} />;
    case 'highlight':
      return (
        <div className="rounded-md bg-butter-soft px-5 py-4">
          <p className="text-read leading-relaxed text-ink">
            <mark className="rounded bg-butter px-1.5 py-0.5 text-ink">
              {hint.sentence}
            </mark>
          </p>
        </div>
      );
    case 'pointer':
      return (
        <div className="flex items-center justify-center gap-3 rounded-md bg-sky-soft px-5 py-4">
          <motion.span
            className="text-[2rem]"
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          >
            ⬆️
          </motion.span>
          <p className="font-display text-body font-semibold text-ink">{hint.note}</p>
        </div>
      );
    default:
      return null;
  }
}

/**
 * One block per kilometre, not one bar per number.
 *
 * This distinction is the whole point: with 4 km total and 1 km walked, the
 * child should see one filled block and **three empty ones** — and the three
 * empty blocks are literally the answer, countable with a finger. Drawing the
 * tick *points* 0–4 instead filled two bars for one kilometre walked, which
 * quietly taught the wrong thing.
 */
function NumberLine({
  from,
  to,
  walked,
  unit = '',
}: {
  from: number;
  to: number;
  walked: number;
  unit?: string;
}) {
  const blocks = Array.from({ length: to - from }, (_, i) => from + i + 1);

  return (
    <div className="rounded-md bg-sky-soft px-4 py-5">
      <div className="flex items-stretch justify-between gap-1.5">
        {blocks.map((n) => {
          const done = n <= walked;
          const firstAhead = n === walked + 1;
          return (
            <div key={n} className="flex flex-1 flex-col items-center">
              {/* Fixed-height marker slot, so every column is the same height
                  and the blocks line up. */}
              <div className="flex h-6 items-end">
                {firstAhead && (
                  <motion.span
                    className="text-label leading-none"
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
                    aria-hidden
                  >
                    📍
                  </motion.span>
                )}
              </div>

              <motion.span
                className={`mt-1 block h-10 w-full rounded-sm ${
                  done ? 'bg-sky-deep' : 'bg-snow'
                }`}
                initial={{ scaleY: 0.3, opacity: 0.4 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ delay: (n - from) * 0.06 }}
                style={{ transformOrigin: 'bottom' }}
              />

              <span
                className={`mt-1.5 font-display text-nano font-semibold ${
                  done ? 'text-sky-deep' : 'text-ink-soft'
                }`}
              >
                {n}
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-label text-ink-soft">
        Vi har gått {walked} {unit}. Målet er {to} {unit}.
      </p>
    </div>
  );
}

function Groups({ emoji, a, b }: { emoji: string; a: number; b: number }) {
  const Row = ({ n }: { n: number }) => (
    <div className="flex max-w-[8rem] flex-wrap justify-center gap-1">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="text-[1.75rem] leading-none" aria-hidden>
          {emoji}
        </span>
      ))}
    </div>
  );

  return (
    <div className="flex items-center justify-center gap-4 rounded-md bg-moss-soft px-5 py-5">
      <Row n={a} />
      <span className="font-display text-title text-ink-soft" aria-hidden>
        +
      </span>
      <Row n={b} />
    </div>
  );
}

/**
 * Multiplication as equal groups: one rounded compartment per group, the same
 * number in each.
 *
 * Every compartment is drawn identically on purpose. The idea being taught is
 * that the groups are *the same*, so a picture where one group happens to
 * wrap onto two lines and another does not undermines it — hence a fixed
 * column count per compartment rather than free wrapping.
 */
function EqualGroups({
  groups,
  each,
  image,
}: {
  groups: number;
  each: number;
  image?: string;
}) {
  const columns = each <= 4 ? 2 : 3;
  return (
    <div
      className="flex flex-wrap items-stretch justify-center gap-2 rounded-md bg-sky-soft px-3 py-4"
      role="img"
      aria-label={`${groups} rom med ${each} i hvert`}
      data-groups={groups}
      data-each={each}
    >
      {Array.from({ length: groups }, (_, g) => (
        <motion.div
          key={g}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: g * 0.12 }}
          className="grid gap-1 rounded-lg bg-snow px-2 py-2 shadow-soft"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: each }, (_, i) =>
            image ? (
              <img key={i} src={image} alt="" aria-hidden className="h-6 w-6 object-contain" />
            ) : (
              <span key={i} className="block h-5 w-5 rounded-full bg-sky-deep" aria-hidden />
            ),
          )}
        </motion.div>
      ))}
    </div>
  );
}
