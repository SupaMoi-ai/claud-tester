import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { copy } from '../../copy';
import type { CycleConsent, HelpTopic, OverwhelmStyle, Profile } from '../../domain/types';
import { useHerCode } from '../../store/useHerCode';

const TOTAL = 5;

const HELP_TOPICS: HelpTopic[] = [
  'remembering things',
  'starting tasks',
  'overwhelm',
  'routines',
  'planning',
  'household life',
  'appointments',
  'emotional load',
  'cycle patterns',
  'relationship coordination',
];

const OVERWHELM_STYLES: OverwhelmStyle[] = [
  'freeze',
  'jump-between',
  'forget',
  'avoid',
  'exhausted',
  'depends',
];

const CYCLE_CHOICES: CycleConsent[] = ['yes', 'maybe-later', 'no'];

/** Five steps, every one skippable. Demo data loads either way. */
export function OnboardingFlow() {
  const completeOnboarding = useHerCode((s) => s.completeOnboarding);
  const skipOnboarding = useHerCode((s) => s.skipOnboarding);

  const [step, setStep] = useState(1);
  const [helpWith, setHelpWith] = useState<HelpTopic[]>([]);
  const [overwhelmStyle, setOverwhelmStyle] = useState<OverwhelmStyle | null>(null);
  const [cycleConsent, setCycleConsent] = useState<CycleConsent>('yes');
  const [partnerConnected, setPartnerConnected] = useState(true);
  const [name, setName] = useState('Mia');

  const finish = (overrides: Partial<Profile> = {}) => {
    completeOnboarding({
      helpWith,
      overwhelmStyle,
      cycleConsent,
      partnerConnected,
      name: name.trim().length > 0 ? name.trim() : 'Mia',
      ...overrides,
    });
  };

  const toggleTopic = (topic: HelpTopic) =>
    setHelpWith((current) =>
      current.includes(topic) ? current.filter((t) => t !== topic) : [...current, topic],
    );

  return (
    <div className="safe-top safe-bottom flex h-full flex-col bg-bg">
      <header className="flex items-center justify-between px-5 pb-2 pt-5">
        <span className="text-[13px] text-muted">{copy.onboarding.step(step, TOTAL)}</span>
        <button
          type="button"
          onClick={skipOnboarding}
          className="tap -mr-3 px-3 text-[14px] text-muted transition-colors duration-200 hover:text-ink"
        >
          {copy.onboarding.skipAll}
        </button>
      </header>

      <div className="px-5">
        <div className="h-1 w-full overflow-hidden rounded-full bg-line">
          <motion.div
            className="h-full rounded-full bg-sage"
            initial={false}
            animate={{ width: `${(step / TOTAL) * 100}%` }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
      </div>

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-5 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
          >
            {step === 1 ? (
              <Step title={copy.onboarding.helpTitle} hint={copy.onboarding.helpHint}>
                <div className="flex flex-wrap gap-2">
                  {HELP_TOPICS.map((topic) => (
                    <Chip
                      key={topic}
                      selected={helpWith.includes(topic)}
                      onClick={() => toggleTopic(topic)}
                    >
                      {topic}
                    </Chip>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => finish({ name: 'Mia' })}
                  className="tap mt-5 w-full rounded-card border border-line bg-surface px-4 text-[15px] text-ink/80 transition-colors duration-200 hover:bg-sand/40"
                >
                  {copy.onboarding.useDemo}
                </button>
              </Step>
            ) : null}

            {step === 2 ? (
              <Step title={copy.onboarding.overwhelmTitle} hint={copy.onboarding.overwhelmHint}>
                <div className="space-y-2">
                  {OVERWHELM_STYLES.map((style) => (
                    <Chip
                      key={style}
                      selected={overwhelmStyle === style}
                      onClick={() => setOverwhelmStyle(style)}
                      className="w-full justify-start"
                    >
                      {copy.onboarding.overwhelmOptions[style]}
                    </Chip>
                  ))}
                </div>
              </Step>
            ) : null}

            {step === 3 ? (
              <Step title={copy.onboarding.cycleTitle} hint={copy.onboarding.cycleHint}>
                <div className="space-y-2">
                  {CYCLE_CHOICES.map((choice) => (
                    <Chip
                      key={choice}
                      selected={cycleConsent === choice}
                      onClick={() => setCycleConsent(choice)}
                      className="w-full justify-start"
                    >
                      {copy.onboarding.cycleOptions[choice]}
                    </Chip>
                  ))}
                </div>
                <p className="mt-4 text-[13px] text-muted">{copy.app.disclaimer}</p>
              </Step>
            ) : null}

            {step === 4 ? (
              <Step title={copy.onboarding.partnerTitle} hint={copy.onboarding.partnerHint}>
                <div className="space-y-2">
                  <Chip
                    selected={partnerConnected}
                    onClick={() => setPartnerConnected(true)}
                    className="w-full justify-start"
                  >
                    {copy.onboarding.partnerYes}
                  </Chip>
                  <Chip
                    selected={!partnerConnected}
                    onClick={() => setPartnerConnected(false)}
                    className="w-full justify-start"
                  >
                    {copy.onboarding.partnerNo}
                  </Chip>
                </div>
              </Step>
            ) : null}

            {step === 5 ? (
              <Step title={copy.onboarding.nameTitle} hint={copy.onboarding.nameHint}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={copy.onboarding.namePlaceholder}
                  aria-label={copy.onboarding.nameTitle}
                  className="tap w-full rounded-card border border-line bg-surface px-4 text-[17px] text-ink outline-none focus:border-dusty"
                />
              </Step>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="flex items-center gap-3 px-5 pb-5 pt-3">
        {step > 1 ? (
          <Button variant="quiet" onClick={() => setStep((s) => s - 1)}>
            {copy.common.back}
          </Button>
        ) : null}
        <div className="flex-1" />
        {step < TOTAL ? (
          <Button variant="primary" onClick={() => setStep((s) => s + 1)}>
            {copy.common.next}
          </Button>
        ) : (
          <Button variant="primary" onClick={() => finish()}>
            {copy.onboarding.finish}
          </Button>
        )}
      </footer>
    </div>
  );
}

function Step({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h1 className="font-display text-[26px] leading-tight text-ink">{title}</h1>
      <p className="mb-5 mt-2 text-[14px] leading-snug text-muted">{hint}</p>
      {children}
    </div>
  );
}
