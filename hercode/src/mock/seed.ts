import { addDays, atTime, daysBetween, toISODate, weekdayIndex } from '../domain/date';
import type {
  BrainItem,
  CapacityLevel,
  CheckIn,
  CycleLog,
  DecisionRule,
  Feeling,
  HarderTag,
  HelpedTag,
  HistoryEvent,
  ISODate,
  NotificationLevel,
  Profile,
  Review,
  SharingSettings,
  Task,
  TaskCategory,
} from '../domain/types';
import { createRng, type Rng } from './rng';

/**
 * Mia's world. Generated deterministically from a fixed seed plus today's
 * date, so Patterns is computed from real events rather than written by hand.
 *
 * Four patterns are planted in the history on purpose:
 *   1. Calls get completed more often before 12:00.
 *   2. Capacity drops after two social evenings in a row.
 *   3. Energy runs higher around cycle days 17-24.
 *   4. Household tasks finish more consistently when broken into small steps.
 */

export const HISTORY_DAYS = 90;
export const CYCLE_LENGTH = 28;
export const CURRENT_CYCLE_DAY = 21;
const SEED = 'hercode-mia-2026';

export interface SeedData {
  profile: Profile;
  tasks: Task[];
  brainItems: BrainItem[];
  checkIns: Record<ISODate, CheckIn>;
  reviews: Record<ISODate, Review>;
  cycleLogs: CycleLog[];
  capacityByDay: Record<ISODate, CapacityLevel>;
  sharing: SharingSettings;
  decisionRules: DecisionRule[];
  history: HistoryEvent[];
  notifications: { level: NotificationLevel };
}

export const DEFAULT_PROFILE: Profile = {
  name: 'Mia',
  onboarded: false,
  helpWith: ['starting tasks', 'overwhelm', 'remembering things'],
  overwhelmStyle: 'freeze',
  cycleConsent: 'yes',
  partnerConnected: true,
  partnerName: 'Jonas',
};

export const DEFAULT_SHARING: SharingSettings = {
  // Private by default. She turns things on, never off.
  categories: { appointment: false, household: false, shopping: false, family: false },
  cycleDetail: false,
};

export const DEFAULT_DECISION_RULES: DecisionRule[] = [
  { topic: 'Dinner', rule: 'partner-decides' },
  { topic: 'Weekend plans', rule: 'ask-me-first' },
  { topic: 'Groceries', rule: 'partner-handles' },
  { topic: 'Cleaning', rule: 'partner-takes-over' },
  { topic: 'Purchases over 1000 NOK', rule: 'ask-me-first' },
  { topic: 'Visitors', rule: 'always-ask' },
];

/** Today's board. Ordering in buildDayPlan turns this into Today's 3. */
function todaysTasks(today: ISODate): Task[] {
  const t = (task: Omit<Task, 'date' | 'status'> & Partial<Pick<Task, 'status'>>): Task => ({
    status: 'todo',
    date: today,
    ...task,
  });

  return [
    t({
      id: 'task-dentist',
      title: 'Dentist',
      kind: 'fixed',
      start: '09:30',
      durationMin: 45,
      essential: false,
      postponeCount: 0,
      category: 'appointment',
      sensitivity: 'shared',
    }),
    t({
      id: 'task-lunch',
      title: 'Eat lunch',
      kind: 'fixed',
      start: '12:00',
      durationMin: 30,
      essential: true,
      postponeCount: 0,
      category: 'self',
      sensitivity: 'private',
    }),
    t({
      id: 'task-medication',
      title: 'Take medication',
      kind: 'flexible',
      durationMin: 2,
      essential: true,
      postponeCount: 0,
      category: 'self',
      sensitivity: 'private',
    }),
    t({
      id: 'task-pickup',
      title: 'Pick up Ellie at 15:30',
      kind: 'fixed',
      start: '15:30',
      durationMin: 30,
      essential: true,
      postponeCount: 0,
      category: 'family',
      sensitivity: 'shared',
    }),
    t({
      id: 'task-groceries',
      title: 'Grocery delivery',
      kind: 'fixed',
      start: '17:00',
      durationMin: 15,
      essential: false,
      postponeCount: 0,
      category: 'shopping',
      sensitivity: 'shared',
    }),
    t({
      id: 'task-insurance',
      title: 'Call insurance',
      kind: 'flexible',
      durationMin: 15,
      essential: false,
      postponeCount: 3,
      category: 'call',
      sensitivity: 'private',
    }),
    t({
      id: 'task-shampoo',
      title: 'Buy shampoo',
      kind: 'flexible',
      durationMin: 15,
      essential: false,
      postponeCount: 1,
      category: 'shopping',
      sensitivity: 'shared',
    }),
    t({
      id: 'task-laundry',
      title: 'Laundry',
      kind: 'flexible',
      durationMin: 20,
      essential: false,
      postponeCount: 1,
      category: 'household',
      sensitivity: 'shared',
    }),
    t({
      id: 'task-kitchen',
      title: 'Clean kitchen',
      kind: 'flexible',
      durationMin: 30,
      essential: false,
      postponeCount: 1,
      category: 'household',
      sensitivity: 'shared',
    }),
    t({
      id: 'task-school-email',
      title: "Reply to Ellie's school email",
      kind: 'flexible',
      durationMin: 10,
      essential: false,
      postponeCount: 0,
      category: 'admin',
      sensitivity: 'private',
    }),
    t({
      id: 'task-plants',
      title: 'Water the plants',
      kind: 'flexible',
      durationMin: 10,
      essential: false,
      postponeCount: 0,
      category: 'household',
      sensitivity: 'shared',
    }),
    t({
      id: 'task-post',
      title: 'Sort the post pile',
      kind: 'flexible',
      durationMin: 20,
      essential: false,
      postponeCount: 0,
      category: 'admin',
      sensitivity: 'private',
    }),
    t({
      id: 'task-jacket',
      title: 'Return jacket',
      kind: 'flexible',
      durationMin: 25,
      essential: false,
      postponeCount: 0,
      category: 'admin',
      sensitivity: 'shared',
    }),
  ];
}

function seedBrainItems(today: ISODate): BrainItem[] {
  const drafts: Array<[string, string, BrainItem['category']]> = [
    ['rain boots for Ellie', 'Rain boots for Ellie', 'shopping'],
    ['gift for Emma', "Gift for Emma's birthday", 'shopping'],
    ['book hair appointment', 'Book hair appointment', 'appointment'],
    ['try taco recipe', 'Try the taco recipe', 'meal'],
    ['return jacket', 'Return jacket', 'task'],
    ['look at green lamp', 'The green lamp I liked', 'idea'],
    ['remember school photo Wednesday', 'School photo on Wednesday', 'remember'],
  ];

  return drafts.map(([raw, text, category], i) => ({
    id: `brain-seed-${i}`,
    raw,
    text,
    category,
    confirmed: true,
    createdAt: atTime(addDays(today, -1), 20, 10 + i),
    sensitivity: 'private' as const,
  }));
}

/** Three cycles of manual tracking, landing on day 21 today. */
function seedCycleLogs(today: ISODate, rng: Rng): CycleLog[] {
  const logs: CycleLog[] = [];
  const firstDay = addDays(today, -(CURRENT_CYCLE_DAY - 1) - 2 * CYCLE_LENGTH);

  for (let offset = 0; offset <= daysBetween(firstDay, today); offset += 1) {
    const date = addDays(firstDay, offset);
    const cycleDay = (offset % CYCLE_LENGTH) + 1;
    // She tracks most days, not every day. That gap is realistic and harmless.
    if (rng.chance(0.18)) continue;

    const highEnergyWindow = cycleDay >= 17 && cycleDay <= 24;
    const periodWindow = cycleDay <= 4;
    const energyBase = highEnergyWindow ? 4 : periodWindow ? 2 : 3;

    logs.push({
      date,
      cycleDay,
      observations: {
        energy: clamp(energyBase + rng.int(-1, 1), 1, 5),
        focus: clamp(energyBase + rng.int(-1, 1), 1, 5),
        sleep: clamp(3 + rng.int(-1, 1), 1, 5),
        overwhelm: clamp((periodWindow ? 4 : 2) + rng.int(-1, 1), 1, 5),
        cramps: periodWindow && rng.chance(0.6),
        headache: rng.chance(0.15),
        sensitivity: clamp((periodWindow ? 4 : 2) + rng.int(-1, 1), 1, 5),
        appetite: clamp(3 + rng.int(-1, 1), 1, 5),
        socialEnergy: clamp((highEnergyWindow ? 4 : 2) + rng.int(-1, 1), 1, 5),
      },
    });
  }

  return logs;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const FEELINGS: Feeling[] = [
  'calm',
  'overwhelmed',
  'restless',
  'focused',
  'sensitive',
  'tired',
  'social',
  'need space',
];

const HELPED: HelpedTag[] = [
  'smaller tasks',
  'quiet time',
  'partner help',
  'exercise',
  'clear plan',
  'extra sleep',
  'less social activity',
];

const HARDER: HarderTag[] = [
  'too many decisions',
  'noise',
  'poor sleep',
  'social evening',
  'unclear plan',
  'interruptions',
  'long day',
];

const HOUSEHOLD_TITLES = ['Laundry', 'Clean kitchen', 'Water the plants', 'Change the sheets'];
const CALL_TITLES = ['Call insurance', 'Call the dentist', 'Call the landlord', 'Call mum'];
const OTHER_CATEGORIES: TaskCategory[] = ['admin', 'shopping', 'family', 'self'];

/**
 * Walks 90 days backwards and emits the events Patterns will later read.
 * Capacity is decided first, because it colours everything else about a day.
 */
function seedHistory(today: ISODate, rng: Rng): {
  history: HistoryEvent[];
  checkIns: Record<ISODate, CheckIn>;
  reviews: Record<ISODate, Review>;
  capacityByDay: Record<ISODate, CapacityLevel>;
} {
  const history: HistoryEvent[] = [];
  const checkIns: Record<ISODate, CheckIn> = {};
  const reviews: Record<ISODate, Review> = {};
  const capacityByDay: Record<ISODate, CapacityLevel> = {};

  const socialByDate: Record<ISODate, boolean> = {};
  const firstCycleDayDate = addDays(today, -(CURRENT_CYCLE_DAY - 1));

  // Pass 1: which evenings were social. Weekends skew social, and a social
  // evening makes the next one more likely, which is how the pairs appear.
  let previousSocial = false;
  for (let offset = HISTORY_DAYS; offset >= 1; offset -= 1) {
    const date = addDays(today, -offset);
    const weekend = weekdayIndex(date) >= 4;
    const base = weekend ? 0.45 : 0.12;
    const social = rng.chance(previousSocial ? base + 0.3 : base);
    socialByDate[date] = social;
    previousSocial = social;
  }

  // Pass 2: the day itself.
  for (let offset = HISTORY_DAYS; offset >= 1; offset -= 1) {
    const date = addDays(today, -offset);
    const yesterday = addDays(date, -1);
    const dayBefore = addDays(date, -2);
    const twoSocialEveningsBefore =
      socialByDate[yesterday] === true && socialByDate[dayBefore] === true;

    const cycleDay = cycleDayFor(firstCycleDayDate, date);
    const highEnergyWindow = cycleDay >= 17 && cycleDay <= 24;

    let capacity: CapacityLevel;
    if (twoSocialEveningsBefore) {
      // Planted pattern 2: it lands about five times out of six.
      capacity = rng.chance(0.85) ? (rng.chance(0.4) ? 'minimum' : 'light') : 'normal';
    } else if (highEnergyWindow) {
      capacity = rng.chance(0.55) ? 'high' : 'normal';
    } else {
      capacity = rng.pick<CapacityLevel>(['light', 'normal', 'normal', 'high']);
    }

    capacityByDay[date] = capacity;

    const energy = energyFor(capacity, highEnergyWindow, rng);
    checkIns[date] = {
      date,
      energy,
      brain: energy <= 2 ? 'foggy' : energy >= 4 ? 'sharp' : 'normal',
      capacity,
      feelings: pickSome(FEELINGS, rng, 0, 2),
      };

    history.push(event(rng, 'check-in', atTime(date, 7, rng.int(10, 55)), capacity));

    if (socialByDate[date]) {
      history.push(event(rng, 'social-evening', atTime(date, 19, rng.int(0, 45)), capacity));
    }

    emitTaskEvents(history, rng, date, capacity);

    // She wraps up the day roughly two evenings out of three.
    if (rng.chance(0.66)) {
      reviews[date] = {
        date,
        capacity: capacityScore(capacity, rng),
        helped: pickSome(HELPED, rng, 1, 2),
        harder: socialByDate[date]
          ? (['social evening', ...pickSome(HARDER, rng, 0, 1)] as HarderTag[])
          : pickSome(HARDER, rng, 0, 2),
      };
      history.push(event(rng, 'review', atTime(date, 21, rng.int(0, 40)), capacity));
    }
  }

  return { history, checkIns, reviews, capacityByDay };
}

function cycleDayFor(firstCycleDayDate: ISODate, date: ISODate): number {
  const diff = daysBetween(firstCycleDayDate, date);
  return ((((diff % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH) + 1);
}

function energyFor(capacity: CapacityLevel, highEnergyWindow: boolean, rng: Rng): number {
  const base =
    capacity === 'minimum' ? 1 : capacity === 'light' ? 2 : capacity === 'normal' ? 3 : 4;
  // Planted pattern 3: a gentle lift, never a claim about why.
  return clamp(base + (highEnergyWindow ? 1 : 0) + rng.int(-1, 0), 1, 5);
}

function capacityScore(capacity: CapacityLevel, rng: Rng): number {
  const base =
    capacity === 'minimum' ? 1 : capacity === 'light' ? 2 : capacity === 'normal' ? 3 : 5;
  return clamp(base + rng.int(0, 1), 1, 5);
}

/** How many tasks she got through, and when. */
function emitTaskEvents(
  history: HistoryEvent[],
  rng: Rng,
  date: ISODate,
  capacity: CapacityLevel,
): void {
  const attempts =
    capacity === 'minimum' ? rng.int(0, 1) : capacity === 'light' ? rng.int(1, 2) : rng.int(2, 5);

  for (let i = 0; i < attempts; i += 1) {
    const roll = rng.next();

    if (roll < 0.25) {
      emitCall(history, rng, date, capacity);
    } else if (roll < 0.6) {
      emitHousehold(history, rng, date, capacity);
    } else {
      const category = rng.pick(OTHER_CATEGORIES);
      const completed = rng.chance(capacity === 'high' ? 0.8 : 0.6);
      history.push(
        event(
          rng,
          completed ? 'task-completed' : 'task-moved',
          atTime(date, rng.int(9, 20), rng.int(0, 59)),
          capacity,
          category,
        ),
      );
    }
  }
}

/** Planted pattern 1: calls that get done mostly get done in the morning. */
function emitCall(
  history: HistoryEvent[],
  rng: Rng,
  date: ISODate,
  capacity: CapacityLevel,
): void {
  const completed = rng.chance(0.55);
  const beforeNoon = completed ? rng.chance(0.78) : rng.chance(0.35);
  const hour = beforeNoon ? rng.int(8, 11) : rng.int(12, 19);

  history.push(
    event(
      rng,
      completed ? 'task-completed' : 'task-moved',
      atTime(date, hour, rng.int(0, 59)),
      capacity,
      'call',
      undefined,
      rng.pick(CALL_TITLES),
    ),
  );
}

/** Planted pattern 4: small steps carry household tasks over the line. */
function emitHousehold(
  history: HistoryEvent[],
  rng: Rng,
  date: ISODate,
  capacity: CapacityLevel,
): void {
  const hadSmallSteps = rng.chance(0.45);
  const completed = rng.chance(hadSmallSteps ? 0.85 : 0.42);

  if (hadSmallSteps) {
    history.push(
      event(
        rng,
        'task-broken-down',
        atTime(date, rng.int(9, 18), rng.int(0, 59)),
        capacity,
        'household',
        true,
      ),
    );
  }

  history.push(
    event(
      rng,
      completed ? 'task-completed' : 'task-moved',
      atTime(date, rng.int(9, 20), rng.int(0, 59)),
      capacity,
      'household',
      hadSmallSteps,
      rng.pick(HOUSEHOLD_TITLES),
    ),
  );
}

let eventCounter = 0;

function event(
  rng: Rng,
  type: HistoryEvent['type'],
  timestamp: string,
  capacityAtTime: CapacityLevel,
  taskCategory?: TaskCategory,
  hadSmallSteps?: boolean,
  taskTitle?: string,
): HistoryEvent {
  eventCounter += 1;
  const evt: HistoryEvent = {
    id: `seed-${eventCounter}-${rng.int(1000, 9999)}`,
    type,
    timestamp,
    capacityAtTime,
  };
  if (taskCategory) evt.taskCategory = taskCategory;
  if (hadSmallSteps !== undefined) evt.hadSmallSteps = hadSmallSteps;
  if (taskTitle) evt.taskId = `seed-task-${taskTitle.toLowerCase().replace(/\s+/g, '-')}`;
  return evt;
}

function pickSome<T>(items: readonly T[], rng: Rng, min: number, max: number): T[] {
  const count = rng.int(min, max);
  const pool = [...items];
  const out: T[] = [];
  for (let i = 0; i < count && pool.length > 0; i += 1) {
    out.push(...pool.splice(rng.int(0, pool.length - 1), 1));
  }
  return out;
}

/** Builds the whole demo world for a given day. */
export function createSeed(today: ISODate = toISODate(new Date())): SeedData {
  eventCounter = 0;
  const rng = createRng(SEED);

  const { history, checkIns, reviews, capacityByDay } = seedHistory(today, rng);

  return {
    profile: { ...DEFAULT_PROFILE },
    tasks: todaysTasks(today),
    brainItems: seedBrainItems(today),
    checkIns,
    reviews,
    cycleLogs: seedCycleLogs(today, rng),
    capacityByDay,
    sharing: { categories: { ...DEFAULT_SHARING.categories }, cycleDetail: false },
    decisionRules: DEFAULT_DECISION_RULES.map((r) => ({ ...r })),
    history,
    notifications: { level: 'normal' },
  };
}
