import { copy } from '../copy';
import { addDays, dateOf, daysBetween, hourOf, weekdayName } from './date';
import type {
  CapacityLevel,
  CheckIn,
  CycleLog,
  HistoryEvent,
  ISODate,
  Review,
  Task,
} from './types';

/**
 * Patterns, computed.
 *
 * Every insight here reads the append-only history, the check-ins and the
 * cycle logs. Nothing is written by hand, which is why "Why am I seeing this?"
 * can show the rows the sentence came from, and why finishing a task today
 * moves a chart.
 */

export interface EvidenceRow {
  label: string;
  value: string;
  detail?: string;
}

export interface ChartBar {
  label: string;
  value: number;
  /** What to print, when the raw number is not what a reader wants. */
  display?: string;
  highlight?: boolean;
}

export type ChartSpec =
  | { kind: 'bar'; bars: ChartBar[]; unit: string }
  | { kind: 'dots'; dots: { label: string; on: boolean }[] };

export type InsightId =
  | 'calls-before-noon'
  | 'capacity-after-social'
  | 'energy-around-cycle'
  | 'stepped-household';

export type InsightResult =
  | {
      status: 'ok';
      id: InsightId;
      text: string;
      evidenceRows: EvidenceRow[];
      sampleSize: number;
      chart: ChartSpec;
    }
  | { status: 'insufficient'; id: InsightId; sampleSize: number };

export interface InsightInput {
  events: HistoryEvent[];
  tasks: Task[];
  checkIns: CheckIn[];
  reviews: Review[];
  cycleLogs: CycleLog[];
  cycleConsent: boolean;
  today: ISODate;
}

/** Below these, an insight would be reading noise. */
const MIN_CALLS = 8;
const MIN_SOCIAL_OCCURRENCES = 4;
const MIN_CYCLE_ENTRIES = 20;
const MIN_HOUSEHOLD = 10;

const SOCIAL_WINDOW = 6;
export const CYCLE_LENGTH = 28;
/** Days either side of today's cycle day that count as "around now". */
const CYCLE_WINDOW = 3;
const CYCLE_BLOCKS: Array<[number, number]> = [
  [1, 7],
  [8, 14],
  [15, 21],
  [22, 28],
];

const LOW_CAPACITY: CapacityLevel[] = ['minimum', 'light'];

function insufficient(id: InsightId, sampleSize: number): InsightResult {
  return { status: 'insufficient', id, sampleSize };
}

function timeOf(timestamp: string): string {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// --- 1. calls -------------------------------------------------------------

/** Phone calls she finished, split on midday. */
export function callsBeforeNoon(input: InsightInput): InsightResult {
  const completed = input.events.filter(
    (e) => e.taskCategory === 'call' && e.type === 'task-completed',
  );

  if (completed.length < MIN_CALLS) return insufficient('calls-before-noon', completed.length);

  const before = completed.filter((e) => hourOf(e.timestamp) < 12);
  const after = completed.length - before.length;

  const recent = [...completed]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5)
    .map(
      (e): EvidenceRow => ({
        label: dateOf(e.timestamp),
        value: timeOf(e.timestamp),
        detail: copy.patterns.evidence.recentCall,
      }),
    );

  return {
    status: 'ok',
    id: 'calls-before-noon',
    text: copy.patterns.text.callsBeforeNoon,
    sampleSize: completed.length,
    evidenceRows: [
      {
        label: copy.patterns.evidence.before12,
        value: copy.patterns.evidence.ofCompleted(before.length, completed.length),
      },
      {
        label: copy.patterns.evidence.after12,
        value: copy.patterns.evidence.ofCompleted(after, completed.length),
      },
      ...recent,
    ],
    chart: {
      kind: 'bar',
      unit: copy.patterns.chart.calls,
      bars: [
        { label: copy.patterns.evidence.before12, value: before.length, highlight: true },
        { label: copy.patterns.evidence.after12, value: after },
      ],
    },
  };
}

// --- 2. social evenings ---------------------------------------------------

/**
 * Days that followed two social evenings in a row, and the capacity she
 * reported on them. A correlation she can look at, never a cause.
 */
export function capacityAfterSocialEvenings(input: InsightInput): InsightResult {
  const socialDates = new Set(
    input.events.filter((e) => e.type === 'social-evening').map((e) => dateOf(e.timestamp)),
  );
  const byDate = new Map(input.checkIns.map((c) => [c.date, c]));

  const occurrences = [...byDate.keys()]
    .filter((date) => socialDates.has(addDays(date, -1)) && socialDates.has(addDays(date, -2)))
    .sort()
    .map((date) => ({ date, capacity: byDate.get(date)?.capacity }))
    .filter((o): o is { date: ISODate; capacity: CapacityLevel } => o.capacity !== undefined);

  if (occurrences.length < MIN_SOCIAL_OCCURRENCES) {
    return insufficient('capacity-after-social', occurrences.length);
  }

  const window = occurrences.slice(-SOCIAL_WINDOW);
  const low = window.filter((o) => LOW_CAPACITY.includes(o.capacity));

  return {
    status: 'ok',
    id: 'capacity-after-social',
    text: copy.patterns.text.capacityAfterSocial(low.length, window.length),
    sampleSize: occurrences.length,
    evidenceRows: window.map(
      (o): EvidenceRow => ({
        label: `${weekdayName(o.date)} ${o.date}`,
        value: LOW_CAPACITY.includes(o.capacity)
          ? copy.patterns.evidence.lowCapacity
          : copy.patterns.evidence.normalOrBetter,
      }),
    ),
    chart: {
      kind: 'dots',
      dots: window.map((o) => ({ label: o.date, on: LOW_CAPACITY.includes(o.capacity) })),
    },
  };
}

// --- 3. cycle -------------------------------------------------------------

function averageOf(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Circular distance between two cycle days. */
function cycleDistance(a: number, b: number): number {
  const raw = Math.abs(a - b);
  return Math.min(raw, CYCLE_LENGTH - raw);
}

/**
 * Energy around where she is in her cycle right now, compared with the rest
 * of it. The window is centred on today's cycle day rather than snapped to a
 * fixed block, because "around this part of your cycle" is what the sentence
 * claims and so it is what gets measured.
 *
 * Excluded entirely unless she has said cycle data may be used.
 */
export function energyAroundCyclePhase(input: InsightInput): InsightResult {
  if (!input.cycleConsent) return insufficient('energy-around-cycle', 0);

  const energyByDate = new Map(input.checkIns.map((c) => [c.date, c.energy]));
  const paired = input.cycleLogs
    .map((log) => ({ cycleDay: log.cycleDay, energy: energyByDate.get(log.date) }))
    .filter((p): p is { cycleDay: number; energy: number } => p.energy !== undefined);

  if (paired.length < MIN_CYCLE_ENTRIES) {
    return insufficient('energy-around-cycle', paired.length);
  }

  const todayCycleDay = input.cycleLogs.at(-1)?.cycleDay ?? 1;
  const inWindow = paired.filter((p) => cycleDistance(p.cycleDay, todayCycleDay) <= CYCLE_WINDOW);
  const outside = paired.filter((p) => cycleDistance(p.cycleDay, todayCycleDay) > CYCLE_WINDOW);

  if (inWindow.length < 3 || outside.length < 3) {
    return insufficient('energy-around-cycle', paired.length);
  }

  const windowAverage = averageOf(inWindow.map((p) => p.energy));
  const otherAverage = averageOf(outside.map((p) => p.energy));

  const from = ((todayCycleDay - CYCLE_WINDOW + CYCLE_LENGTH - 1) % CYCLE_LENGTH) + 1;
  const to = ((todayCycleDay + CYCLE_WINDOW - 1) % CYCLE_LENGTH) + 1;

  // Only claim "higher" when it is higher. Otherwise say it is level.
  const higher = windowAverage - otherAverage >= 0.3;

  const blocks = CYCLE_BLOCKS.map(([blockFrom, blockTo]) => {
    const inBlock = paired.filter((p) => p.cycleDay >= blockFrom && p.cycleDay <= blockTo);
    return {
      label: `${blockFrom}-${blockTo}`,
      value: Number(averageOf(inBlock.map((p) => p.energy)).toFixed(2)),
      highlight: todayCycleDay >= blockFrom && todayCycleDay <= blockTo,
    };
  });

  const bars: ChartBar[] = [
    {
      label: copy.patterns.evidence.aroundNow(from, to),
      value: Number(windowAverage.toFixed(2)),
      display: windowAverage.toFixed(1),
      highlight: true,
    },
    {
      label: copy.patterns.evidence.otherDays,
      value: Number(otherAverage.toFixed(2)),
      display: otherAverage.toFixed(1),
    },
  ];

  return {
    status: 'ok',
    id: 'energy-around-cycle',
    text: higher
      ? copy.patterns.text.energyAroundCycle
      : copy.patterns.text.energyAroundCycleLevel,
    sampleSize: paired.length,
    evidenceRows: [
      {
        label: copy.patterns.evidence.aroundNow(from, to),
        value: copy.patterns.evidence.averageEnergy(windowAverage.toFixed(1)),
        detail: copy.patterns.evidence.entries(inWindow.length),
      },
      {
        label: copy.patterns.evidence.otherDays,
        value: copy.patterns.evidence.averageEnergy(otherAverage.toFixed(1)),
        detail: copy.patterns.evidence.entries(outside.length),
      },
      ...blocks.map(
        (b): EvidenceRow => ({
          label: copy.patterns.evidence.cycleDays(
            Number(b.label.split('-')[0]),
            Number(b.label.split('-')[1]),
          ),
          value: copy.patterns.evidence.averageEnergy(b.value.toFixed(1)),
          ...(b.highlight ? { detail: copy.patterns.evidence.thisPartOfCycle } : {}),
        }),
      ),
    ],
    chart: { kind: 'bar', unit: copy.patterns.chart.energy, bars },
  };
}

// --- 4. household ---------------------------------------------------------

/** How often a household task got finished, with and without small steps. */
export function steppedHouseholdCompletion(input: InsightInput): InsightResult {
  const attempts = input.events.filter(
    (e) =>
      e.taskCategory === 'household' &&
      (e.type === 'task-completed' || e.type === 'task-moved'),
  );

  if (attempts.length < MIN_HOUSEHOLD) {
    return insufficient('stepped-household', attempts.length);
  }

  const group = (withSteps: boolean) => {
    const all = attempts.filter((e) => e.hadSmallSteps === withSteps);
    const done = all.filter((e) => e.type === 'task-completed').length;
    return { total: all.length, done, rate: all.length === 0 ? 0 : done / all.length };
  };

  const stepped = group(true);
  const plain = group(false);

  return {
    status: 'ok',
    id: 'stepped-household',
    text: copy.patterns.text.steppedHousehold,
    sampleSize: attempts.length,
    evidenceRows: [
      {
        label: copy.patterns.evidence.withSmallSteps,
        value: `${Math.round(stepped.rate * 100)}%`,
        detail: copy.patterns.evidence.finishedRate(stepped.done, stepped.total),
      },
      {
        label: copy.patterns.evidence.withoutSmallSteps,
        value: `${Math.round(plain.rate * 100)}%`,
        detail: copy.patterns.evidence.finishedRate(plain.done, plain.total),
      },
    ],
    chart: {
      kind: 'bar',
      unit: copy.patterns.chart.household,
      bars: [
        {
          label: copy.patterns.evidence.withSmallSteps,
          value: Math.round(stepped.rate * 100),
          display: `${Math.round(stepped.rate * 100)}%`,
          highlight: true,
        },
        {
          label: copy.patterns.evidence.withoutSmallSteps,
          value: Math.round(plain.rate * 100),
          display: `${Math.round(plain.rate * 100)}%`,
        },
      ],
    },
  };
}

// --- all ------------------------------------------------------------------

/**
 * Every insight, in the order they are worth reading. The cycle one is left
 * out entirely when she has not opted in, rather than shown as unavailable.
 */
export function buildInsights(input: InsightInput): InsightResult[] {
  const results = [
    capacityAfterSocialEvenings(input),
    callsBeforeNoon(input),
    steppedHouseholdCompletion(input),
  ];

  if (input.cycleConsent) results.splice(2, 0, energyAroundCyclePhase(input));
  return results;
}

/** Keeps the history bounded to what Patterns actually looks at. */
export function recentEvents(events: HistoryEvent[], today: ISODate, days = 90): HistoryEvent[] {
  return events.filter((e) => daysBetween(dateOf(e.timestamp), today) <= days);
}
