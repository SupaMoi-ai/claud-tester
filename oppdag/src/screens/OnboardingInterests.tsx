import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../design/Screen';
import { Backdrop } from '../design/Backdrop';
import { PrimaryButton } from '../design/PrimaryButton';
import { BackButton } from '../design/BackButton';
import { InterestChip } from '../design/InterestChip';
import { Character } from '../characters/Character';
import { INTERESTS } from '../data/interests';
import { useActions, useGame } from '../state/store';
import { useCopy } from '../i18n';

/**
 * "Hva er du nysgjerrig på?"
 *
 * Multi-select and never framed as a question with a right answer — this is
 * the child telling the system which direction their adventures should lean.
 */
export function OnboardingInterests() {
  const copy = useCopy();
  const navigate = useNavigate();
  const actions = useActions();
  const { profile } = useGame();
  const [selected, setSelected] = useState<string[]>(profile?.interests ?? []);

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const submit = () => {
    if (selected.length === 0) return;
    actions.setInterests(selected);
    navigate('/sjekk');
  };

  return (
    <Screen
      backdrop={<Backdrop kind="hills" />}
      width="wide"
      overlay={
        <div className="absolute left-5 top-5 z-20">
          <BackButton onClick={() => navigate('/alder')} />
        </div>
      }
    >
      <header className="mt-14 text-center sm:mt-10">
        <h1 className="text-huge leading-tight text-ink md:text-giant">
          {copy.onboarding.interestTitle}
        </h1>
        <p className="mt-2 text-body text-ink-soft md:text-lead">
          {copy.onboarding.interestHint}
        </p>
      </header>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {INTERESTS.map((interest, i) => (
          <InterestChip
            key={interest.id}
            interest={interest}
            index={i}
            selected={selected.includes(interest.id)}
            onToggle={toggle}
          />
        ))}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3 pb-12">
        <AnimatePresence mode="wait">
          {selected.length === 0 ? (
            <motion.p
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-body text-ink-faint"
            >
              {copy.onboarding.interestNeedOne}
            </motion.p>
          ) : (
            <motion.div
              key="go"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3"
            >
              <Character who="lumi" mood="excited" size={92} />
              <PrimaryButton onClick={submit} tone="coral">
                {copy.onboarding.interestCta}
              </PrimaryButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Screen>
  );
}
