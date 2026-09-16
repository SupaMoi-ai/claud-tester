import type { MasteryMap, StageOutcome } from '../learning/types';

export interface ChildProfile {
  id: string;
  /** First name only — see safety/childSafety.ts STORED_PERSONAL_DATA. */
  name: string;
  age: number;
  /** 1–7, or null for "går ikke på skolen ennå". */
  grade: number | null;
  interests: string[];
  createdAt: number;
}

export interface AdventureProgress {
  adventureId: string;
  /** Index into the adventure's stage list. */
  stageIndex: number;
  outcomes: StageOutcome[];
  startedAt: number;
  completedAt?: number;
}

export interface DrawingRecord {
  id: string;
  adventureId: string;
  prompt: string;
  /** PNG data URL, downscaled before storing. */
  dataUrl: string;
  at: number;
}

/**
 * One line in the parent's "I dag oppdaget barnet ditt" feed. Stored as raw
 * facts; the wording is composed at render time so copy changes don't require
 * a data migration.
 */
export interface ParentEvent {
  id: string;
  at: number;
  kind: 'adventure-completed' | 'concept-practised' | 'expressive';
  adventureId?: string;
  conceptId?: string;
  correct?: boolean;
  support?: StageOutcome['support'];
  attempts?: number;
}

export interface GameState {
  version: 1;
  /** Parent has read the intro and handed the device over. */
  parentAccepted: boolean;
  profile: ChildProfile | null;
  /** The gentle starting activity has been done once. */
  checkDone: boolean;
  mastery: MasteryMap;
  adventures: Record<string, AdventureProgress>;
  /** Location ids and scenery element ids that exist in the child's world. */
  unlocked: string[];
  /** Ids the child has not yet been shown the unlock animation for. */
  pendingUnlocks: string[];
  drawings: DrawingRecord[];
  events: ParentEvent[];
  seenDiscoveries: string[];
  /** Reflection transcripts, kept so the parent can see them. */
  reflections: { id: string; adventureId: string; text: string; at: number }[];
}

export const INITIAL_UNLOCKED = ['skoglandet', 'havna'];

export function emptyState(): GameState {
  return {
    version: 1,
    parentAccepted: false,
    profile: null,
    checkDone: false,
    mastery: {},
    adventures: {},
    unlocked: [...INITIAL_UNLOCKED],
    pendingUnlocks: [],
    drawings: [],
    events: [],
    seenDiscoveries: [],
    reflections: [],
  };
}
