/**
 * Shared domain types. Everything the app reasons about is declared here once.
 */

export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string; // full ISO timestamp

export type CapacityLevel = 'minimum' | 'light' | 'normal' | 'high';

/** Privacy tier. Nothing reaches BroCode unless it is explicitly above 'private'. */
export type Sensitivity = 'private' | 'shared' | 'signal';

export type TaskKind = 'fixed' | 'flexible';
export type TaskStatus = 'todo' | 'done' | 'snoozed' | 'moved';

export type TaskCategory =
  | 'appointment'
  | 'household'
  | 'admin'
  | 'call'
  | 'shopping'
  | 'family'
  | 'self'
  | 'work';

export interface TaskStep {
  text: string;
  minutes: number;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  kind: TaskKind;
  /** 'HH:mm' on the task's day. Fixed items always have one. */
  start?: string;
  durationMin: number;
  essential: boolean;
  status: TaskStatus;
  postponeCount: number;
  steps?: TaskStep[];
  category: TaskCategory;
  sensitivity: Sensitivity;
  /** The day this task is planned for. */
  date: ISODate;
  /** Free-text note. Always private, never projected to a partner. */
  note?: string;
}

export type BrainCategory =
  | 'task'
  | 'shopping'
  | 'idea'
  | 'remember'
  | 'someday'
  | 'meal'
  | 'appointment';

export interface BrainItem {
  id: string;
  /** The original sentence fragment she spoke or typed. */
  raw: string;
  text: string;
  category: BrainCategory;
  confirmed: boolean;
  createdAt: ISODateTime;
  sensitivity: Sensitivity;
}

/** A categorised fragment the mock AI proposes, before she approves it. */
export interface BrainItemDraft {
  raw: string;
  text: string;
  category: BrainCategory;
}

export type BrainState = 'foggy' | 'normal' | 'sharp';

export type Feeling =
  | 'calm'
  | 'overwhelmed'
  | 'restless'
  | 'focused'
  | 'sensitive'
  | 'tired'
  | 'social'
  | 'need space';

export interface CheckIn {
  date: ISODate;
  /** 1-5 */
  energy: number;
  brain: BrainState;
  capacity: CapacityLevel;
  feelings: Feeling[];
  skipped?: boolean;
}

export type HelpedTag =
  | 'smaller tasks'
  | 'quiet time'
  | 'partner help'
  | 'exercise'
  | 'clear plan'
  | 'extra sleep'
  | 'less social activity';

export type HarderTag =
  | 'too many decisions'
  | 'noise'
  | 'poor sleep'
  | 'social evening'
  | 'unclear plan'
  | 'interruptions'
  | 'long day';

export interface Review {
  date: ISODate;
  /** 1-5 */
  capacity: number;
  helped: HelpedTag[];
  harder: HarderTag[];
  skipped?: boolean;
}

export interface CycleObservations {
  energy: number;
  focus: number;
  sleep: number;
  overwhelm: number;
  cramps: boolean;
  headache: boolean;
  sensitivity: number;
  appetite: number;
  socialEnergy: number;
}

export interface CycleLog {
  date: ISODate;
  cycleDay: number;
  observations: CycleObservations;
}

export type ShareableCategory = 'appointment' | 'household' | 'shopping' | 'family';

export type SignalValue =
  | 'low-capacity'
  | 'need-quiet'
  | 'could-use-affection'
  | 'mentally-overloaded'
  | 'feeling-social'
  | 'need-practical-help'
  | 'want-to-talk';

export interface SharingSettings {
  categories: Record<ShareableCategory, boolean>;
  /** Exact cycle detail. Off by default, opt-in only, with a plain-language confirm. */
  cycleDetail: boolean;
}

export interface PartnerSignal {
  value: SignalValue;
  /** Signals expire at the end of the day they were set. */
  date: ISODate;
}

export type DecisionRuleValue =
  | 'partner-decides'
  | 'partner-handles'
  | 'partner-takes-over'
  | 'ask-me-first'
  | 'always-ask';

export interface DecisionRule {
  topic: string;
  rule: DecisionRuleValue;
}

export type HistoryEventType =
  | 'task-completed'
  | 'task-snoozed'
  | 'task-moved'
  | 'task-broken-down'
  | 'capacity-changed'
  | 'check-in'
  | 'review'
  | 'social-evening';

export interface HistoryEvent {
  id: string;
  type: HistoryEventType;
  taskId?: string;
  timestamp: ISODateTime;
  capacityAtTime: CapacityLevel;
  /** Denormalised so Patterns can group without re-joining deleted tasks. */
  taskCategory?: TaskCategory;
  /** True when the completed task had steps under 10 minutes. */
  hadSmallSteps?: boolean;
}

export type NotificationLevel = 'gentle' | 'normal' | 'important';

export type OverwhelmStyle =
  | 'freeze'
  | 'jump-between'
  | 'forget'
  | 'avoid'
  | 'exhausted'
  | 'depends';

export type HelpTopic =
  | 'remembering things'
  | 'starting tasks'
  | 'overwhelm'
  | 'routines'
  | 'planning'
  | 'household life'
  | 'appointments'
  | 'emotional load'
  | 'cycle patterns'
  | 'relationship coordination';

export type CycleConsent = 'yes' | 'maybe-later' | 'no';

export interface Profile {
  name: string;
  onboarded: boolean;
  helpWith: HelpTopic[];
  overwhelmStyle: OverwhelmStyle | null;
  cycleConsent: CycleConsent;
  partnerConnected: boolean;
  partnerName: string;
}

export type TabId = 'today' | 'brain' | 'calendar' | 'patterns' | 'me';
