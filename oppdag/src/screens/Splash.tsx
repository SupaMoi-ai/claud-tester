import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PrimaryButton } from '../design/PrimaryButton';
import { useActions, useGame } from '../state/store';
import { demoState } from '../data/demoChild';
import { useCopy } from '../i18n';

/**
 * The title screen.
 *
 * A painted harbour with nobody in it, and Ellie and Kiki standing on the
 * jetty as separate sprites. Section 8.7 is the reason for the split: a
 * character painted into the background cannot breathe, blink or walk off
 * when the child presses start, and cutting one out afterwards leaves a halo.
 *
 * The painting was commissioned with three zones and the layout keeps to
 * them: the wordmark in the open sky across the top fifth, the characters on
 * the jetty's crossbar, the buttons over the near end of the jetty. Every
 * position is a fraction of the painting, so they stay on the timber at any
 * size rather than at one.
 *
 * The painting is portrait and the comfortable device is a landscape iPad, so
 * the crisp picture sits in a 9:16 column and the same painting, blurred and
 * enlarged, fills the rest. A cream margin would be honest but would make the
 * first screen of the game look like a phone app running on a tablet.
 */

const PLATE = 'assets/title/title-bg.webp';

/** Where the jetty's crossbar is in the painting, as fractions of it. */
const STAGE = {
  /** The line the characters' feet stand on. */
  feet: 0.675,
  ellie: { x: 0.45, height: 0.135 },
  // Section 3.2's proportions: Kiki is 24 LU against Ellie's 66.
  kiki: { x: 0.585, height: 0.135 * (24 / 66) * 1.25 },
} as const;

export function Splash() {
  const copy = useCopy();
  const navigate = useNavigate();
  const { profile, parentAccepted } = useGame();
  const actions = useActions();
  const reduced = useReducedMotion();

  // Læreøya is the game: the island map is home. A returning child goes
  // straight there — "Fortsett som Ellie" used to send them back to the
  // "what is your name" screen — and a new one goes through onboarding first.
  const begin = () => {
    if (profile) navigate('/kart');
    else navigate(parentAccepted ? '/hei' : '/foreldre/oppsett');
  };

  const useDemo = () => {
    actions.loadState(demoState());
    navigate('/kart');
  };

  /** Standing still is not frozen: a slow breath, anchored at the feet. */
  const breathe = (period: number, amount: number) =>
    reduced
      ? {}
      : {
          animate: { scaleY: [1, 1 + amount, 1] },
          transition: { duration: period, repeat: Infinity, ease: 'easeInOut' as const },
        };

  return (
    <div className="relative flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-cream">
      {/* The same harbour, out of focus, so the surround is part of the
       * picture rather than a margin around it. */}
      <img
        src={PLATE}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-70 blur-2xl"
      />

      <div
        className="relative overflow-hidden shadow-float"
        style={{ aspectRatio: '941 / 1672', height: 'min(100dvh, 100vw * 1672 / 941)' }}
      >
        <img src={PLATE} alt="" aria-hidden className="absolute inset-0 h-full w-full" />

        {/* ---- the sky: the wordmark ---------------------------------- */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="absolute inset-x-0 top-[6%] flex flex-col items-center px-6 text-center"
        >
          <h1 className="font-display text-[clamp(2.5rem,11vh,5rem)] font-semibold leading-none tracking-tight text-ink">
            {copy.app.name}
          </h1>
          <p className="mt-2 font-display text-[clamp(1rem,2.6vh,1.5rem)] text-ink-soft">
            {copy.app.tagline}
          </p>
        </motion.div>

        {/* ---- the jetty: Ellie and Kiki ------------------------------ */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          aria-hidden
        >
          <motion.img
            src="assets/characters/ellie/front.png"
            alt=""
            className="absolute origin-bottom"
            style={{
              height: `${STAGE.ellie.height * 100}%`,
              left: `${STAGE.ellie.x * 100}%`,
              bottom: `${(1 - STAGE.feet) * 100}%`,
              translateX: '-50%',
            }}
            {...breathe(3.4, 0.012)}
          />
          <motion.img
            src="assets/characters/kiki/pose-rest.png"
            alt=""
            className="absolute origin-bottom"
            style={{
              height: `${STAGE.kiki.height * 100}%`,
              left: `${STAGE.kiki.x * 100}%`,
              bottom: `${(1 - STAGE.feet) * 100}%`,
              translateX: '-50%',
            }}
            {...breathe(2.6, 0.02)}
          />
        </motion.div>

        {/* ---- the near jetty: the buttons --------------------------- */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="absolute inset-x-0 bottom-[5%] flex flex-col items-center gap-3 px-[9%]"
        >
          <PrimaryButton onClick={begin} tone="coral" full>
            {profile ? copy.splash.resume(profile.name) : copy.splash.start}
          </PrimaryButton>

          {!profile && (
            <PrimaryButton onClick={useDemo} tone="sky" variant="quiet" size="md" full>
              {copy.splash.demo}
            </PrimaryButton>
          )}

          {/* On a pill, not bare: faint underlined text over painted planks is
           * a link nobody can read, and this is the way in for the adult. */}
          <button
            onClick={() => navigate('/port')}
            className="min-h-[2.75rem] rounded-full bg-snow/90 px-5 font-display text-body
              font-semibold text-ink-soft shadow-soft hover:text-ink"
          >
            {copy.splash.parents}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
