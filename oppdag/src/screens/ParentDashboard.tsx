import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../design/Screen';
import { BackButton } from '../design/BackButton';
import { SoftCard } from '../design/SoftCard';
import { PrimaryButton } from '../design/PrimaryButton';
import { ParentInsightCard } from '../parent/ParentInsightCard';
import { buildInsights, curiosityPointsTo, suggestTogether } from '../parent/insights';
import { STORED_PERSONAL_DATA } from '../safety/childSafety';
import { useActions, useGame } from '../state/store';
import { useCopy } from '../i18n';

/**
 * The parent's view.
 *
 * Warm, short, and honest. It answers "what did my kid actually do today?" and
 * gives one thing to try together — then gets out of the way.
 */
export function ParentDashboard() {
  const copy = useCopy();
  const navigate = useNavigate();
  const state = useGame();
  const actions = useActions();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const insights = buildInsights(state);
  const together = suggestTogether(state);
  const curiosity = curiosityPointsTo(state);
  const name = state.profile?.name ?? '';

  const reset = () => {
    actions.reset();
    navigate('/', { replace: true });
  };

  return (
    <Screen
      width="narrow"
      background="bg-sand"
      overlay={
        <div className="absolute left-5 top-5 z-20">
          <BackButton onClick={() => navigate('/verden')} label={copy.parent.back} />
        </div>
      }
    >
      <header className="mt-14 sm:mt-10">
        <p className="font-display text-label font-semibold uppercase tracking-[0.15em] text-ink-faint">
          {copy.app.name}
        </p>
        <h1 className="mt-1 text-huge leading-tight text-ink">
          {copy.parent.title(name)}
        </h1>
      </header>

      {/* ---- Today ---------------------------------------------------- */}
      <section className="mt-8">
        <h2 className="text-title text-ink">{copy.parent.todayTitle}</h2>

        {insights.length === 0 ? (
          <SoftCard className="mt-4">
            <p className="text-body text-ink-soft">{copy.parent.todayEmpty}</p>
          </SoftCard>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {insights.map((insight, i) => (
              <ParentInsightCard key={insight.id} insight={insight} index={i} />
            ))}
          </div>
        )}
      </section>

      {/* ---- Try this together ---------------------------------------- */}
      <section className="mt-8">
        <h2 className="text-title text-ink">{copy.parent.togetherTitle}</h2>
        <SoftCard surface="tone" tone="butter" className="mt-4" grain>
          <p className="text-read leading-relaxed text-ink">“{together}”</p>
        </SoftCard>
      </section>

      {/* ---- Curiosity ------------------------------------------------- */}
      {curiosity.length > 0 && (
        <section className="mt-8">
          <h2 className="text-title text-ink">{copy.parent.curiosityTitle}</h2>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {curiosity.map((label) => (
              <span
                key={label}
                className="rounded-full bg-lavender-soft px-5 py-3 font-display
                  text-body font-semibold text-ink"
              >
                {label}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ---- Learning map --------------------------------------------- */}
      <div className="mt-8">
        <PrimaryButton
          onClick={() => navigate('/foreldre/kart')}
          tone="sky"
          variant="quiet"
          full
        >
          {copy.parent.mapCta}
        </PrimaryButton>
      </div>

      {/* ---- Settings -------------------------------------------------- */}
      <section className="mt-10 mb-10">
        <h2 className="text-title text-ink">{copy.parent.settingsTitle}</h2>

        <SoftCard className="mt-4">
          <h3 className="font-display text-body font-semibold text-ink">
            {copy.parent.privacyTitle}
          </h3>
          <p className="mt-2 text-body leading-relaxed text-ink-soft">
            {copy.parent.privacyBody}
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {STORED_PERSONAL_DATA.map((item) => (
              <li
                key={item}
                className="rounded-full bg-sand px-3 py-1.5 text-label text-ink-soft"
              >
                {item}
              </li>
            ))}
          </ul>
        </SoftCard>

        <SoftCard className="mt-3">
          <h3 className="font-display text-body font-semibold text-ink">
            {copy.parent.resetLabel}
          </h3>
          <p className="mt-2 text-body text-ink-soft">{copy.parent.resetBody}</p>
          <button
            onClick={() => setConfirmingReset(true)}
            className="mt-4 min-h-[3.25rem] rounded-lg bg-coral-soft px-6 font-display
              text-body font-semibold text-coral-deep shadow-soft active:scale-95"
          >
            {copy.parent.resetLabel}
          </button>
        </SoftCard>
      </section>

      <AnimatePresence>
        {confirmingReset && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.93, y: 18 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-xl bg-cream p-7 text-center shadow-float"
            >
              <h3 className="text-title text-ink">{copy.parent.resetLabel}</h3>
              <p className="mt-3 text-body text-ink-soft">{copy.parent.resetBody}</p>
              <div className="mt-6 flex flex-col gap-3">
                <PrimaryButton onClick={reset} tone="coral" size="md" full>
                  {copy.parent.resetConfirm}
                </PrimaryButton>
                <PrimaryButton
                  onClick={() => setConfirmingReset(false)}
                  variant="ghost"
                  size="md"
                  full
                >
                  {copy.parent.resetCancel}
                </PrimaryButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}
