import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../design/Screen';
import { Backdrop } from '../design/Backdrop';
import { PrimaryButton } from '../design/PrimaryButton';
import { Character } from '../characters/Character';
import { FloatingObject } from '../design/FloatingObject';
import { useActions, useGame } from '../state/store';
import { demoState } from '../data/demoChild';
import { useCopy } from '../i18n';

export function Splash() {
  const copy = useCopy();
  const navigate = useNavigate();
  const { profile, parentAccepted } = useGame();
  const actions = useActions();
  const reduced = useReducedMotion();

  const begin = () => {
    navigate(parentAccepted ? '/hei' : '/foreldre/oppsett');
  };

  const useDemo = () => {
    actions.loadState(demoState());
    navigate('/verden');
  };

  return (
    <Screen backdrop={<Backdrop kind="hills" />} center width="narrow">
      <div className="flex flex-col items-center text-center">
        {/* Wordmark */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 22, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="relative"
        >
          <h1 className="font-display text-[3.5rem] font-semibold leading-none tracking-tight text-ink sm:text-[5rem]">
            OPPDAG
          </h1>
          <FloatingObject
            duration={7}
            distance={7}
            className="absolute -right-9 -top-5 text-[2rem] sm:-right-12 sm:text-[2.5rem]"
          >
            <span aria-hidden>✨</span>
          </FloatingObject>
        </motion.div>

        <motion.p
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="mt-3 font-display text-lead text-ink-soft sm:text-title"
        >
          {copy.app.tagline}
        </motion.p>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 22 }}
          className="my-6 sm:my-8"
        >
          <Character who="lumi" mood="curious" size={230} />
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex w-full max-w-sm flex-col items-center gap-3"
        >
          <PrimaryButton onClick={begin} tone="coral" full>
            {profile ? copy.splash.resume(profile.name) : copy.splash.start}
          </PrimaryButton>

          {!profile && (
            <PrimaryButton onClick={useDemo} tone="sky" variant="quiet" size="md" full>
              {copy.splash.demo}
            </PrimaryButton>
          )}

          <button
            onClick={() => navigate('/port')}
            className="mt-2 min-h-[3rem] px-4 font-display text-body font-semibold text-ink-faint
              underline decoration-hairline decoration-2 underline-offset-4 hover:text-ink-soft"
          >
            {copy.splash.parents}
          </button>
        </motion.div>
      </div>
    </Screen>
  );
}
