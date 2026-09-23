import { describe, expect, it } from 'vitest';
import {
  buildInsights,
  callsBeforeNoon,
  capacityAfterSocialEvenings,
  energyAroundCyclePhase,
  steppedHouseholdCompletion,
  whatHelpsMost,
  type InsightInput,
  type InsightResult,
} from '../domain/insights';
import { atTime } from '../domain/date';
import type { HistoryEvent, Review } from '../domain/types';
import { createSeed } from '../mock/seed';

const TODAY = '2026-09-21';

function inputFromSeed(overrides: Partial<InsightInput> = {}): InsightInput {
  const seed = createSeed(TODAY);
  return {
    events: seed.history,
    tasks: seed.tasks,
    checkIns: Object.values(seed.checkIns),
    reviews: Object.values(seed.reviews),
    cycleLogs: seed.cycleLogs,
    cycleConsent: true,
    today: TODAY,
    ...overrides,
  };
}

const empty: InsightInput = {
  events: [],
  tasks: [],
  checkIns: [],
  reviews: [],
  cycleLogs: [],
  cycleConsent: true,
  today: TODAY,
};

function ok(result: InsightResult) {
  if (result.status !== 'ok') {
    throw new Error(`expected ${result.id} to have enough data, got ${result.status}`);
  }
  return result;
}

describe('insights', () => {
  it('finds the morning-calls pattern, with the rows it came from', () => {
    const result = ok(callsBeforeNoon(inputFromSeed()));

    expect(result.text).toBe('You tend to complete phone calls more often before 12:00.');
    expect(result.sampleSize).toBeGreaterThan(20);

    const chart = result.chart;
    if (chart.kind !== 'bar') throw new Error('expected a bar chart');
    expect(chart.bars[0]?.value).toBeGreaterThan(chart.bars[1]?.value ?? 0);

    // Every evidence row is real: the two counts add up to the sample.
    const [before, after] = result.evidenceRows;
    expect(before?.value).toContain(`of ${result.sampleSize}`);
    expect(after?.value).toContain(`of ${result.sampleSize}`);
  });

  it('finds the capacity drop after two social evenings', () => {
    const result = ok(capacityAfterSocialEvenings(inputFromSeed()));

    expect(result.text).toMatch(
      /^You reported low capacity on \d+ of the last \d+ days after two consecutive social evenings\.$/,
    );

    const chart = result.chart;
    if (chart.kind !== 'dots') throw new Error('expected a dots chart');
    expect(chart.dots.length).toBeLessThanOrEqual(6);
    expect(chart.dots.filter((d) => d.on).length).toBeGreaterThanOrEqual(4);
    expect(result.evidenceRows).toHaveLength(chart.dots.length);
  });

  it('finds the higher-energy window, and marks where she is now', () => {
    const result = ok(energyAroundCyclePhase(inputFromSeed()));

    expect(result.text).toBe(
      'Your average energy has been higher around this part of your cycle during your last three cycles.',
    );

    // The claim is the first two evidence rows: around now vs other days.
    const [aroundNow, otherDays] = result.evidenceRows;
    const value = (row?: { value: string }) => Number(row?.value.split(' ')[0]);
    expect(value(aroundNow)).toBeGreaterThan(value(otherDays));

    // The chart shows the same comparison the sentence makes.
    const chart = result.chart;
    if (chart.kind !== 'bar') throw new Error('expected a bar chart');
    expect(chart.bars).toHaveLength(2);
    expect(chart.bars[0]?.highlight).toBe(true);
    expect(chart.bars[0]?.label).toMatch(/^Around cycle day \d+-\d+$/);
    expect(chart.bars[0]?.value).toBeGreaterThan(chart.bars[1]?.value ?? 0);
  });

  it('says energy is level rather than higher when the window is not higher', () => {
    const seed = inputFromSeed();
    // Flatten every check-in, so no window can stand out.
    const flat = seed.checkIns.map((c) => ({ ...c, energy: 3 }));
    const result = ok(energyAroundCyclePhase({ ...seed, checkIns: flat }));

    expect(result.text).toContain('about the same');
  });

  it('finds that small steps carry household tasks over the line', () => {
    const result = ok(steppedHouseholdCompletion(inputFromSeed()));

    const chart = result.chart;
    if (chart.kind !== 'bar') throw new Error('expected a bar chart');
    expect(chart.bars[0]?.value).toBeGreaterThan(chart.bars[1]?.value ?? 0);
    expect(result.evidenceRows[0]?.detail).toMatch(/^\d+ of \d+ finished$/);
  });

  it('reads what she said helped, from her own reviews', () => {
    const result = ok(whatHelpsMost(inputFromSeed()));

    expect(result.text).toMatch(
      /^You have reported that .+ helped on \d+ of the \d+ days you wrapped up\.$/,
    );

    const chart = result.chart;
    if (chart.kind !== 'bar') throw new Error('expected a bar chart');
    expect(chart.bars[0]?.highlight).toBe(true);

    // The headline tag really is the most frequent one.
    const counts = chart.bars.map((b) => b.value);
    expect(counts[0]).toBe(Math.max(...counts));
    expect(result.text).toContain(chart.bars[0]?.label ?? '');
  });

  it('moves when she wraps up one more day', () => {
    const base = inputFromSeed();
    const before = ok(whatHelpsMost(base));

    const extra: Review = {
      date: TODAY,
      capacity: 4,
      helped: ['quiet time'],
      harder: [],
    };

    const after = ok(whatHelpsMost({ ...base, reviews: [...base.reviews, extra] }));

    expect(after.sampleSize).toBe(before.sampleSize + 1);
    expect(after.evidenceRows).not.toEqual(before.evidenceRows);
  });

  it('ignores a review she skipped', () => {
    const base = inputFromSeed();
    const skipped: Review = {
      date: TODAY,
      capacity: 3,
      helped: [],
      harder: [],
      skipped: true,
    };

    expect(whatHelpsMost({ ...base, reviews: [...base.reviews, skipped] }).sampleSize).toBe(
      ok(whatHelpsMost(base)).sampleSize,
    );
  });

  it('says nothing at all when there is too little data', () => {
    for (const insight of [
      callsBeforeNoon,
      capacityAfterSocialEvenings,
      energyAroundCyclePhase,
      steppedHouseholdCompletion,
      whatHelpsMost,
    ]) {
      expect(insight(empty).status).toBe('insufficient');
    }
  });

  it('leaves the cycle out entirely when she has not opted in', () => {
    const withConsent = buildInsights(inputFromSeed({ cycleConsent: true }));
    const without = buildInsights(inputFromSeed({ cycleConsent: false }));

    expect(withConsent.map((i) => i.id)).toContain('energy-around-cycle');
    expect(without.map((i) => i.id)).not.toContain('energy-around-cycle');
    expect(energyAroundCyclePhase(inputFromSeed({ cycleConsent: false })).status).toBe(
      'insufficient',
    );
  });

  it('moves a chart when she finishes a household task today', () => {
    const base = inputFromSeed();
    const before = ok(steppedHouseholdCompletion(base));

    // What the store's record() helper appends on a completion with steps.
    const completion: HistoryEvent = {
      id: 'evt-test-1',
      type: 'task-completed',
      taskId: 'task-laundry',
      timestamp: atTime(TODAY, 10, 15),
      capacityAtTime: 'normal',
      taskCategory: 'household',
      hadSmallSteps: true,
    };

    const after = ok(
      steppedHouseholdCompletion({ ...base, events: [...base.events, completion] }),
    );

    expect(after.sampleSize).toBe(before.sampleSize + 1);
    expect(after.evidenceRows).not.toEqual(before.evidenceRows);
  });

  it('is pure: the same input gives the same insights', () => {
    expect(buildInsights(inputFromSeed())).toEqual(buildInsights(inputFromSeed()));
  });
});
