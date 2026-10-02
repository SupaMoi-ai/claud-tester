/**
 * The learning graph.
 *
 * This is deliberately a graph and not a list of exercises: the whole product
 * premise is that the child follows a story while the system tracks concepts
 * underneath. Adventures reference concept ids; they never own progress.
 *
 * The Norwegian version is intended to map onto LK20 competence aims later —
 * `Concept` therefore carries `gradeRange` and a stable `id` so an `lk20` field
 * can be added without reshaping anything.
 */

export type Subject = 'matematikk' | 'norsk' | 'naturfag';

/**
 * Internal vocabulary only. These four words must never reach the child's
 * screen — the parent view translates them to "Kan godt / Holder på å lære /
 * Kommer senere".
 */
export type MasteryState = 'new' | 'exploring' | 'developing' | 'secure';

export interface Concept {
  id: string;
  subject: Subject;
  /** Parent-facing title, e.g. "Subtraksjon under 20". */
  title: string;
  /** One warm sentence a parent can read without jargon. */
  description: string;
  /** Inclusive school-year range this normally belongs to (1–7). */
  gradeRange: [number, number];
  /** Concept ids that should normally come first. */
  prerequisites: string[];
  /** Which place in the world this concept belongs to, for the world map. */
  worldLocation?: string;
}

export interface ChildMastery {
  childId: string;
  conceptId: string;
  state: MasteryState;
  /** 0..1. Not shown to anyone; drives state and adaptive difficulty. */
  confidence: number;
  attempts: number;
  successes: number;
  hintsUsed: number;
  /** epoch ms */
  lastSeen: number;
}

export type MasteryMap = Record<string, ChildMastery>;

/** How much help the child had pulled before answering. */
export type SupportLevel = 'none' | 'hint' | 'visual' | 'guided';

export type Difficulty = 'easy' | 'base' | 'hard';

/**
 * Emitted once per answered task stage. The single event type that the mastery
 * engine, the parent insight log and the world-unlock evaluator all consume.
 */
export interface StageOutcome {
  conceptId: string;
  /** For open/creative stages this is always true — there is no wrong answer. */
  correct: boolean;
  /** Attempts spent on this stage, 1 = got it first try. */
  attempts: number;
  support: SupportLevel;
  difficulty: Difficulty;
  /** Set for expressive stages (drawing, reflection) so the parent view can
   *  describe them differently from right/wrong tasks. */
  expressive?: boolean;
  at: number;
}
