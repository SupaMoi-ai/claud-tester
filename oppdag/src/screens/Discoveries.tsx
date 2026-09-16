import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../design/Screen';
import { Backdrop } from '../design/Backdrop';
import { BackButton } from '../design/BackButton';
import { PrimaryButton } from '../design/PrimaryButton';
import { Character } from '../characters/Character';
import { TONES, toneFor } from '../design/tones';
import { discoveriesFor, type Discovery } from '../data/discoveries';
import { useActions, useGame } from '../state/store';
import { useCopy } from '../i18n';

/**
 * The curiosity shelf.
 *
 * Personalised from the child's stated interests, and deliberately finite —
 * a hand-written set that ends, not a feed that refills to keep them here.
 * Cards that don't open a built adventure say so honestly rather than
 * pretending; Lumi notes the question down instead.
 */
export function Discoveries() {
  const copy = useCopy();
  const navigate = useNavigate();
  const { profile, seenDiscoveries } = useGame();
  const actions = useActions();
  const [soon, setSoon] = useState<Discovery | null>(null);

  const cards = discoveriesFor(profile?.interests ?? [], 6);

  const open = (card: Discovery) => {
    actions.seeDiscovery(card.id);
    if (card.adventureId) {
      navigate(`/eventyr/${card.adventureId}`);
      return;
    }
    setSoon(card);
  };

  return (
    <Screen
      backdrop={<Backdrop kind="hills" />}
      width="wide"
      overlay={
        <div className="absolute left-5 top-5 z-20">
          <BackButton onClick={() => navigate('/verden')} />
        </div>
      }
    >
      <header className="mt-14 text-center sm:mt-10">
        <h1 className="text-huge leading-tight text-ink md:text-giant">
          {copy.discoveries.title}
        </h1>
        <p className="mt-2 text-body text-ink-soft md:text-lead">
          {copy.discoveries.subtitle}
        </p>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, i) => {
          const tone = TONES[toneFor(card.id)];
          const seen = seenDiscoveries.includes(card.id);

          return (
            <motion.button
              key={card.id}
              onClick={() => open(card)}
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 26 }}
              whileHover={{ y: -5 }}
              whileTap={{ scale: 0.98 }}
              className={`grain relative flex min-h-[15rem] flex-col justify-between
                rounded-lg ${tone.soft} p-6 text-left shadow-soft`}
            >
              <motion.span
                className="text-[3.5rem] leading-none"
                animate={{ rotate: [0, 3, 0, -3, 0] }}
                transition={{ duration: 9 + i, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden
              >
                {card.emoji}
              </motion.span>

              <div className="mt-4">
                <h2 className="text-lead leading-snug text-ink md:text-title">
                  {card.question}
                </h2>
                <p className={`mt-3 font-display text-body font-semibold ${tone.deep}`}>
                  {card.cta}
                </p>
              </div>

              {card.adventureId && !seen && (
                <span
                  className="absolute right-4 top-4 rounded-full bg-coral px-3 py-1
                    font-display text-nano font-bold text-snow shadow-soft"
                >
                  NY
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Honest empty-ish state for the cards that aren't built yet */}
      <AnimatePresence>
        {soon && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSoon(null)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 22 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-xl bg-cream p-7 text-center shadow-float"
            >
              <span className="text-[3rem]" aria-hidden>
                {soon.emoji}
              </span>
              <h2 className="mt-3 text-title leading-snug text-ink">
                {copy.discoveries.soon}
              </h2>
              <p className="mt-3 text-body text-ink-soft">
                {copy.discoveries.soonBody}
              </p>
              <div className="mt-6 flex flex-col items-center gap-4">
                <Character who="lumi" mood="thinking" size={96} />
                <PrimaryButton onClick={() => setSoon(null)} tone="sky" size="md">
                  {copy.common.close}
                </PrimaryButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}
