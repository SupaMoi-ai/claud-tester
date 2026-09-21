import { copy } from '../copy';
import type {
  DecisionRule,
  DecisionRuleValue,
  ISODate,
  PartnerSignal,
  Profile,
  ShareableCategory,
  SharingSettings,
  Task,
} from './types';

/**
 * The only source for the BroCode preview.
 *
 * The parameter type IS the allowlist: this function cannot read check-ins,
 * reviews, mood, notes or Brain items, because they are not in the shape it
 * accepts. AppState satisfies the shape structurally, so callers still just
 * hand it the store. src/test/privacy.test.ts proves nothing private comes out.
 *
 * `today` is passed in rather than read from the clock, so the projection is
 * pure and a signal from yesterday can be tested.
 */

export interface PartnerReadableState {
  profile: Pick<Profile, 'name' | 'partnerName' | 'partnerConnected'>;
  tasks: Task[];
  sharing: SharingSettings;
  partnerSignal: PartnerSignal | null;
  decisionRules: DecisionRule[];
  /** Read for one number, and only when she has turned that toggle on. */
  cycleLogs: { cycleDay: number }[];
}

export interface PartnerTakeOver {
  id: string;
  title: string;
  why: string;
}

export interface PartnerProjection {
  userName: string;
  partnerName: string;
  /** Null unless she set one today. Signals do not survive the day. */
  signal: { label: string; expiresEndOfDay: true } | null;
  /** False when she has shared nothing today, which is the default. */
  hasSharedToday: boolean;
  canTakeOver: PartnerTakeOver[];
  decisions: { topic: string; rule: DecisionRuleValue; label: string }[];
  helpfulToday: string;
  visibleSummary: string[];
  /** Only via the explicit toggle, which is off by default. */
  cycleDetail: { cycleDay: number } | null;
}

/** The three rules that hand a topic over; the other two keep it with her. */
const HANDOVER_RULES: DecisionRuleValue[] = [
  'partner-decides',
  'partner-handles',
  'partner-takes-over',
];

const SHAREABLE: ShareableCategory[] = ['appointment', 'household', 'shopping', 'family'];

function isShareable(category: string): category is ShareableCategory {
  return (SHAREABLE as string[]).includes(category);
}

export function projectForPartner(
  state: Readonly<PartnerReadableState>,
  today: ISODate,
): PartnerProjection {
  const { profile, sharing, decisionRules } = state;

  const signalValue =
    state.partnerSignal && state.partnerSignal.date === today
      ? state.partnerSignal.value
      : null;

  const onCategories = SHAREABLE.filter((category) => sharing.categories[category]);

  // A task reaches him only if it is open, marked shared, and sits in a
  // category she has switched on. All three, every time.
  const sharedTasks = state.tasks.filter(
    (task) =>
      task.status === 'todo' &&
      task.sensitivity === 'shared' &&
      isShareable(task.category) &&
      sharing.categories[task.category],
  );

  const hasSharedToday =
    signalValue !== null || onCategories.length > 0 || sharing.cycleDetail;

  const fromRules: PartnerTakeOver[] = decisionRules
    .filter((r) => HANDOVER_RULES.includes(r.rule))
    .map((r) => ({
      id: `rule-${r.topic}`,
      title:
        copy.decisions.takeOver[r.rule as keyof typeof copy.decisions.takeOver]?.(r.topic) ??
        r.topic,
      why: copy.decisions.fromRule,
    }));

  const fromTasks: PartnerTakeOver[] = sharedTasks.map((task) => ({
    id: task.id,
    title: task.title,
    why: copy.decisions.fromTask,
  }));

  const cycleDetail = sharing.cycleDetail
    ? { cycleDay: state.cycleLogs.at(-1)?.cycleDay ?? 1 }
    : null;

  const visibleSummary: string[] = [];
  if (signalValue) visibleSummary.push(copy.signals[signalValue]);
  for (const category of onCategories) visibleSummary.push(copy.partner.categories[category]);
  if (cycleDetail) visibleSummary.push(copy.brocode.cycleDay(cycleDetail.cycleDay));

  return {
    userName: profile.name,
    partnerName: profile.partnerName,
    signal: signalValue
      ? { label: copy.signals[signalValue], expiresEndOfDay: true }
      : null,
    hasSharedToday,
    // Nothing to act on until she has shared something today, so a standing
    // list of agreements would only be noise.
    canTakeOver: hasSharedToday ? [...fromRules, ...fromTasks] : [],
    decisions: decisionRules.map((r) => ({
      topic: r.topic,
      rule: r.rule,
      label: copy.decisions.rules[r.rule],
    })),
    helpfulToday: signalValue
      ? copy.brocode.helpful[signalValue]
      : copy.brocode.helpful.default,
    visibleSummary,
    cycleDetail,
  };
}
