import { motion, useReducedMotion } from 'framer-motion';
import { PrimaryButton } from '../design/PrimaryButton';
import { Character } from '../characters/Character';
import { describeUnlock } from '../world/worldLayout';
import { useCopy } from '../i18n';

interface Props {
  /** Everything that has grown and not yet been shown. */
  ids: string[];
  /**
   * The headline. An adventure names its own payoff, and that must lead even
   * if smaller things happened to unlock earlier in the same session —
   * otherwise the Svalbard ending announces a footbridge.
   */
  heroId?: string;
  onClose: () => void;
}

/** Nothing beyond this many supporting items; the rest are counted. */
const MAX_LISTED = 3;

/**
 * The world-growth moment.
 *
 * Deliberately not a reward popup: no coins, no XP, no confetti cannon. It
 * names the thing that appeared and, crucially, *why* it appeared — "Du hjalp
 * isbjørnungen hjem." The feeling to land is "my world got bigger because I
 * learned something", not "I scored points".
 *
 * One modal, never a queue. A long adventure can legitimately grow five things
 * at once, and five popups in a row would turn the one magical moment into
 * paperwork — so the headline gets the stage and the rest ride along beneath it.
 */
export function UnlockModal({ ids, heroId, onClose }: Props) {
  const copy = useCopy();
  const reduced = useReducedMotion();

  const lead = heroId && ids.includes(heroId) ? heroId : ids[0];
  if (!lead) return null;

  const hero = describeUnlock(lead);
  const others = ids.filter((id) => id !== lead);
  const rest = others.slice(0, MAX_LISTED).map(describeUnlock);
  const overflow = others.length - rest.length;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto
        bg-night/70 px-5 py-8 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label={`${copy.unlock.eyebrow}: ${hero.name}`}
    >
      {/* Aurora sweep behind the card */}
      {!reduced && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 1000 600"
          preserveAspectRatio="none"
          aria-hidden
        >
          {[
            { d: 'M-60 210 C 220 110 520 280 800 170 C 940 116 1010 190 1080 150', c: '#84CFA6', w: 60, o: 0.5 },
            { d: 'M-60 280 C 240 176 540 340 820 230 C 950 180 1010 250 1080 214', c: '#8CCDEE', w: 44, o: 0.42 },
            { d: 'M-60 150 C 260 56 560 220 840 110 C 960 62 1020 130 1080 96', c: '#B8A5E4', w: 34, o: 0.38 },
          ].map((band, i) => (
            <motion.path
              key={i}
              d={band.d}
              stroke={band.c}
              strokeWidth={band.w}
              strokeLinecap="round"
              fill="none"
              style={{ filter: 'blur(20px)' }}
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: band.o, pathLength: 1, y: [0, 20, 0] }}
              transition={{
                pathLength: { duration: 1.6, delay: i * 0.18, ease: 'easeOut' },
                opacity: { duration: 1.1, delay: i * 0.18 },
                y: { duration: 9 + i * 2, repeat: Infinity, ease: 'easeInOut' },
              }}
            />
          ))}
        </svg>
      )}

      {/* Slow stars */}
      {!reduced &&
        Array.from({ length: 16 }, (_, i) => (
          <motion.span
            key={i}
            className="pointer-events-none absolute h-1.5 w-1.5 rounded-full bg-butter-soft"
            style={{ left: `${((i * 37) % 96) + 2}%`, top: `${((i * 53) % 84) + 6}%` }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0.35], scale: [0, 1.3, 1] }}
            transition={{
              duration: 2.6,
              delay: 0.4 + i * 0.08,
              repeat: Infinity,
              repeatType: 'reverse',
              repeatDelay: i * 0.12,
            }}
            aria-hidden
          />
        ))}

      <motion.div
        initial={reduced ? false : { scale: 0.86, y: 30, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20, delay: 0.25 }}
        className="relative z-10 my-auto w-full max-w-md rounded-xxl bg-cream px-7 py-9
          text-center shadow-float"
      >
        <p className="font-display text-label font-semibold uppercase tracking-[0.16em] text-coral-deep">
          {copy.unlock.eyebrow}
        </p>

        <motion.div
          initial={reduced ? false : { scale: 0, rotate: -25 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.55 }}
          className="mx-auto mt-5 flex h-28 w-28 items-center justify-center rounded-full
            bg-lavender-soft text-[3.5rem] shadow-lifted"
          aria-hidden
        >
          {hero.emoji}
        </motion.div>

        <h2 className="mt-5 text-huge leading-tight text-ink">{hero.name}</h2>
        <p className="mx-auto mt-3 max-w-xs text-body text-ink-soft">{hero.because}</p>

        {/* Everything else that grew in the same breath */}
        {rest.length > 0 && (
          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-6 flex flex-col gap-2 border-t border-hairline pt-5 text-left"
          >
            {rest.map((item, i) => (
              <motion.li
                key={item.name}
                initial={reduced ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1 + i * 0.12 }}
                className="flex items-center gap-3 rounded-md bg-sand px-4 py-2.5"
              >
                <span className="text-lead" aria-hidden>
                  {item.emoji}
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-body font-semibold text-ink">
                    {item.name}
                  </span>
                  <span className="block text-label text-ink-soft">{item.because}</span>
                </span>
              </motion.li>
            ))}
            {overflow > 0 && (
              <li className="pt-1 text-center text-label text-ink-faint">
                {`… og ${overflow} ting til`}
              </li>
            )}
          </motion.ul>
        )}

        <div className="mt-7 flex flex-col items-center gap-4">
          <Character who="lumi" mood="excited" size={104} />
          <PrimaryButton onClick={onClose} tone="coral">
            {copy.unlock.cta}
          </PrimaryButton>
        </div>
      </motion.div>
    </motion.div>
  );
}
