import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Clock, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { copy } from '../copy';
import type { Task } from '../domain/types';
import { cn } from '../lib/cn';
import type { SnoozeWhen } from '../store/useHerCode';
import { Tag } from './Chip';

const MOTION = { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const };

export function TaskRow({
  task,
  onComplete,
  onSnooze,
  onCantStart,
  onToggleStep,
  muted = false,
}: {
  task: Task;
  onComplete: () => void;
  onSnooze: (when: SnoozeWhen) => void;
  onCantStart: () => void;
  onToggleStep?: (index: number) => void;
  muted?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wellMoved = task.postponeCount >= 3;

  return (
    <div
      className={cn(
        'rounded-card bg-surface px-3 py-2 shadow-soft transition-colors duration-200',
        muted && 'bg-surface/70',
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onComplete}
          aria-label={`${copy.taskActions.complete}: ${task.title}`}
          className="tap flex shrink-0 items-center justify-center"
        >
          <span
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors duration-200',
              task.status === 'done'
                ? 'border-sage bg-sage text-ink'
                : 'border-ink/20 hover:border-ink/45',
            )}
          >
            {task.status === 'done' ? <Check size={15} strokeWidth={3} aria-hidden /> : null}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="tap min-w-0 flex-1 py-1 text-left"
        >
          <span className="flex items-center gap-2">
            <span
              className={cn(
                'min-w-0 break-words text-[16px] leading-snug text-ink',
                task.status === 'done' && 'text-muted line-through',
              )}
            >
              {task.title}
            </span>
            <ChevronDown
              size={16}
              aria-hidden
              className={cn(
                'shrink-0 text-muted transition-transform duration-200',
                open && 'rotate-180',
              )}
            />
          </span>

          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {task.start ? (
              <span className="inline-flex items-center gap-1 text-[13px] text-muted">
                <Clock size={12} aria-hidden />
                {task.start}
              </span>
            ) : (
              <span className="text-[13px] text-muted">{task.durationMin} min</span>
            )}
            {task.postponeCount > 0 ? (
              <Tag tone={wellMoved ? 'apricot' : 'neutral'}>
                {copy.today.movedNote(task.postponeCount)}
              </Tag>
            ) : null}
          </span>
        </button>
      </div>

      {task.steps && task.steps.length > 0 ? (
        <ol className="mt-2 space-y-1.5 border-t border-line pt-2">
          {task.steps.map((step, i) => (
            <li key={`${step.text}-${i}`}>
              <button
                type="button"
                onClick={() => onToggleStep?.(i)}
                className="tap flex w-full items-center gap-2 rounded-chip px-1 text-left"
              >
                <span
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border',
                    step.done ? 'border-sage bg-sage' : 'border-ink/20',
                  )}
                  aria-hidden
                >
                  {step.done ? <Check size={11} strokeWidth={3} /> : null}
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 break-words text-[14px] leading-snug',
                    step.done ? 'text-muted line-through' : 'text-ink/85',
                  )}
                >
                  {step.text}
                </span>
                <span className="shrink-0 text-[12px] text-muted">
                  {copy.ai.stepMinutes(step.minutes)}
                </span>
              </button>
            </li>
          ))}
        </ol>
      ) : null}

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={MOTION}
            className="overflow-hidden"
          >
            <div className="mt-2 flex flex-wrap gap-1.5 border-t border-line pt-2">
              <RowAction onClick={onCantStart} tone="attention">
                <Sparkles size={14} aria-hidden />
                {copy.taskActions.cantStart}
              </RowAction>
              <RowAction onClick={() => onSnooze('later-today')}>
                {copy.taskActions.snoozeLaterToday}
              </RowAction>
              <RowAction onClick={() => onSnooze('tomorrow')}>
                {copy.taskActions.snoozeTomorrow}
              </RowAction>
              <RowAction onClick={() => onSnooze('someday')}>
                {copy.taskActions.snoozeSomeday}
              </RowAction>
            </div>

            {wellMoved ? (
              <p className="mt-2 rounded-card bg-apricot/40 px-3 py-2 text-[13px] leading-snug text-ink">
                {copy.today.twoMinuteOffer}
              </p>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function RowAction({
  children,
  onClick,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'neutral' | 'attention';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'tap inline-flex items-center gap-1.5 rounded-chip px-3 py-1.5 text-[14px] transition-colors duration-200',
        tone === 'attention'
          ? 'bg-apricot/60 text-ink hover:bg-apricot'
          : 'bg-bg text-ink/75 hover:bg-sand/50',
      )}
    >
      {children}
    </button>
  );
}
