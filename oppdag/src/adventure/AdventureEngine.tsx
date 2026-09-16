import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Screen } from '../design/Screen';
import { Backdrop } from '../design/Backdrop';
import { PrimaryButton } from '../design/PrimaryButton';
import { BackButton } from '../design/BackButton';
import { ProgressDots } from '../design/ProgressDots';
import { DrawingCanvas } from '../design/DrawingCanvas';
import { CharacterBubble } from '../characters/CharacterBubble';
import type { ChoiceStatus } from '../design/ChoiceButton';

import { HintLadder } from './HintLadder';
import { NumberChoice } from './stages/NumberChoice';
import { GuessReveal } from './stages/GuessReveal';
import { Reading } from './stages/Reading';
import { MapFind } from './stages/MapFind';
import { Reflection } from './stages/Reflection';
import { isTaskStage, type Adventure, type Line, type Stage } from './types';

import {
  emptyMomentum,
  nextSupport,
  pickDifficulty,
  pushMomentum,
  wasEffortless,
  type Momentum,
} from '../learning/adaptive';
import { readMastery } from '../learning/masteryEngine';
import type { Difficulty, SupportLevel } from '../learning/types';
import { useActions, useChildId, useGame } from '../state/store';
import { pickPhrase, useCopy } from '../i18n';

type Phase = 'intro' | 'task' | 'after';

interface Props {
  adventure: Adventure;
  onFinish: () => void;
  onLeave: () => void;
}

/**
 * Walks an adventure's declarative stage list.
 *
 * The loop the brief asks for, made concrete:
 *   STORY → TASK → TRY → FEEDBACK → CONTINUE STORY → next
 *
 * Every answered task emits exactly one `StageOutcome`, which the store fans
 * out to the mastery engine, the parent event log and the world-growth
 * evaluator. The engine itself holds no learning logic — it decides *what to
 * show*, `learning/` decides *what it means*.
 */
export function AdventureEngine({ adventure, onFinish, onLeave }: Props) {
  const copy = useCopy();
  const actions = useActions();
  const childId = useChildId();
  const { mastery, adventures } = useGame();

  const saved = adventures[adventure.id];
  const [index, setIndex] = useState(saved?.stageIndex ?? 0);
  const stage = adventure.stages[index] as Stage;

  const [phase, setPhase] = useState<Phase>(() =>
    stage.kind === 'story' || !stage.intro?.length ? (stage.kind === 'story' ? 'intro' : 'task') : 'intro',
  );
  const [lineIndex, setLineIndex] = useState(0);
  const [attempts, setAttempts] = useState(1);
  const [support, setSupport] = useState<SupportLevel>('none');
  const [chosen, setChosen] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  const [momentum, setMomentum] = useState<Momentum>(emptyMomentum);
  const [leaving, setLeaving] = useState(false);

  /** Which variant of this task to show, decided when the stage opens. */
  const difficulty: Difficulty = useMemo(() => {
    if (!isTaskStage(stage) || stage.kind !== 'numberChoice') return 'base';
    return pickDifficulty(
      momentum,
      readMastery(mastery, childId, stage.conceptId),
    );
    // Intentionally keyed to the stage only: re-picking mid-question would
    // swap the numbers under the child's feet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.id]);

  const taskCount = adventure.stages.filter(isTaskStage).length;
  const taskNumber = adventure.stages
    .slice(0, index)
    .filter(isTaskStage).length;

  /* ------------------------------------------------------------ advancing */

  const goToStage = useCallback(
    (nextIndex: number) => {
      if (nextIndex >= adventure.stages.length) {
        onFinish();
        return;
      }
      const next = adventure.stages[nextIndex] as Stage;
      actions.setStage(adventure.id, nextIndex);
      setIndex(nextIndex);
      setLineIndex(0);
      setAttempts(1);
      setSupport('none');
      setChosen(null);
      setSettled(false);
      setPhase(
        next.kind === 'story' || next.intro?.length ? 'intro' : 'task',
      );
    },
    [actions, adventure, onFinish],
  );

  const finishStage = useCallback(() => {
    const after = isTaskStage(stage) ? stage.after : undefined;
    if (after?.length) {
      setLineIndex(0);
      setPhase('after');
    } else {
      goToStage(index + 1);
    }
  }, [goToStage, index, stage]);

  /* -------------------------------------------------------------- answers */

  const correctKey = (): string => {
    switch (stage.kind) {
      case 'numberChoice':
        return String(stage.variants[difficulty].answer);
      case 'reading':
        return stage.answer;
      case 'mapFind':
        return stage.answer;
      default:
        return '';
    }
  };

  const record = (correct: boolean, expressive = false) => {
    if (!isTaskStage(stage)) return;
    actions.recordOutcome(adventure.id, {
      conceptId: stage.conceptId,
      correct,
      attempts,
      support,
      difficulty,
      expressive,
      at: Date.now(),
    });
    setMomentum((m) => pushMomentum(m, wasEffortless(correct, attempts, support)));
  };

  const answer = (key: string) => {
    if (settled) return;
    const right = key === correctKey();
    setChosen(key);

    if (right) {
      setSettled(true);
      record(true);
      return;
    }

    // Not right: keep the child in the attempt, and let them pull for help.
    setAttempts((a) => a + 1);
    window.setTimeout(() => setChosen(null), 750);
  };

  const statusFor = (key: string): ChoiceStatus => {
    if (chosen !== key) return 'idle';
    return key === correctKey() ? 'right' : 'close';
  };

  /* ---------------------------------------------------------------- lines */

  const lines: Line[] =
    phase === 'intro'
      ? stage.kind === 'story'
        ? stage.lines
        : (stage.intro ?? [])
      : phase === 'after' && isTaskStage(stage)
        ? (stage.after ?? [])
        : [];

  const line = lines[lineIndex];
  const lastLine = lineIndex >= lines.length - 1;

  const advanceLine = () => {
    if (!lastLine) {
      setLineIndex((i) => i + 1);
      return;
    }
    if (phase === 'intro') {
      if (stage.kind === 'story') goToStage(index + 1);
      else setPhase('task');
      return;
    }
    goToStage(index + 1);
  };

  /* --------------------------------------------------------------- render */

  const promptText = (): string => {
    switch (stage.kind) {
      case 'numberChoice':
        return stage.variants[difficulty].prompt;
      case 'guessReveal':
        return stage.prompt;
      case 'reading':
        // The note itself carries the scene, so Lumi asks the question — it
        // would be a waste of the bubble to fill it with "Hmm …".
        return stage.question;
      case 'mapFind':
        return stage.prompt;
      case 'drawing':
        return stage.prompt;
      case 'reflection':
        return stage.prompt;
      default:
        return '';
    }
  };

  const showingLines = lines.length > 0 && (phase === 'intro' || phase === 'after');
  const arctic = index > 0;

  return (
    <Screen
      backdrop={<Backdrop kind={arctic ? 'arctic' : 'hills'} />}
      width="narrow"
      background={arctic ? 'bg-arctic' : 'bg-cream'}
      overlay={
        <div className="absolute left-5 top-5 z-20">
          <BackButton onClick={() => setLeaving(true)} />
        </div>
      }
    >
      <div className="mt-1 flex justify-center">
        <ProgressDots
          total={taskCount}
          current={Math.min(taskNumber, taskCount - 1)}
          label={copy.adventure.stageOf(taskNumber + 1, taskCount)}
        />
      </div>

      {/* ------------------------------------------------------ story beat */}
      {showingLines && line && (
        <div className="mt-8 flex flex-1 flex-col justify-center">
          <CharacterBubble
            who={line.who}
            mood={line.mood ?? 'idle'}
            size={168}
            speechKey={`${stage.id}-${phase}-${lineIndex}`}
          >
            {line.text}
          </CharacterBubble>

          <div className="mt-7 flex justify-center">
            <PrimaryButton onClick={advanceLine} tone="coral">
              {lastLine && stage.kind === 'story'
                ? (stage.cta ?? copy.common.continue)
                : copy.common.continue}
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- task */}
      {phase === 'task' && isTaskStage(stage) && (
        <div className="mt-6 flex-1 pb-4">
          <CharacterBubble
            who="lumi"
            mood={settled ? 'excited' : attempts > 1 ? 'thinking' : 'curious'}
            size={112}
            compact
            speechKey={`${stage.id}-${settled ? 'done' : attempts}`}
          >
            {settled
              ? pickPhrase(copy.feedback.right, index)
              : attempts > 1
                ? pickPhrase(copy.feedback.close, attempts)
                : promptText()}
          </CharacterBubble>

          <div className="mt-6">
            {stage.kind === 'numberChoice' && (
              <NumberChoice
                stage={stage}
                difficulty={difficulty}
                statusFor={statusFor}
                disabled={settled}
                onChoose={answer}
              />
            )}

            {stage.kind === 'guessReveal' && (
              <GuessReveal
                stage={stage}
                guessed={chosen}
                onGuess={(id) => {
                  setChosen(id);
                  setSettled(true);
                  record(true, true);
                }}
                onContinue={finishStage}
              />
            )}

            {stage.kind === 'reading' && (
              <Reading
                stage={stage}
                support={support}
                statusFor={statusFor}
                disabled={settled}
                onChoose={answer}
              />
            )}

            {stage.kind === 'mapFind' && (
              <MapFind
                stage={stage}
                support={support}
                chosen={chosen}
                correct={chosen === stage.answer}
                disabled={settled}
                onChoose={answer}
              />
            )}

            {stage.kind === 'drawing' && (
              <DrawingCanvas
                onSave={(dataUrl) => {
                  actions.saveDrawing({
                    id: `${adventure.id}-${stage.id}-${Date.now()}`,
                    adventureId: adventure.id,
                    prompt: stage.prompt,
                    dataUrl,
                    at: Date.now(),
                  });
                  record(true, true);
                  setSettled(true);
                  finishStage();
                }}
              />
            )}

            {stage.kind === 'reflection' && (
              <Reflection
                onDone={(text) => {
                  actions.saveReflection(adventure.id, text);
                  record(true, true);
                  setSettled(true);
                  finishStage();
                }}
              />
            )}
          </div>

          {/* Support is pulled, never pushed. */}
          {(stage.kind === 'numberChoice' ||
            stage.kind === 'reading' ||
            stage.kind === 'mapFind') && (
            <HintLadder
              hints={stage.hints}
              support={support}
              onAskForMore={() => setSupport(nextSupport(support))}
              visible={!settled}
            />
          )}

          <AnimatePresence>
            {settled && stage.kind !== 'guessReveal' && (
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-7 flex justify-center"
              >
                <PrimaryButton onClick={finishStage} tone="moss">
                  {copy.adventure.continue}
                </PrimaryButton>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* --------------------------------------------------- leave prompt */}
      <AnimatePresence>
        {leaving && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-xl bg-cream p-7 text-center shadow-float"
            >
              <h2 className="text-title text-ink">{copy.adventure.leaveTitle}</h2>
              <p className="mt-2 text-body text-ink-soft">{copy.adventure.leaveBody}</p>
              <div className="mt-6 flex flex-col gap-3">
                <PrimaryButton onClick={onLeave} tone="sky" size="md" full>
                  {copy.adventure.leaveConfirm}
                </PrimaryButton>
                <PrimaryButton
                  onClick={() => setLeaving(false)}
                  tone="coral"
                  variant="ghost"
                  size="md"
                  full
                >
                  {copy.adventure.leaveCancel}
                </PrimaryButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Screen>
  );
}
