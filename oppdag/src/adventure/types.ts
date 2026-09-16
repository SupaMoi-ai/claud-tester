import type { Mood, Who } from '../characters/Character';
import type { Difficulty } from '../learning/types';

/** One spoken beat. The narrative glue between tasks. */
export interface Line {
  who: Who;
  text: string;
  mood?: Mood;
}

/**
 * A visual hint, expressed declaratively so adventure content stays plain data
 * and the stage components own the rendering.
 */
export type VisualHint =
  | { kind: 'numberline'; from: number; to: number; walked: number; unit?: string }
  | { kind: 'groups'; emoji: string; a: number; b: number }
  | { kind: 'highlight'; sentence: string }
  | { kind: 'pointer'; targetId: string; note: string };

export interface Hint {
  text: string;
  visual?: VisualHint;
}

export interface Option {
  id: string;
  label: string;
  emoji?: string;
}

interface StageBase {
  id: string;
  /** Concept this stage quietly practises. */
  conceptId: string;
  /** Story shown before the task. */
  intro?: Line[];
  /** Story shown after the child gets there. */
  after?: Line[];
}

/** A numeric answer with big tappable number choices. */
export interface NumberVariant {
  prompt: string;
  options: number[];
  answer: number;
  /** Shown above the choices to make the quantity concrete. */
  visual?: VisualHint;
}

export interface NumberChoiceStage extends StageBase {
  kind: 'numberChoice';
  variants: Record<Difficulty, NumberVariant>;
  /** [hint, visual hint, guided solution] */
  hints: [Hint, Hint, Hint];
}

/** A guess with no wrong answer, followed by the real explanation. */
export interface GuessRevealStage extends StageBase {
  kind: 'guessReveal';
  prompt: string;
  options: Option[];
  revealTitle: string;
  revealBody: string;
  revealEmoji: string;
}

export interface ReadingStage extends StageBase {
  kind: 'reading';
  /** Who the note is from — shown as a little letterhead. */
  from: string;
  body: string;
  question: string;
  options: Option[];
  answer: string;
  hints: [Hint, Hint, Hint];
}

export interface MapTarget {
  id: string;
  label: string;
  /** Percentage position on the simplified map. */
  x: number;
  y: number;
}

export interface MapFindStage extends StageBase {
  kind: 'mapFind';
  prompt: string;
  targets: MapTarget[];
  answer: string;
  hints: [Hint, Hint, Hint];
}

export interface DrawingStage extends StageBase {
  kind: 'drawing';
  prompt: string;
}

export interface ReflectionStage extends StageBase {
  kind: 'reflection';
  prompt: string;
}

/** Pure narrative — the opening and the ending. */
export interface StoryStage {
  kind: 'story';
  id: string;
  conceptId?: undefined;
  lines: Line[];
  /** Label for the button that ends the beat. */
  cta?: string;
}

export type Stage =
  | StoryStage
  | NumberChoiceStage
  | GuessRevealStage
  | ReadingStage
  | MapFindStage
  | DrawingStage
  | ReflectionStage;

/** Stages that produce a StageOutcome. */
export type TaskStage = Exclude<Stage, StoryStage>;

export function isTaskStage(stage: Stage): stage is TaskStage {
  return stage.kind !== 'story';
}

export interface Adventure {
  id: string;
  /** Child-facing title. */
  title: string;
  /** Where it happens. */
  place: string;
  /** One line on the card. */
  teaser: string;
  emoji: string;
  /** Which location on the world map offers it. */
  locationId: string;
  heroCharacter: Who;
  /** Concepts touched, for the parent view. */
  concepts: string[];
  /** World ids granted on completion, on top of anything mastery unlocks. */
  unlocks: string[];
  /** What the child is told they found out, on the completion screen. */
  takeaways: { emoji: string; text: string }[];
  stages: Stage[];
}
