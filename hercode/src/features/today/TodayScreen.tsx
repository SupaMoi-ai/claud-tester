import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, HeartHandshake, Moon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card, SectionTitle } from '../../components/Card';
import { TaskRow } from '../../components/TaskRow';
import { copy } from '../../copy';
import { buildDayPlan } from '../../domain/buildDayPlan';
import { CAPACITY_LABEL } from '../../domain/capacity';
import { isBefore18 } from '../../domain/date';
import type { Task } from '../../domain/types';
import { cn } from '../../lib/cn';
import { useHerCode } from '../../store/useHerCode';

const MOTION = { duration: 0.22, ease: [0.4, 0, 0.2, 1] as const };

function greeting(name: string, hour: number): string {
  if (hour < 12) return copy.today.greetingMorning(name);
  if (hour < 18) return copy.today.greetingAfternoon(name);
  return copy.today.greetingEvening(name);
}

export function TodayScreen({
  onOverwhelmed,
  onCantStart,
  onOpenCapacity,
  onWrapUpDay,
}: {
  onOverwhelmed: () => void;
  onCantStart: (task: Task) => void;
  onOpenCapacity: () => void;
  onWrapUpDay: () => void;
}) {
  const profile = useHerCode((s) => s.profile);
  const tasks = useHerCode((s) => s.tasks);
  const checkIns = useHerCode((s) => s.checkIns);
  const capacityByDay = useHerCode((s) => s.capacityByDay);
  const completeTask = useHerCode((s) => s.completeTask);
  const snoozeTask = useHerCode((s) => s.snoozeTask);
  const toggleTaskStep = useHerCode((s) => s.toggleTaskStep);
  const today = useHerCode((s) => s.today)();

  const [elseOpen, setElseOpen] = useState(false);

  const checkIn = checkIns[today] ?? null;
  const capacity = capacityByDay[today] ?? checkIn?.capacity ?? 'normal';
  const todaysTasks = useMemo(() => tasks.filter((t) => t.date === today), [tasks, today]);
  const plan = useMemo(
    () => buildDayPlan(todaysTasks, capacity, checkIn),
    [todaysTasks, capacity, checkIn],
  );

  const rowProps = (task: Task) => ({
    task,
    onComplete: () => completeTask(task.id),
    onSnooze: (when: Parameters<typeof snoozeTask>[1]) => snoozeTask(task.id, when),
    onCantStart: () => onCantStart(task),
    onToggleStep: (index: number) => toggleTaskStep(task.id, index),
  });

  const primaryTitle = capacity === 'light' ? copy.today.todaysOne : copy.today.todaysThree;

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-4 pb-28 pt-5">
      <h1 className="px-1 font-display text-[27px] leading-tight text-ink">
        {greeting(profile.name, new Date().getHours())}
      </h1>

      <button
        type="button"
        onClick={onOpenCapacity}
        className="tap mt-4 flex w-full items-stretch gap-2 rounded-card bg-surface p-2 text-left shadow-soft transition-colors duration-200 hover:bg-sand/25"
      >
        <ContextCell
          label={copy.today.contextEnergy}
          value={checkIn ? `${checkIn.energy}/5` : copy.today.noCheckIn}
        />
        <span className="w-px shrink-0 bg-line" aria-hidden />
        <ContextCell
          label={copy.today.contextBrain}
          value={checkIn ? copy.checkIn.brainOptions[checkIn.brain] : copy.today.noCheckIn}
        />
        <span className="w-px shrink-0 bg-line" aria-hidden />
        <ContextCell label={copy.today.contextCapacity} value={CAPACITY_LABEL[capacity]} />
      </button>

      {capacity === 'minimum' ? (
        <Card tone="sand" className="mt-4">
          <p className="text-[15px] font-medium text-ink">{copy.today.plan.minimumLead}</p>
          <ul className="mt-2 space-y-1">
            {plan.essentials.map((task) => (
              <li key={task.id} className="text-[16px] leading-snug text-ink">
                {task.title}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[15px] text-ink/75">{copy.today.plan.minimum}</p>
          {plan.suppressedReminderIds.length > 0 ? (
            <p className="mt-2 text-[13px] leading-snug text-muted">
              {copy.today.suppressed(plan.suppressedReminderIds.length)}
            </p>
          ) : null}
        </Card>
      ) : null}

      {/* At bare minimum the card above is the whole plan, so this section
          would only repeat it. */}
      {capacity !== 'minimum' ? (
      <section className="mt-6">
        <SectionTitle right={plan.message}>{primaryTitle}</SectionTitle>
        <AnimatePresence initial={false} mode="popLayout">
          {plan.primary.length > 0 ? (
            <motion.div layout className="space-y-2" transition={MOTION}>
              {plan.primary.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={MOTION}
                >
                  <TaskRow {...rowProps(task)} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.p
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={MOTION}
              className="px-1 text-[15px] text-muted"
            >
              {copy.today.emptyPrimary}
            </motion.p>
          )}
        </AnimatePresence>
      </section>
      ) : null}

      {plan.stretch ? (
        <section className="mt-6">
          <SectionTitle right={copy.today.stretchHint}>{copy.today.stretch}</SectionTitle>
          <TaskRow {...rowProps(plan.stretch)} muted />
        </section>
      ) : null}

      {plan.fixed.length > 0 ? (
        <section className="mt-6">
          <SectionTitle>{copy.today.fixed}</SectionTitle>
          <div className="space-y-2">
            {plan.fixed.map((task) => (
              <TaskRow key={task.id} {...rowProps(task)} />
            ))}
          </div>
        </section>
      ) : null}

      {capacity !== 'minimum' && plan.essentials.length > 0 ? (
        <section className="mt-6">
          <SectionTitle>{copy.today.essentials}</SectionTitle>
          <div className="space-y-2">
            {plan.essentials.map((task) => (
              <TaskRow key={task.id} {...rowProps(task)} />
            ))}
          </div>
        </section>
      ) : null}

      {plan.everythingElse.length > 0 ? (
        <section className="mt-6">
          <button
            type="button"
            onClick={() => setElseOpen((v) => !v)}
            aria-expanded={elseOpen}
            className="tap flex w-full items-center justify-between gap-2 rounded-card px-1 text-left"
          >
            <span className="font-display text-[19px] text-ink">
              {copy.today.everythingElseCount(plan.everythingElse.length)}
            </span>
            <ChevronDown
              size={18}
              aria-hidden
              className={cn(
                'shrink-0 text-muted transition-transform duration-200',
                elseOpen && 'rotate-180',
              )}
            />
          </button>

          <AnimatePresence initial={false}>
            {elseOpen ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={MOTION}
                className="overflow-hidden"
              >
                <p className="px-1 pb-2 pt-1 text-[13px] text-muted">
                  {copy.today.everythingElseHint}
                </p>
                <div className="space-y-2">
                  {plan.everythingElse.map((task) => (
                    <TaskRow key={task.id} {...rowProps(task)} muted />
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </section>
      ) : null}

      <button
        type="button"
        onClick={onOverwhelmed}
        className="tap mt-8 flex w-full items-center justify-center gap-2 rounded-card bg-apricot/70 px-5 text-[16px] font-medium text-ink shadow-soft transition-colors duration-200 hover:bg-apricot"
      >
        <HeartHandshake size={18} aria-hidden />
        {copy.today.overwhelmed}
      </button>

      {/* The day is worth wrapping up only once it is nearly over. It stays
          reachable from Me at any hour. */}
      {!isBefore18(new Date()) ? (
        <button
          type="button"
          onClick={onWrapUpDay}
          className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-card bg-surface px-5 text-[15px] font-medium text-ink shadow-soft transition-colors duration-200 hover:bg-sand/40"
        >
          <Moon size={17} aria-hidden />
          {copy.review.entry}
        </button>
      ) : null}
    </div>
  );
}

function ContextCell({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex min-w-0 flex-1 flex-col items-center justify-center px-1 py-1.5">
      <span className="text-[11px] uppercase tracking-wide text-muted">{label}</span>
      <span className="mt-0.5 w-full truncate text-center text-[14px] leading-snug text-ink">
        {value}
      </span>
    </span>
  );
}
