import { describe, expect, it } from 'vitest';
import { buildDayPlan } from '../domain/buildDayPlan';
import type { CheckIn, Task } from '../domain/types';
import { createSeed } from '../mock/seed';

const TODAY = '2026-09-21';

function todaysTasks(): Task[] {
  return createSeed(TODAY).tasks;
}

const titles = (tasks: Task[]) => tasks.map((t) => t.title);

describe('buildDayPlan', () => {
  it('splits the day into three buckets that never overlap', () => {
    const plan = buildDayPlan(todaysTasks(), 'normal');
    const ids = [
      ...plan.fixed,
      ...plan.essentials,
      ...plan.primary,
      ...(plan.stretch ? [plan.stretch] : []),
      ...plan.everythingElse,
    ].map((t) => t.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('never drops a task, whatever the capacity', () => {
    const tasks = todaysTasks();
    const open = tasks.filter((t) => t.status === 'todo').length;

    for (const capacity of ['minimum', 'light', 'normal', 'high'] as const) {
      const plan = buildDayPlan(tasks, capacity);
      const surfaced =
        plan.fixed.length +
        plan.essentials.length +
        plan.primary.length +
        (plan.stretch ? 1 : 0) +
        plan.everythingElse.length;
      expect(surfaced).toBe(open);
    }
  });

  it('shows only fixed items and essentials at bare minimum', () => {
    const plan = buildDayPlan(todaysTasks(), 'minimum');

    expect(plan.primary).toEqual([]);
    expect(plan.stretch).toBeNull();
    expect(titles(plan.essentials)).toEqual([
      'Eat lunch',
      'Pick up Ellie at 15:30',
      'Take medication',
    ]);
    expect(plan.message).toBe('Everything else can move.');
    expect(plan.suppressedReminderIds.length).toBeGreaterThan(0);
  });

  it('surfaces one primary task at light capacity', () => {
    const plan = buildDayPlan(todaysTasks(), 'light');
    expect(plan.primary).toHaveLength(1);
    expect(plan.stretch).toBeNull();
    expect(plan.suppressedReminderIds).toEqual([]);
  });

  it("surfaces Today's 3 at normal capacity", () => {
    const plan = buildDayPlan(todaysTasks(), 'normal');
    expect(titles(plan.primary)).toEqual(['Call insurance', 'Buy shampoo', 'Laundry']);
    expect(plan.stretch).toBeNull();
  });

  it("adds one optional stretch task on top of Today's 3 at high capacity", () => {
    const plan = buildDayPlan(todaysTasks(), 'high');
    expect(plan.primary).toHaveLength(3);
    expect(plan.stretch?.title).toBe('Clean kitchen');
  });

  it('puts the most-moved task first, so it stops being invisible', () => {
    const plan = buildDayPlan(todaysTasks(), 'normal');
    expect(plan.primary[0]?.title).toBe('Call insurance');
    expect(plan.primary[0]?.postponeCount).toBe(3);
  });

  it('trims one slot when she reports a foggy brain', () => {
    const checkIn: CheckIn = {
      date: TODAY,
      energy: 2,
      brain: 'foggy',
      capacity: 'normal',
      feelings: [],
    };
    expect(buildDayPlan(todaysTasks(), 'normal', checkIn).primary).toHaveLength(2);
  });

  it('ignores a skipped check-in', () => {
    const checkIn: CheckIn = {
      date: TODAY,
      energy: 3,
      brain: 'foggy',
      capacity: 'normal',
      feelings: [],
      skipped: true,
    };
    expect(buildDayPlan(todaysTasks(), 'normal', checkIn).primary).toHaveLength(3);
  });

  it('leaves completed tasks out of the plan without deleting them', () => {
    const tasks = todaysTasks().map((t) =>
      t.id === 'task-insurance' ? { ...t, status: 'done' as const } : t,
    );
    const plan = buildDayPlan(tasks, 'normal');
    expect(titles(plan.primary)).not.toContain('Call insurance');
    expect(tasks.find((t) => t.id === 'task-insurance')).toBeDefined();
  });

  it('is pure: the same arguments give the same plan', () => {
    const tasks = todaysTasks();
    expect(buildDayPlan(tasks, 'normal')).toEqual(buildDayPlan(tasks, 'normal'));
  });
});
