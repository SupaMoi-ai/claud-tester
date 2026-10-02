import { emptyState, type GameState } from './types';

/**
 * Local-only persistence.
 *
 * Everything the child does lives in this browser and nowhere else — no
 * account, no sync, no network. The blob is versioned so a future shape change
 * can migrate rather than silently wipe a child's world.
 */

const KEY = 'oppdag.v1';
const CURRENT_VERSION = 1;

/** Drawings are the only large payload; keep the newest few. */
const MAX_DRAWINGS = 12;
const MAX_EVENTS = 200;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

type UnknownState = Partial<GameState> & { version?: number };

/**
 * Bring an older blob up to the current shape. Today there is only v1, so this
 * is a pass-through with a guard — but the hook exists so the first real
 * migration doesn't have to invent the mechanism under pressure.
 */
function migrate(raw: UnknownState): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  if (raw.version !== CURRENT_VERSION) return null;
  return { ...emptyState(), ...(raw as GameState), version: CURRENT_VERSION };
}

export function loadState(): GameState {
  if (!isBrowser()) return emptyState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    const migrated = migrate(JSON.parse(raw) as UnknownState);
    return migrated ?? emptyState();
  } catch {
    // Corrupt or blocked storage (private mode) — start fresh rather than crash.
    return emptyState();
  }
}

export function saveState(state: GameState): void {
  if (!isBrowser()) return;
  try {
    const trimmed: GameState = {
      ...state,
      drawings: state.drawings.slice(-MAX_DRAWINGS),
      events: state.events.slice(-MAX_EVENTS),
    };
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded: drop drawings first, they are the heavy part.
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...state, drawings: [] }));
    } catch {
      /* storage unavailable — the session still works, it just won't persist */
    }
  }
}

export function clearState(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
