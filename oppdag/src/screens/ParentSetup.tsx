import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../design/Screen';
import { Backdrop } from '../design/Backdrop';
import { SoftCard } from '../design/SoftCard';
import { PrimaryButton } from '../design/PrimaryButton';
import { BackButton } from '../design/BackButton';
import { useActions } from '../state/store';
import { useCopy } from '../i18n';

/**
 * The one screen written for the adult.
 *
 * Its job is trust: state plainly what the product does not do, before the
 * child ever touches it. Calm typography, no marketing.
 */
export function ParentSetup() {
  const copy = useCopy();
  const navigate = useNavigate();
  const actions = useActions();

  const handOver = () => {
    actions.acceptParentIntro();
    navigate('/hei');
  };

  return (
    <Screen
      backdrop={<Backdrop kind="calm" />}
      center
      width="narrow"
      background="bg-sand"
      overlay={
        <div className="absolute left-5 top-5 z-20">
          <BackButton onClick={() => navigate('/')} />
        </div>
      }
    >
      <SoftCard padding="lg" className="mx-auto w-full max-w-2xl">
        <p className="font-display text-label font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {copy.app.name}
        </p>
        <h1 className="mt-3 text-title leading-tight text-ink md:text-huge">
          {copy.parentSetup.title}
        </h1>
        <p className="mt-4 text-body leading-relaxed text-ink-soft">
          {copy.parentSetup.body}
        </p>

        <ul className="mt-7 flex flex-col gap-3">
          {copy.parentSetup.points.map((point, i) => (
            <motion.li
              key={point}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 + i * 0.08 }}
              className="flex items-start gap-3 rounded-md bg-moss-soft/60 px-4 py-3"
            >
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center
                  rounded-full bg-moss text-nano font-bold text-ink"
                aria-hidden
              >
                ✓
              </span>
              <span className="text-body text-ink">{point}</span>
            </motion.li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col items-center gap-3">
          <PrimaryButton onClick={handOver} tone="moss" full>
            {copy.parentSetup.cta}
          </PrimaryButton>
          <p className="text-label text-ink-faint">{copy.parentSetup.childStarts}</p>
        </div>
      </SoftCard>
    </Screen>
  );
}
