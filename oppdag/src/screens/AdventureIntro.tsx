import { motion } from 'framer-motion';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../design/Screen';
import { Backdrop } from '../design/Backdrop';
import { PrimaryButton } from '../design/PrimaryButton';
import { BackButton } from '../design/BackButton';
import { SoftCard } from '../design/SoftCard';
import { FloatingObject } from '../design/FloatingObject';
import { Character } from '../characters/Character';
import { getAdventure } from '../data/adventures';
import { useActions } from '../state/store';
import { useCopy } from '../i18n';

/**
 * The invitation.
 *
 * One image, one sentence of trouble, one obvious way in. It never lists what
 * the child will "learn" — that would turn an adventure back into a lesson.
 */
export function AdventureIntro() {
  const copy = useCopy();
  const navigate = useNavigate();
  const { id } = useParams();
  const actions = useActions();
  const adventure = getAdventure(id);

  if (!adventure) return <Navigate to="/verden" replace />;

  const begin = () => {
    actions.startAdventure(adventure.id);
    navigate(`/eventyr/${adventure.id}/spill`);
  };

  return (
    <Screen
      backdrop={<Backdrop kind="arctic" />}
      background="bg-arctic"
      center
      width="narrow"
      overlay={
        <div className="absolute left-5 top-5 z-20">
          <BackButton onClick={() => navigate('/verden')} />
        </div>
      }
    >
      <SoftCard padding="lg" className="mx-auto w-full max-w-xl text-center" grain>
        <p className="font-display text-label font-semibold uppercase tracking-[0.15em] text-sky-deep">
          {adventure.place}
        </p>

        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
          className="relative mx-auto mt-5 flex h-36 w-36 items-center justify-center
            rounded-full bg-sky-soft text-[4.5rem]"
        >
          <span aria-hidden>{adventure.emoji}</span>
          <FloatingObject
            duration={6}
            distance={8}
            className="absolute -right-3 -top-2 text-[1.75rem]"
          >
            <span aria-hidden>❄️</span>
          </FloatingObject>
          <FloatingObject
            duration={8}
            delay={1.2}
            distance={10}
            className="absolute -left-4 top-8 text-[1.5rem]"
          >
            <span aria-hidden>❄️</span>
          </FloatingObject>
        </motion.div>

        <h1 className="mt-6 text-huge leading-tight text-ink md:text-giant">
          {adventure.title}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-body text-ink-soft md:text-lead">
          {adventure.teaser}
        </p>

        <div className="mt-8 flex flex-col items-center gap-4">
          <Character who={adventure.heroCharacter} mood="curious" size={130} />
          <PrimaryButton onClick={begin} tone="coral">
            {copy.adventure.start}
          </PrimaryButton>
          <button
            onClick={() => navigate('/verden')}
            className="min-h-[3rem] px-4 font-display text-body font-semibold text-ink-faint
              hover:text-ink-soft"
          >
            {copy.adventure.notNow}
          </button>
        </div>
      </SoftCard>
    </Screen>
  );
}
