import { copy } from '../copy';
import { allowsStretch, PRIMARY_SLOTS, suppressesReminders } from './capacity';
import { minutesOfDay } from './date';
import type { CapacityLevel, CheckIn, Task } from './types';

/**
 * The plan for one day.
 *
 * Nothing is ever removed: everything the plan does not surface sits in
 * `everythingElse`, collapsed in the UI and one tap away.
 */
export interface DayPlan {
  capacity: CapacityLevel;
  /** Appointments and other fixed commitments. Always shown. */
  fixed: Task[];
  /** Eat lunch, take medication, school pickup. Always shown. */
  essentials: Task[];
  /** "Today's 3" — 0, 1 or 3 flexible tasks depending on capacity. */
  primary: Task[];
  /** One optional extra, only when capacity is high. */
  stretch: Task | null;
  /** Everything the plan chose not to surface. Collapsed, never deleted. */
  everythingElse: Task[];
  message: string;
  /** Reminder ids bare-minimum mode is hiding, so the app can say what it hid. */
  suppressedReminderIds: string[];
}

const PLAN_MESSAGE: Record<CapacityLevel, string> = {
  minimum: copy.today.plan.minimum,
  light: copy.today.plan.light,
  normal: copy.today.plan.normal,
  high: copy.today.plan.high,
};

/** Fixed items sort by clock time; everything else keeps a stable, useful order. */
function byStartTime(a: Task, b: Task): number {
  const at = a.start ? minutesOfDay(a.start) : Number.MAX_SAFE_INTEGER;
  const bt = b.start ? minutesOfDay(b.start) : Number.MAX_SAFE_INTEGER;
  return at - bt;
}

/**
 * Tasks she has already moved several times come first: they are the ones
 * quietly costing her attention. After that, shorter tasks win, because a
 * short task is easier to start.
 */
function byPriority(a: Task, b: Task): number {
  if (a.postponeCount !== b.postponeCount) return b.postponeCount - a.postponeCount;
  if (a.durationMin !== b.durationMin) return a.durationMin - b.durationMin;
  return a.title.localeCompare(b.title);
}

/** A check-in reporting a foggy brain trims one slot, even at normal capacity. */
function slotsFor(capacity: CapacityLevel, checkIn?: CheckIn | null): number {
  const base = PRIMARY_SLOTS[capacity];
  if (!checkIn || checkIn.skipped) return base;
  if (base > 1 && checkIn.brain === 'foggy') return base - 1;
  return base;
}

/**
 * Turns the day's tasks into what she actually sees on Today.
 *
 * Pure: no Date.now(), no store access. Given the same arguments it always
 * returns the same plan, which is what makes the capacity switch instant and
 * the tests meaningful.
 */
export function buildDayPlan(
  tasks: Task[],
  capacity: CapacityLevel,
  checkIn?: CheckIn | null,
): DayPlan {
  const open = tasks.filter((t) => t.status === 'todo');

  // Three buckets that never overlap. Essential wins, because an essential
  // appointment belongs on the "today, enough is" line, not in a second list.
  const essentials = open.filter((t) => t.essential).sort(byStartTime);
  const fixed = open.filter((t) => !t.essential && t.kind === 'fixed').sort(byStartTime);
  const candidates = open
    .filter((t) => !t.essential && t.kind !== 'fixed')
    .sort(byPriority);

  const slots = slotsFor(capacity, checkIn);
  const primary = candidates.slice(0, slots);
  const rest = candidates.slice(slots);

  const stretch = allowsStretch(capacity) && rest.length > 0 ? (rest[0] ?? null) : null;
  const everythingElse = stretch ? rest.slice(1) : rest;

  const suppressedReminderIds = suppressesReminders(capacity)
    ? candidates.map((t) => t.id)
    : [];

  return {
    capacity,
    fixed,
    essentials,
    primary,
    stretch,
    everythingElse,
    message: PLAN_MESSAGE[capacity],
    suppressedReminderIds,
  };
}
