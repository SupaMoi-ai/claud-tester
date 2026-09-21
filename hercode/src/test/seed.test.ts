import { describe, expect, it } from 'vitest';
import { dateOf, hourOf } from '../domain/date';
import { categorizeDump, setAIDelay, stepsFor } from '../mock/mockAI';
import { CURRENT_CYCLE_DAY, createSeed, HISTORY_DAYS } from '../mock/seed';

const TODAY = '2026-09-21';

setAIDelay(0);

describe('seed', () => {
  it('is deterministic, so Patterns is computed rather than invented', () => {
    expect(createSeed(TODAY)).toEqual(createSeed(TODAY));
  });

  it('covers about ninety days of history', () => {
    const { history } = createSeed(TODAY);
    const days = new Set(history.map((e) => dateOf(e.timestamp)));
    expect(days.size).toBeGreaterThanOrEqual(HISTORY_DAYS - 5);
    expect(history.length).toBeGreaterThan(200);
  });

  it('seeds Call insurance as moved three times', () => {
    const task = createSeed(TODAY).tasks.find((t) => t.id === 'task-insurance');
    expect(task?.postponeCount).toBe(3);
  });

  it('lands on cycle day 21 with roughly three cycles of manual data', () => {
    const { cycleLogs } = createSeed(TODAY);
    expect(cycleLogs.at(-1)?.cycleDay).toBe(CURRENT_CYCLE_DAY);
    expect(cycleLogs.length).toBeGreaterThan(50);
  });

  it('plants the morning-calls pattern in real events', () => {
    const calls = createSeed(TODAY).history.filter((e) => e.taskCategory === 'call');
    const completed = calls.filter((e) => e.type === 'task-completed');
    const beforeNoon = completed.filter((e) => hourOf(e.timestamp) < 12);

    expect(completed.length).toBeGreaterThan(20);
    expect(beforeNoon.length / completed.length).toBeGreaterThan(0.6);
  });

  it('plants the small-steps pattern in real events', () => {
    const household = createSeed(TODAY).history.filter(
      (e) =>
        e.taskCategory === 'household' &&
        (e.type === 'task-completed' || e.type === 'task-moved'),
    );

    const rate = (withSteps: boolean) => {
      const group = household.filter((e) => e.hadSmallSteps === withSteps);
      const done = group.filter((e) => e.type === 'task-completed').length;
      return group.length === 0 ? 0 : done / group.length;
    };

    expect(rate(true)).toBeGreaterThan(rate(false));
  });

  it('records every capacity per day', () => {
    const { capacityByDay } = createSeed(TODAY);
    expect(Object.keys(capacityByDay)).toHaveLength(HISTORY_DAYS);
  });
});

describe('mock AI', () => {
  it("splits a brain dump the way the spec's example reads", () => {
    const drafts = categorizeDump(
      'Need to buy Ellie rain boots, book hair appointment, remember that green lamp I liked and maybe tacos Thursday',
    );
    const byCategory = Object.fromEntries(
      drafts.map((d) => [d.category, d.text.toLowerCase()]),
    );

    expect(byCategory.shopping).toContain('ellie rain boots');
    expect(byCategory.appointment).toContain('hair appointment');
    expect(byCategory.idea).toContain('green lamp');
    expect(byCategory.meal).toContain('tacos');
  });

  it('breaks Clean kitchen into the three small steps', () => {
    const task = createSeed(TODAY).tasks.find((t) => t.id === 'task-kitchen');
    if (!task) throw new Error('Clean kitchen is missing from the seed');

    const steps = stepsFor(task);
    expect(steps.map((s) => s.text)).toEqual([
      'Put cups and plates in the dishwasher',
      'Clear one counter',
      'Take the rubbish out',
    ]);
    expect(steps.every((s) => s.minutes < 10)).toBe(true);
  });
});
