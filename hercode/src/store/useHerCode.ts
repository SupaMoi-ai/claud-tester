import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, toISODate } from '../domain/date';
import type {
  BrainItem,
  BrainItemDraft,
  CapacityLevel,
  CheckIn,
  CycleLog,
  DecisionRule,
  DecisionRuleValue,
  HistoryEvent,
  HistoryEventType,
  ISODate,
  NotificationLevel,
  PartnerSignal,
  Profile,
  Review,
  ShareableCategory,
  SharingSettings,
  TabId,
  Task,
  TaskStep,
} from '../domain/types';
import { createSeed } from '../mock/seed';

export type SnoozeWhen = 'later-today' | 'tomorrow' | 'someday';

export interface AppState {
  profile: Profile;
  tasks: Task[];
  brainItems: BrainItem[];
  checkIns: Record<ISODate, CheckIn>;
  reviews: Record<ISODate, Review>;
  cycleLogs: CycleLog[];
  capacityByDay: Record<ISODate, CapacityLevel>;
  sharing: SharingSettings;
  partnerSignal: PartnerSignal | null;
  decisionRules: DecisionRule[];
  history: HistoryEvent[];
  notifications: { level: NotificationLevel };
}

export interface UiState {
  activeTab: TabId;
  /** The day the check-in sheet has already been offered for. */
  checkInSeenFor: ISODate | null;
}

export interface Actions {
  today: () => ISODate;
  capacityFor: (date: ISODate) => CapacityLevel;

  completeOnboarding: (profile: Partial<Profile>) => void;
  skipOnboarding: () => void;

  saveCheckIn: (checkIn: CheckIn) => void;
  skipCheckIn: (date: ISODate) => void;
  markCheckInSeen: (date: ISODate) => void;

  setCapacity: (date: ISODate, capacity: CapacityLevel) => void;

  completeTask: (id: string) => void;
  snoozeTask: (id: string, when: SnoozeWhen) => void;
  moveTask: (id: string) => void;
  setTaskSteps: (id: string, steps: TaskStep[]) => void;
  toggleTaskStep: (id: string, index: number) => void;

  addBrainItems: (drafts: BrainItemDraft[]) => void;
  updateBrainItem: (id: string, patch: Partial<BrainItem>) => void;
  removeBrainItem: (id: string) => void;

  saveReview: (review: Review) => void;
  setSharing: (category: ShareableCategory, on: boolean) => void;
  setCycleDetailSharing: (on: boolean) => void;
  setSignal: (signal: PartnerSignal | null) => void;
  setDecisionRule: (topic: string, rule: DecisionRuleValue) => void;
  setNotificationLevel: (level: NotificationLevel) => void;

  setActiveTab: (tab: TabId) => void;
  resetDemoData: () => void;
}

export type Store = AppState & { ui: UiState } & Actions;

const STORAGE_KEY = 'hercode-v1';

function freshState(): AppState {
  const seed = createSeed(toISODate(new Date()));
  return {
    profile: seed.profile,
    tasks: seed.tasks,
    brainItems: seed.brainItems,
    checkIns: seed.checkIns,
    reviews: seed.reviews,
    cycleLogs: seed.cycleLogs,
    capacityByDay: seed.capacityByDay,
    sharing: seed.sharing,
    partnerSignal: null,
    decisionRules: seed.decisionRules,
    history: seed.history,
    notifications: seed.notifications,
  };
}

const freshUi = (): UiState => ({ activeTab: 'today', checkInSeenFor: null });

let localEventCounter = 0;

/** The one place a HistoryEvent is born, so Patterns can never drift from reality. */
function record(
  state: AppState,
  type: HistoryEventType,
  extra: Partial<HistoryEvent> = {},
): HistoryEvent[] {
  localEventCounter += 1;
  const today = toISODate(new Date());
  return [
    ...state.history,
    {
      id: `evt-${Date.now()}-${localEventCounter}`,
      type,
      timestamp: new Date().toISOString(),
      capacityAtTime: state.capacityByDay[today] ?? 'normal',
      ...extra,
    },
  ];
}

function patchTask(tasks: Task[], id: string, patch: Partial<Task>): Task[] {
  return tasks.map((t) => (t.id === id ? { ...t, ...patch } : t));
}

export const useHerCode = create<Store>()(
  persist(
    (set, get) => ({
      ...freshState(),
      ui: freshUi(),

      today: () => toISODate(new Date()),

      capacityFor: (date) => get().capacityByDay[date] ?? get().checkIns[date]?.capacity ?? 'normal',

      completeOnboarding: (profile) =>
        set((s) => ({ profile: { ...s.profile, ...profile, onboarded: true } })),

      skipOnboarding: () => set((s) => ({ profile: { ...s.profile, onboarded: true } })),

      saveCheckIn: (checkIn) =>
        set((s) => ({
          checkIns: { ...s.checkIns, [checkIn.date]: checkIn },
          capacityByDay: { ...s.capacityByDay, [checkIn.date]: checkIn.capacity },
          history: record(s, 'check-in'),
          ui: { ...s.ui, checkInSeenFor: checkIn.date },
        })),

      skipCheckIn: (date) => set((s) => ({ ui: { ...s.ui, checkInSeenFor: date } })),

      markCheckInSeen: (date) => set((s) => ({ ui: { ...s.ui, checkInSeenFor: date } })),

      setCapacity: (date, capacity) =>
        set((s) => ({
          capacityByDay: { ...s.capacityByDay, [date]: capacity },
          history: record(s, 'capacity-changed', { capacityAtTime: capacity }),
        })),

      completeTask: (id) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === id);
          const smallSteps = task?.steps?.every((step) => step.minutes < 10) ?? false;
          return {
            tasks: patchTask(s.tasks, id, { status: 'done' }),
            history: record(s, 'task-completed', {
              taskId: id,
              ...(task?.category ? { taskCategory: task.category } : {}),
              hadSmallSteps: smallSteps,
            }),
          };
        }),

      snoozeTask: (id, when) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === id);
          if (!task) return {};
          const today = toISODate(new Date());

          // Later today keeps it on the board; the other two move the day.
          const patch: Partial<Task> =
            when === 'later-today'
              ? { postponeCount: task.postponeCount + 1 }
              : {
                  status: 'moved',
                  postponeCount: task.postponeCount + 1,
                  date: when === 'tomorrow' ? addDays(today, 1) : addDays(today, 90),
                };

          return {
            tasks: patchTask(s.tasks, id, patch),
            history: record(s, when === 'later-today' ? 'task-snoozed' : 'task-moved', {
              taskId: id,
              ...(task.category ? { taskCategory: task.category } : {}),
            }),
          };
        }),

      moveTask: (id) => get().snoozeTask(id, 'tomorrow'),

      setTaskSteps: (id, steps) =>
        set((s) => {
          const task = s.tasks.find((t) => t.id === id);
          return {
            tasks: patchTask(s.tasks, id, { steps }),
            history: record(s, 'task-broken-down', {
              taskId: id,
              ...(task?.category ? { taskCategory: task.category } : {}),
              hadSmallSteps: steps.every((step) => step.minutes < 10),
            }),
          };
        }),

      toggleTaskStep: (id, index) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id && t.steps
              ? {
                  ...t,
                  steps: t.steps.map((step, i) =>
                    i === index ? { ...step, done: !step.done } : step,
                  ),
                }
              : t,
          ),
        })),

      addBrainItems: (drafts) =>
        set((s) => ({
          brainItems: [
            ...drafts.map((d, i) => ({
              id: `brain-${Date.now()}-${i}`,
              raw: d.raw,
              text: d.text,
              category: d.category,
              confirmed: true,
              createdAt: new Date().toISOString(),
              sensitivity: 'private' as const,
            })),
            ...s.brainItems,
          ],
        })),

      updateBrainItem: (id, patch) =>
        set((s) => ({
          brainItems: s.brainItems.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        })),

      removeBrainItem: (id) =>
        set((s) => ({ brainItems: s.brainItems.filter((b) => b.id !== id) })),

      saveReview: (review) =>
        set((s) => ({
          reviews: { ...s.reviews, [review.date]: review },
          history: record(s, 'review'),
        })),

      setSharing: (category, on) =>
        set((s) => ({
          sharing: { ...s.sharing, categories: { ...s.sharing.categories, [category]: on } },
        })),

      setCycleDetailSharing: (on) =>
        set((s) => ({ sharing: { ...s.sharing, cycleDetail: on } })),

      setSignal: (signal) => set({ partnerSignal: signal }),

      setDecisionRule: (topic, rule) =>
        set((s) => ({
          decisionRules: s.decisionRules.map((r) => (r.topic === topic ? { ...r, rule } : r)),
        })),

      setNotificationLevel: (level) => set({ notifications: { level } }),

      setActiveTab: (tab) => set((s) => ({ ui: { ...s.ui, activeTab: tab } })),

      resetDemoData: () => set({ ...freshState(), ui: freshUi() }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      // `ui` is session state, not her data.
      partialize: (state) => {
        const { ui: _ui, ...rest } = state;
        void _ui;
        return rest as unknown as Store;
      },
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        // A partner signal is only ever true for the day she set it.
        if (state.partnerSignal && state.partnerSignal.date !== toISODate(new Date())) {
          state.partnerSignal = null;
        }
        state.ui = freshUi();
      },
    },
  ),
);
