import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Screen } from '../design/Screen';
import { Backdrop } from '../design/Backdrop';
import { PrimaryButton } from '../design/PrimaryButton';
import { SoftCard } from '../design/SoftCard';
import { Character } from '../characters/Character';
import { UnlockModal } from '../adventure/UnlockModal';
import { getAdventure } from '../data/adventures';
import { useActions, useGame } from '../state/store';
import { useCopy } from '../i18n';

/**
 * The end of the story, and the moment the world grows.
 *
 * Order matters: the child sees the reunion and what they found out *first*,
 * then the unlock plays on top. The learning is the reward; the new tower is
 * the proof of it, not the prize.
 */
export function AdventureComplete() {
  const copy = useCopy();
  const navigate = useNavigate();
  const { id } = useParams();
  const { pendingUnlocks, drawings } = useGame();
  const actions = useActions();
  const adventure = getAdventure(id);

  if (!adventure) return <Navigate to="/verden" replace />;

  const drawing = [...drawings].reverse().find((d) => d.adventureId === adventure.id);

  return (
    <Screen
      backdrop={<Backdrop kind="arctic" />}
      background="bg-arctic"
      width="narrow"
    >
      <div className="mt-8 flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18 }}
          className="flex items-end"
        >
          {/* Mother and cub, reunited */}
          <span className="text-[5rem] leading-none" aria-hidden>
            🐻‍❄️
          </span>
          <motion.span
            className="-ml-5 text-[3rem] leading-none"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200, damping: 16 }}
            aria-hidden
          >
            🐻‍❄️
          </motion.span>
        </motion.div>

        <p className="mt-5 font-display text-label font-semibold uppercase tracking-[0.15em] text-sky-deep">
          {copy.complete.eyebrow}
        </p>
        <h1 className="mt-2 text-huge leading-tight text-ink md:text-giant">
          {adventure.title}
        </h1>
      </div>

      <SoftCard padding="lg" className="mt-8">
        <h2 className="text-title text-ink">{copy.complete.learnedTitle}</h2>
        <ul className="mt-5 flex flex-col gap-3">
          {adventure.takeaways.map((item, i) => (
            <motion.li
              key={item.text}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.1 }}
              className="flex items-center gap-4 rounded-md bg-sand px-4 py-3.5"
            >
              <span
                className="flex h-12 w-12 shrink-0 items-center justify-center
                  rounded-full bg-snow text-lead shadow-soft"
                aria-hidden
              >
                {item.emoji}
              </span>
              <span className="text-body text-ink">{item.text}</span>
            </motion.li>
          ))}
        </ul>

        {drawing && (
          <div className="mt-6">
            <p className="font-display text-label font-semibold text-ink-faint">
              {copy.drawing.savedTitle}
            </p>
            <img
              src={drawing.dataUrl}
              alt={drawing.prompt}
              className="mt-2 w-full rounded-md shadow-soft"
            />
          </div>
        )}
      </SoftCard>

      <div className="mt-8 flex flex-col items-center gap-4 pb-6">
        <Character who="lumi" mood="happy" size={124} />
        <PrimaryButton onClick={() => navigate('/verden')} tone="coral">
          {copy.complete.cta}
        </PrimaryButton>
      </div>

      <AnimatePresence>
        {pendingUnlocks.length > 0 && (
          <UnlockModal
            ids={pendingUnlocks}
            heroId={adventure.unlocks[0]}
            onClose={actions.consumeAllUnlocks}
          />
        )}
      </AnimatePresence>
    </Screen>
  );
}
