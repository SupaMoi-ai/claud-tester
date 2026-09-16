import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type { StageOutcome } from '../learning/types';
import { applyOutcomeToMap } from '../learning/masteryEngine';
import { evaluateUnlocks } from '../world/worldLayout';
import { loadState, saveState, clearState } from './persistence';
import {
  emptyState,
  type AdventureProgress,
  type ChildProfile,
  type DrawingRecord,
  type GameState,
  type ParentEvent,
} from './types';

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

type Action =
  | { type: 'accept-parent-intro' }
  | { type: 'create-profile'; name: string; age: number; grade: number | null }
  | { type: 'set-interests'; interests: string[] }
  | { type: 'finish-check' }
  | { type: 'start-adventure'; adventureId: string }
  | { type: 'record-outcome'; adventureId: string; outcome: StageOutcome }
  | { type: 'set-stage'; adventureId: string; stageIndex: number }
  | { type: 'complete-adventure'; adventureId: string; unlocks: string[] }
  | { type: 'consume-unlock'; id: string }
  | { type: 'consume-all-unlocks' }
  | { type: 'save-drawing'; drawing: DrawingRecord }
  | { type: 'save-reflection'; adventureId: string; text: string }
  | { type: 'see-discovery'; id: string }
  | { type: 'load'; state: GameState }
  | { type: 'reset' };

const uid = () => Math.random().toString(36).slice(2, 10);

/* -------------------------------------------------------------------------- */
/* Reducer                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Adds any ids that have just become true to `unlocked`, and queues them in
 * `pendingUnlocks` so the UI can play the growth moment exactly once.
 */
function withGrowth(state: GameState, extra: string[] = []): GameState {
  // `extra` leads: an adventure's own declared unlock is the headline of the
  // growth moment, and anything mastery happened to open rides beneath it.
  const fresh = [...new Set([...extra, ...evaluateUnlocks(state)])].filter(
    (id) => !state.unlocked.includes(id),
  );
  if (fresh.length === 0) return state;
  return {
    ...state,
    unlocked: [...state.unlocked, ...fresh],
    pendingUnlocks: [...state.pendingUnlocks, ...fresh],
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'load':
      return action.state;

    case 'reset':
      return emptyState();

    case 'accept-parent-intro':
      return { ...state, parentAccepted: true };

    case 'create-profile': {
      const profile: ChildProfile = {
        id: state.profile?.id ?? uid(),
        name: action.name.trim(),
        age: action.age,
        grade: action.grade,
        interests: state.profile?.interests ?? [],
        createdAt: state.profile?.createdAt ?? Date.now(),
      };
      return { ...state, profile };
    }

    case 'set-interests':
      return state.profile
        ? { ...state, profile: { ...state.profile, interests: action.interests } }
        : state;

    case 'finish-check':
      return { ...state, checkDone: true };

    case 'start-adventure': {
      const existing = state.adventures[action.adventureId];
      if (existing && !existing.completedAt) return state;
      const progress: AdventureProgress = {
        adventureId: action.adventureId,
        stageIndex: 0,
        outcomes: [],
        startedAt: Date.now(),
      };
      return {
        ...state,
        adventures: { ...state.adventures, [action.adventureId]: progress },
      };
    }

    case 'set-stage': {
      const progress = state.adventures[action.adventureId];
      if (!progress) return state;
      return {
        ...state,
        adventures: {
          ...state.adventures,
          [action.adventureId]: { ...progress, stageIndex: action.stageIndex },
        },
      };
    }

    case 'record-outcome': {
      const childId = state.profile?.id ?? 'anon';
      const progress =
        state.adventures[action.adventureId] ?? {
          adventureId: action.adventureId,
          stageIndex: 0,
          outcomes: [],
          startedAt: Date.now(),
        };

      const event: ParentEvent = {
        id: uid(),
        at: action.outcome.at,
        kind: action.outcome.expressive ? 'expressive' : 'concept-practised',
        adventureId: action.adventureId,
        conceptId: action.outcome.conceptId,
        correct: action.outcome.correct,
        support: action.outcome.support,
        attempts: action.outcome.attempts,
      };

      const next: GameState = {
        ...state,
        mastery: applyOutcomeToMap(state.mastery, childId, action.outcome),
        adventures: {
          ...state.adventures,
          [action.adventureId]: {
            ...progress,
            outcomes: [...progress.outcomes, action.outcome],
          },
        },
        events: [...state.events, event],
      };

      // The world can grow the moment a concept lands, not only at the end.
      return withGrowth(next);
    }

    case 'complete-adventure': {
      const progress = state.adventures[action.adventureId];
      if (!progress) return state;
      const next: GameState = {
        ...state,
        adventures: {
          ...state.adventures,
          [action.adventureId]: { ...progress, completedAt: Date.now() },
        },
        events: [
          ...state.events,
          {
            id: uid(),
            at: Date.now(),
            kind: 'adventure-completed',
            adventureId: action.adventureId,
          },
        ],
      };
      return withGrowth(next, action.unlocks);
    }

    case 'consume-unlock':
      return {
        ...state,
        pendingUnlocks: state.pendingUnlocks.filter((x) => x !== action.id),
      };

    case 'consume-all-unlocks':
      return state.pendingUnlocks.length === 0
        ? state
        : { ...state, pendingUnlocks: [] };

    case 'save-drawing':
      return { ...state, drawings: [...state.drawings, action.drawing] };

    case 'save-reflection':
      return {
        ...state,
        reflections: [
          ...state.reflections,
          {
            id: uid(),
            adventureId: action.adventureId,
            text: action.text,
            at: Date.now(),
          },
        ],
      };

    case 'see-discovery':
      return state.seenDiscoveries.includes(action.id)
        ? state
        : { ...state, seenDiscoveries: [...state.seenDiscoveries, action.id] };

    default:
      return state;
  }
}

/* -------------------------------------------------------------------------- */
/* Context                                                                     */
/* -------------------------------------------------------------------------- */

interface Store {
  state: GameState;
  dispatch: (action: Action) => void;
  /** Convenience wrappers used by screens. */
  actions: {
    acceptParentIntro: () => void;
    createProfile: (name: string, age: number, grade: number | null) => void;
    setInterests: (interests: string[]) => void;
    finishCheck: () => void;
    startAdventure: (adventureId: string) => void;
    recordOutcome: (adventureId: string, outcome: StageOutcome) => void;
    setStage: (adventureId: string, stageIndex: number) => void;
    completeAdventure: (adventureId: string, unlocks: string[]) => void;
    consumeUnlock: (id: string) => void;
    consumeAllUnlocks: () => void;
    saveDrawing: (drawing: DrawingRecord) => void;
    saveReflection: (adventureId: string, text: string) => void;
    seeDiscovery: (id: string) => void;
    loadState: (state: GameState) => void;
    reset: () => void;
  };
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const reset = useCallback(() => {
    clearState();
    dispatch({ type: 'reset' });
  }, []);

  const actions = useMemo<Store['actions']>(
    () => ({
      acceptParentIntro: () => dispatch({ type: 'accept-parent-intro' }),
      createProfile: (name, age, grade) =>
        dispatch({ type: 'create-profile', name, age, grade }),
      setInterests: (interests) => dispatch({ type: 'set-interests', interests }),
      finishCheck: () => dispatch({ type: 'finish-check' }),
      startAdventure: (adventureId) =>
        dispatch({ type: 'start-adventure', adventureId }),
      recordOutcome: (adventureId, outcome) =>
        dispatch({ type: 'record-outcome', adventureId, outcome }),
      setStage: (adventureId, stageIndex) =>
        dispatch({ type: 'set-stage', adventureId, stageIndex }),
      completeAdventure: (adventureId, unlocks) =>
        dispatch({ type: 'complete-adventure', adventureId, unlocks }),
      consumeUnlock: (id) => dispatch({ type: 'consume-unlock', id }),
      consumeAllUnlocks: () => dispatch({ type: 'consume-all-unlocks' }),
      saveDrawing: (drawing) => dispatch({ type: 'save-drawing', drawing }),
      saveReflection: (adventureId, text) =>
        dispatch({ type: 'save-reflection', adventureId, text }),
      seeDiscovery: (id) => dispatch({ type: 'see-discovery', id }),
      loadState: (next) => dispatch({ type: 'load', state: next }),
      reset,
    }),
    [reset],
  );

  const value = useMemo(() => ({ state, dispatch, actions }), [state, actions]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

/** Shorthands that keep screens readable. */
export function useGame(): GameState {
  return useStore().state;
}

export function useActions(): Store['actions'] {
  return useStore().actions;
}

export function useChildId(): string {
  return useStore().state.profile?.id ?? 'anon';
}
