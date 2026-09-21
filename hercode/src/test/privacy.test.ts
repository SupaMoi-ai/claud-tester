import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { addDays } from '../domain/date';
import {
  projectForPartner,
  type PartnerReadableState,
} from '../domain/projectForPartner';
import type { PartnerSignal, SharingSettings, Task } from '../domain/types';
import { createSeed } from '../mock/seed';

/**
 * Privacy is a product feature, so it is a test rather than a promise.
 *
 * projectForPartner is the only thing BroCode reads. If anything private can
 * reach it, this file is where that shows up.
 */

const TODAY = '2026-09-21';

function stateFrom(
  overrides: {
    sharing?: { categories?: Partial<SharingSettings['categories']>; cycleDetail?: boolean };
    signal?: PartnerSignal | null;
  } = {},
): PartnerReadableState {
  const seed = createSeed(TODAY);
  return {
    profile: {
      name: seed.profile.name,
      partnerName: seed.profile.partnerName,
      partnerConnected: seed.profile.partnerConnected,
    },
    tasks: seed.tasks,
    sharing: {
      categories: { ...seed.sharing.categories, ...overrides.sharing?.categories },
      cycleDetail: overrides.sharing?.cycleDetail ?? seed.sharing.cycleDetail,
    },
    partnerSignal: overrides.signal ?? null,
    decisionRules: seed.decisionRules,
    cycleLogs: seed.cycleLogs,
  };
}

const serialise = (value: unknown) => JSON.stringify(value).toLowerCase();

describe('projectForPartner', () => {
  it('shares nothing at all by default', () => {
    const projection = projectForPartner(stateFrom(), TODAY);

    expect(projection.signal).toBeNull();
    expect(projection.hasSharedToday).toBe(false);
    expect(projection.canTakeOver).toEqual([]);
    expect(projection.cycleDetail).toBeNull();
    expect(projection.visibleSummary).toEqual([]);
  });

  it('leaks no private data into the projection', () => {
    const seed = createSeed(TODAY);
    const projection = projectForPartner(stateFrom(), TODAY);
    const output = serialise(projection);

    // Nothing she wrote down.
    for (const item of seed.brainItems) {
      expect(output).not.toContain(item.text.toLowerCase());
      expect(output).not.toContain(item.raw.toLowerCase());
    }

    // No mood, no feelings, no reported energy.
    for (const checkIn of Object.values(seed.checkIns)) {
      for (const feeling of checkIn.feelings) {
        expect(output).not.toContain(`"${feeling.toLowerCase()}"`);
      }
    }

    // No cycle data of any kind.
    expect(output).not.toContain('cycleday');
    expect(output).not.toContain('cramps');
    expect(output).not.toContain('headache');
    expect(output).not.toContain('overwhelm');

    // No private task ever surfaces, whatever its category.
    for (const task of seed.tasks.filter((t) => t.sensitivity === 'private')) {
      expect(output).not.toContain(task.title.toLowerCase());
    }
  });

  it('keeps private tasks out even when every category is switched on', () => {
    const projection = projectForPartner(
      stateFrom({
        sharing: {
          categories: {
            appointment: true,
            household: true,
            shopping: true,
            family: true,
          },
        },
      }),
      TODAY,
    );

    const output = serialise(projection);
    const seed = createSeed(TODAY);

    expect(output).not.toContain('call insurance'); // private, category 'call'
    expect(output).not.toContain('take medication'); // private, category 'self'
    expect(output).not.toContain("reply to ellie's school email"); // private, 'admin'

    const sharedTitles = seed.tasks
      .filter((t) => t.sensitivity === 'shared' && t.status === 'todo')
      .map((t) => t.title);
    expect(sharedTitles.length).toBeGreaterThan(0);
  });

  it('adds only the category she turned on', () => {
    const projection = projectForPartner(
      stateFrom({ sharing: { categories: { shopping: true } } }),
      TODAY,
    );

    expect(projection.hasSharedToday).toBe(true);
    expect(projection.visibleSummary).toEqual(['Shopping']);

    const fromTasks = projection.canTakeOver.filter((t) => !t.id.startsWith('rule-'));
    expect(fromTasks.map((t) => t.title)).toEqual(['Grocery delivery', 'Buy shampoo']);
  });

  it('shows the cycle day only after the explicit toggle', () => {
    expect(projectForPartner(stateFrom(), TODAY).cycleDetail).toBeNull();

    const shared = projectForPartner(
      stateFrom({ sharing: { cycleDetail: true } }),
      TODAY,
    );
    expect(shared.cycleDetail).toEqual({ cycleDay: 21 });
    expect(shared.visibleSummary).toContain('Cycle day 21');
  });

  it('never shows symptoms, even with the cycle day shared', () => {
    const projection = projectForPartner(
      stateFrom({ sharing: { cycleDetail: true } }),
      TODAY,
    );
    const output = serialise(projection);

    expect(output).not.toContain('cramps');
    expect(output).not.toContain('sensitivity');
    expect(output).not.toContain('socialenergy');
    expect(Object.keys(projection.cycleDetail ?? {})).toEqual(['cycleDay']);
  });

  it("drops a signal once its day is over", () => {
    const yesterday: PartnerSignal = { value: 'low-capacity', date: addDays(TODAY, -1) };
    const today: PartnerSignal = { value: 'low-capacity', date: TODAY };

    expect(projectForPartner(stateFrom({ signal: yesterday }), TODAY).signal).toBeNull();
    expect(projectForPartner(stateFrom({ signal: today }), TODAY).signal).toEqual({
      label: 'Low capacity',
      expiresEndOfDay: true,
    });
  });

  it('tailors the one helpful line to the signal she chose', () => {
    const none = projectForPartner(stateFrom(), TODAY);
    const quiet = projectForPartner(
      stateFrom({ signal: { value: 'need-quiet', date: TODAY } }),
      TODAY,
    );

    expect(quiet.helpfulToday).not.toBe(none.helpfulToday);
    expect(quiet.helpfulToday).toContain('quiet');
  });

  it('leaves a completed shared task behind', () => {
    const base = stateFrom({ sharing: { categories: { household: true } } });
    const done: Task[] = base.tasks.map((t) =>
      t.id === 'task-laundry' ? { ...t, status: 'done' as const } : t,
    );

    const projection = projectForPartner({ ...base, tasks: done }, TODAY);
    expect(serialise(projection)).not.toContain('laundry');
  });

  it('is pure: the same state gives the same projection', () => {
    expect(projectForPartner(stateFrom(), TODAY)).toEqual(
      projectForPartner(stateFrom(), TODAY),
    );
  });
});

describe('BroCode preview', () => {
  it('reads the projection and never the store', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../features/partner/BroCodePreview.tsx', import.meta.url)),
      'utf8',
    );

    expect(source).not.toContain('useHerCode');
    expect(source).not.toContain('store/');
  });
});
