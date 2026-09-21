import { minutesOfDay } from '../domain/date';
import type {
  BrainCategory,
  BrainItemDraft,
  CapacityLevel,
  TabId,
  Task,
} from '../domain/types';
import { createRng } from './rng';

/**
 * The stand-in for a language model.
 *
 * Deterministic keyword rules behind an async call with a shimmer delay, so
 * the UI is already written against a promise. Swapping this module for a real
 * LLM later is a change of implementation, not of call sites.
 */

export type AIIntent =
  | 'what-first'
  | 'fifteen-minutes'
  | 'plan-afternoon'
  | 'what-forgetting'
  | 'make-easier'
  | 'move-non-urgent'
  | 'break-down'
  | 'even-easier'
  | 'five-minute-version'
  | 'categorize';

export interface AIContext {
  screen: TabId;
  capacity: CapacityLevel;
  tasks: Task[];
  task?: Task;
  rawText?: string;
  /** ISO datetime, injected so responses stay deterministic in tests. */
  now: string;
}

export interface AIStep {
  text: string;
  minutes: number;
}

export interface AIAction {
  id: 'even-easier' | 'five-minute-version' | 'later';
  label: string;
}

export interface AIResponse {
  intent: AIIntent;
  headline: string;
  body?: string;
  steps?: AIStep[];
  actions?: AIAction[];
  items?: BrainItemDraft[];
  /** Tasks the answer refers to, so the sheet can act on them. */
  taskIds?: string[];
}

const MIN_DELAY = 600;
const MAX_DELAY = 900;

let delayOverride: number | null = null;

/** Tests set 0 so they do not wait on the shimmer. */
export function setAIDelay(ms: number): void {
  delayOverride = ms;
}

export function resetAIDelay(): void {
  delayOverride = null;
}

function delayFor(intent: AIIntent, context: AIContext): number {
  if (delayOverride !== null) return delayOverride;
  const rng = createRng(`${intent}:${context.now}:${context.task?.id ?? ''}`);
  return MIN_DELAY + Math.floor(rng.next() * (MAX_DELAY - MIN_DELAY));
}

// --- brain dump categorisation -------------------------------------------

const CATEGORY_RULES: Array<{ category: BrainCategory; words: string[] }> = [
  {
    category: 'appointment',
    words: ['book', 'appointment', 'dentist', 'doctor', 'haircut', 'hair', 'meeting', 'schedule'],
  },
  {
    category: 'meal',
    words: ['dinner', 'tacos', 'taco', 'recipe', 'cook', 'lunch', 'meal', 'bake', 'pasta'],
  },
  {
    category: 'shopping',
    words: ['buy', 'boots', 'shampoo', 'gift', 'order', 'groceries', 'shop', 'get some', 'pick up'],
  },
  // Ideas are checked before things to remember, because "remember that green
  // lamp I liked" is a saved idea, not a deadline.
  {
    category: 'idea',
    words: ['idea', 'lamp', 'liked', 'someday maybe', 'inspiration', 'maybe buy', 'look at'],
  },
  {
    category: 'remember',
    words: ['remember', 'do not forget', "don't forget", 'bring', 'deadline', 'photo', 'birthday'],
  },
  {
    category: 'someday',
    words: ['someday', 'eventually', 'one day', 'at some point', 'sometime'],
  },
];

/** Splits a dump into fragments the way a person actually writes one. */
function splitFragments(raw: string): string[] {
  return raw
    .split(/(?:,|;|\.|\band\b|\bthen\b|\balso\b|\bplus\b|\n)/gi)
    .map((part) => part.trim())
    .filter((part) => part.length > 2);
}

function classify(fragment: string): BrainCategory {
  const lower = fragment.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.words.some((w) => lower.includes(w))) return rule.category;
  }
  return 'task';
}

/** Turns "need to buy ellie rain boots" into "Ellie rain boots". */
function tidy(fragment: string): string {
  const cleaned = fragment
    .replace(
      /^(i\s+)?(need to|have to|want to|must|should|remember to|maybe|remember that|and)\s+/i,
      '',
    )
    .replace(/^that\s+/i, '')
    .trim();
  const text = cleaned.length > 0 ? cleaned : fragment.trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function categorizeDump(raw: string): BrainItemDraft[] {
  return splitFragments(raw).map((fragment) => ({
    raw: fragment,
    text: tidy(fragment),
    category: classify(fragment),
  }));
}

// --- task breakdown -------------------------------------------------------

/** Hand-written breakdowns for the tasks the demo leans on. */
const KNOWN_BREAKDOWNS: Array<{ match: RegExp; steps: AIStep[] }> = [
  {
    match: /kitchen/i,
    steps: [
      { text: 'Put cups and plates in the dishwasher', minutes: 5 },
      { text: 'Clear one counter', minutes: 5 },
      { text: 'Take the rubbish out', minutes: 3 },
    ],
  },
  {
    match: /laundry/i,
    steps: [
      { text: 'Carry the basket to the machine', minutes: 2 },
      { text: 'Start one dark wash', minutes: 3 },
      { text: 'Set a reminder to hang it up', minutes: 1 },
    ],
  },
  {
    match: /call|phone|ring/i,
    steps: [
      { text: 'Find the number and write it down', minutes: 2 },
      { text: 'Write the one sentence you need to say', minutes: 3 },
      { text: 'Make the call', minutes: 8 },
    ],
  },
  {
    match: /email|reply|mail|post/i,
    steps: [
      { text: 'Open the message and read it once', minutes: 2 },
      { text: 'Write two sentences, no more', minutes: 4 },
      { text: 'Send it', minutes: 1 },
    ],
  },
  {
    match: /shop|buy|groceries|shampoo/i,
    steps: [
      { text: 'Add it to your list on your phone', minutes: 1 },
      { text: 'Check if it can go in the next delivery', minutes: 3 },
      { text: 'Order it', minutes: 5 },
    ],
  },
];

function genericSteps(title: string): AIStep[] {
  return [
    { text: `Get out whatever ${title.toLowerCase()} needs`, minutes: 3 },
    { text: 'Do the smallest visible piece', minutes: 5 },
    { text: 'Stop there, or keep going if it feels fine', minutes: 5 },
  ];
}

export function stepsFor(task: Task): AIStep[] {
  const known = KNOWN_BREAKDOWNS.find((b) => b.match.test(task.title));
  return known ? known.steps.map((s) => ({ ...s })) : genericSteps(task.title);
}

/** "Make it even easier" keeps only the first step, shrunk. */
function easierSteps(steps: AIStep[]): AIStep[] {
  const first = steps[0];
  if (!first) return [];
  return [{ text: first.text, minutes: Math.max(1, Math.round(first.minutes / 2)) }];
}

function fiveMinuteSteps(steps: AIStep[]): AIStep[] {
  const out: AIStep[] = [];
  let total = 0;
  for (const step of steps) {
    if (total + step.minutes > 5) break;
    out.push({ ...step });
    total += step.minutes;
  }
  return out.length > 0 ? out : easierSteps(steps);
}

const BREAKDOWN_ACTIONS: AIAction[] = [
  { id: 'even-easier', label: 'Make it even easier' },
  { id: 'five-minute-version', label: 'Give me 5-minute version' },
  { id: 'later', label: 'Do later' },
];

// --- planning answers -----------------------------------------------------

function openTasks(context: AIContext): Task[] {
  return context.tasks.filter((t) => t.status === 'todo');
}

function shortestFirst(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.durationMin - b.durationMin);
}

function answerWhatFirst(context: AIContext): AIResponse {
  const flexible = openTasks(context).filter((t) => !t.essential && t.kind !== 'fixed');
  const mostMoved = [...flexible].sort((a, b) => b.postponeCount - a.postponeCount)[0];

  if (!mostMoved) {
    return { intent: 'what-first', headline: 'Nothing is waiting on you right now.' };
  }

  if (mostMoved.postponeCount >= 3) {
    return {
      intent: 'what-first',
      headline: mostMoved.title,
      body: `You have moved this ${mostMoved.postponeCount} times. A two-minute first step is usually enough to get past it.`,
      steps: easierSteps(stepsFor(mostMoved)),
      actions: BREAKDOWN_ACTIONS,
      taskIds: [mostMoved.id],
    };
  }

  const shortest = shortestFirst(flexible)[0];
  return {
    intent: 'what-first',
    headline: shortest?.title ?? mostMoved.title,
    body: `About ${shortest?.durationMin ?? mostMoved.durationMin} minutes. Start there and stop when it is done.`,
    taskIds: [(shortest ?? mostMoved).id],
  };
}

function answerFifteenMinutes(context: AIContext): AIResponse {
  const fits = shortestFirst(
    openTasks(context).filter((t) => t.kind !== 'fixed' && t.durationMin <= 15),
  ).slice(0, 2);

  if (fits.length === 0) {
    return {
      intent: 'fifteen-minutes',
      headline: 'Nothing on your list fits in fifteen minutes.',
      body: 'Pick one thing and do the first five minutes of it instead.',
    };
  }

  return {
    intent: 'fifteen-minutes',
    headline: fits[0]?.title ?? '',
    body:
      fits.length > 1
        ? `About ${fits[0]?.durationMin} minutes. If that goes quickly, ${fits[1]?.title.toLowerCase()} is next.`
        : `About ${fits[0]?.durationMin} minutes.`,
    taskIds: fits.map((t) => t.id),
  };
}

function answerPlanAfternoon(context: AIContext): AIResponse {
  const nowMinutes = new Date(context.now).getHours() * 60 + new Date(context.now).getMinutes();
  const fixedAhead = openTasks(context)
    .filter((t) => t.kind === 'fixed' && t.start && minutesOfDay(t.start) >= nowMinutes)
    .sort((a, b) => minutesOfDay(a.start ?? '23:59') - minutesOfDay(b.start ?? '23:59'));

  const next = fixedAhead[0];
  const small = shortestFirst(
    openTasks(context).filter((t) => t.kind !== 'fixed' && !t.essential),
  )[0];

  if (!next) {
    return {
      intent: 'plan-afternoon',
      headline: 'Nothing fixed is left today.',
      body: small ? `If you want one more thing, ${small.title.toLowerCase()}.` : undefined,
      taskIds: small ? [small.id] : [],
    };
  }

  const gap = minutesOfDay(next.start ?? '23:59') - nowMinutes;
  return {
    intent: 'plan-afternoon',
    headline: `${gap} free minutes before ${next.title.toLowerCase()}`,
    body:
      small && small.durationMin <= gap
        ? `That is enough for ${small.title.toLowerCase()}. Everything else can wait until after.`
        : 'Enough for a pause. Nothing has to go in that gap.',
    taskIds: small ? [small.id] : [],
  };
}

function answerWhatForgetting(context: AIContext): AIResponse {
  const moved = openTasks(context)
    .filter((t) => t.postponeCount > 0)
    .sort((a, b) => b.postponeCount - a.postponeCount)
    .slice(0, 3);

  if (moved.length === 0) {
    return {
      intent: 'what-forgetting',
      headline: 'Nothing has been sitting around.',
      body: 'Everything on your list is from today.',
    };
  }

  return {
    intent: 'what-forgetting',
    headline: 'These have been moved a few times',
    body: moved.map((t) => `${t.title} — moved ${t.postponeCount} times`).join('\n'),
    taskIds: moved.map((t) => t.id),
  };
}

function answerMoveNonUrgent(context: AIContext): AIResponse {
  const movable = openTasks(context).filter(
    (t) => !t.essential && t.kind !== 'fixed' && t.postponeCount < 3,
  );

  if (movable.length === 0) {
    return {
      intent: 'move-non-urgent',
      headline: 'Everything left is either fixed or essential.',
    };
  }

  return {
    intent: 'move-non-urgent',
    headline: `${movable.length} things can move to tomorrow`,
    body: movable.map((t) => t.title).join(', '),
    taskIds: movable.map((t) => t.id),
  };
}

function answerMakeEasier(context: AIContext): AIResponse {
  const target =
    context.task ?? shortestFirst(openTasks(context).filter((t) => t.kind !== 'fixed'))[0];

  if (!target) {
    return { intent: 'make-easier', headline: 'Nothing here needs making smaller.' };
  }

  return {
    intent: 'make-easier',
    headline: "Let's make this smaller.",
    steps: stepsFor(target),
    actions: BREAKDOWN_ACTIONS,
    taskIds: [target.id],
  };
}

function answerBreakdown(intent: AIIntent, context: AIContext): AIResponse {
  const target = context.task;
  if (!target) {
    return { intent, headline: 'Pick a task and I will make it smaller.' };
  }

  const base = stepsFor(target);
  const steps =
    intent === 'even-easier'
      ? easierSteps(base)
      : intent === 'five-minute-version'
        ? fiveMinuteSteps(base)
        : base;

  return {
    intent,
    headline: "Let's make this smaller.",
    steps,
    actions: BREAKDOWN_ACTIONS,
    taskIds: [target.id],
  };
}

function respond(intent: AIIntent, context: AIContext): AIResponse {
  switch (intent) {
    case 'what-first':
      return answerWhatFirst(context);
    case 'fifteen-minutes':
      return answerFifteenMinutes(context);
    case 'plan-afternoon':
      return answerPlanAfternoon(context);
    case 'what-forgetting':
      return answerWhatForgetting(context);
    case 'move-non-urgent':
      return answerMoveNonUrgent(context);
    case 'make-easier':
      return answerMakeEasier(context);
    case 'break-down':
    case 'even-easier':
    case 'five-minute-version':
      return answerBreakdown(intent, context);
    case 'categorize':
      return {
        intent,
        headline: 'Here is what I heard',
        items: categorizeDump(context.rawText ?? ''),
      };
  }
}

/** The one entry point. Everything above is an implementation detail. */
export function askAI(intent: AIIntent, context: AIContext): Promise<AIResponse> {
  const answer = respond(intent, context);
  return new Promise((resolve) => {
    setTimeout(() => resolve(answer), delayFor(intent, context));
  });
}
