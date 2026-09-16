import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Screen } from '../design/Screen';
import { Backdrop } from '../design/Backdrop';
import { PrimaryButton } from '../design/PrimaryButton';
import { ChoiceButton, type ChoiceStatus } from '../design/ChoiceButton';
import { ProgressDots } from '../design/ProgressDots';
import { CharacterBubble } from '../characters/CharacterBubble';
import { Character } from '../characters/Character';
import { CHECK_ITEMS, type CheckItem } from '../data/learningCheck';
import { useActions } from '../state/store';
import { pickPhrase, useCopy } from '../i18n';

type Phase = 'intro' | 'playing' | 'outro';

/**
 * Six tiny interactions that quietly seed the mastery map.
 *
 * Rules held to throughout: no score, no "feil", no progress percentage, and
 * a near miss never blocks the child — after one retry Lumi moves things along
 * warmly. Being stuck must never feel like failing.
 */
export function LearningCheck() {
  const copy = useCopy();
  const navigate = useNavigate();
  const actions = useActions();

  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(1);
  const [settled, setSettled] = useState(false);

  const item = CHECK_ITEMS[index] as CheckItem;

  const correctKey = (it: CheckItem): string => {
    switch (it.kind) {
      case 'count':
        return String(it.count);
      case 'sum':
        return String(it.a + it.b);
      case 'pattern':
        return it.answer;
      default:
        return it.answer;
    }
  };

  const choose = (key: string) => {
    if (settled) return;
    const right = key === correctKey(item);
    setPicked(key);

    if (right || attempts >= 2) {
      setSettled(true);
      actions.recordOutcome('sjekk', {
        conceptId: item.conceptId,
        correct: right,
        attempts,
        support: 'none',
        difficulty: 'base',
        at: Date.now(),
      });
    } else {
      // One warm retry, then we move on regardless.
      setAttempts(attempts + 1);
      window.setTimeout(() => setPicked(null), 700);
    }
  };

  const next = () => {
    if (index + 1 >= CHECK_ITEMS.length) {
      actions.finishCheck();
      setPhase('outro');
      return;
    }
    setIndex(index + 1);
    setPicked(null);
    setAttempts(1);
    setSettled(false);
  };

  const statusFor = (key: string): ChoiceStatus => {
    if (picked !== key) return 'idle';
    return key === correctKey(item) ? 'right' : 'close';
  };

  /* ---------------------------------------------------------------- intro */
  if (phase === 'intro') {
    return (
      <Screen backdrop={<Backdrop kind="hills" />} center width="narrow">
        <CharacterBubble who="lumi" mood="curious" size={190} speechKey="check-intro">
          {copy.check.lumiIntro}
        </CharacterBubble>
        <div className="mt-8 flex justify-center">
          <PrimaryButton onClick={() => setPhase('playing')} tone="coral">
            {copy.check.start}
          </PrimaryButton>
        </div>
      </Screen>
    );
  }

  /* ---------------------------------------------------------------- outro */
  if (phase === 'outro') {
    return (
      <Screen backdrop={<Backdrop kind="hills" />} center width="narrow">
        <div className="flex flex-col items-center text-center">
          <Character who="lumi" mood="excited" size={200} />
          <h1 className="mt-4 text-huge text-ink md:text-giant">
            {copy.check.outroTitle}
          </h1>
          <p className="mt-3 max-w-md text-body text-ink-soft md:text-lead">
            {copy.check.outroBody}
          </p>
          <PrimaryButton
            onClick={() => navigate('/verden')}
            tone="coral"
            className="mt-8"
          >
            {copy.check.outroCta}
          </PrimaryButton>
        </div>
      </Screen>
    );
  }

  /* -------------------------------------------------------------- playing */
  const rightNow = settled && picked === correctKey(item);

  return (
    <Screen backdrop={<Backdrop kind="hills" />} width="narrow">
      <div className="mt-2 flex justify-center">
        <ProgressDots
          total={CHECK_ITEMS.length}
          current={index}
          label={copy.check.progress(index + 1, CHECK_ITEMS.length)}
        />
      </div>

      <div className="mt-6">
        <CharacterBubble
          who="lumi"
          mood={settled ? (rightNow ? 'excited' : 'happy') : 'curious'}
          size={128}
          speechKey={item.id + (settled ? '-done' : '')}
          compact
        >
          {settled
            ? rightNow
              ? pickPhrase(copy.feedback.right, index)
              : pickPhrase(copy.feedback.guessed, index)
            : item.prompt}
        </CharacterBubble>
      </div>

      <div className="mt-7 flex-1">
        <CheckStimulus item={item} />

        <div className="mt-6">
          <CheckOptions item={item} onChoose={choose} statusFor={statusFor} disabled={settled} />
        </div>
      </div>

      <AnimatePresence>
        {settled && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-6 flex justify-center pb-4"
          >
            <PrimaryButton onClick={next} tone="moss">
              {index + 1 >= CHECK_ITEMS.length ? copy.check.done : copy.common.next}
            </PrimaryButton>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}

/* -------------------------------------------------------------------------- */

function CheckStimulus({ item }: { item: CheckItem }) {
  if (item.kind === 'count') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg bg-sky-soft/70 px-5 py-7">
        {Array.from({ length: item.count }, (_, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07, type: 'spring', stiffness: 420, damping: 20 }}
            className="text-[2.6rem] leading-none"
            aria-hidden
          >
            {item.emoji}
          </motion.span>
        ))}
      </div>
    );
  }

  if (item.kind === 'sum') {
    return (
      <div className="flex items-center justify-center gap-4 rounded-lg bg-butter-soft/70 px-5 py-7">
        <Group emoji={item.emoji} n={item.a} />
        <span className="font-display text-huge text-ink-soft" aria-hidden>
          +
        </span>
        <Group emoji={item.emoji} n={item.b} />
      </div>
    );
  }

  if (item.kind === 'word') {
    return (
      <div className="flex items-center justify-center rounded-lg bg-snow px-6 py-9 shadow-soft">
        <span className="font-display text-[3.5rem] font-semibold tracking-[0.15em] text-ink">
          {item.word}
        </span>
      </div>
    );
  }

  if (item.kind === 'pattern') {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3 rounded-lg bg-moss-soft/70 px-5 py-7">
        {item.sequence.map((symbol, i) => (
          <span key={i} className="text-[2.6rem] leading-none" aria-hidden>
            {symbol}
          </span>
        ))}
        <span
          className="flex h-16 w-16 items-center justify-center rounded-md border-4
            border-dashed border-ink-faint/50 text-huge text-ink-faint"
          aria-hidden
        >
          ?
        </span>
      </div>
    );
  }

  return null;
}

function Group({ emoji, n }: { emoji: string; n: number }) {
  return (
    <div className="flex max-w-[7.5rem] flex-wrap justify-center gap-1.5">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="text-[2.1rem] leading-none" aria-hidden>
          {emoji}
        </span>
      ))}
    </div>
  );
}

function CheckOptions({
  item,
  onChoose,
  statusFor,
  disabled,
}: {
  item: CheckItem;
  onChoose: (key: string) => void;
  statusFor: (key: string) => ChoiceStatus;
  disabled: boolean;
}) {
  if (item.kind === 'count' || item.kind === 'sum') {
    return (
      <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
        {item.options.map((value) => (
          <ChoiceButton
            key={value}
            tone="sky"
            display={value}
            status={statusFor(String(value))}
            disabled={disabled}
            onClick={() => onChoose(String(value))}
          >
            {''}
          </ChoiceButton>
        ))}
      </div>
    );
  }

  if (item.kind === 'pattern') {
    return (
      <div className="grid grid-cols-3 gap-3">
        {item.options.map((symbol) => (
          <ChoiceButton
            key={symbol}
            tone="moss"
            display={symbol}
            status={statusFor(symbol)}
            disabled={disabled}
            onClick={() => onChoose(symbol)}
          >
            {''}
          </ChoiceButton>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`grid gap-3 ${
        item.options.length > 3 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'
      }`}
    >
      {item.options.map((option) => (
        <ChoiceButton
          key={option.id}
          tone="butter"
          display={option.emoji}
          status={statusFor(option.id)}
          disabled={disabled}
          onClick={() => onChoose(option.id)}
        >
          {option.label}
        </ChoiceButton>
      ))}
    </div>
  );
}
