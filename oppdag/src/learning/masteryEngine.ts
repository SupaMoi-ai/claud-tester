import type {
  ChildMastery,
  MasteryMap,
  MasteryState,
  StageOutcome,
  SupportLevel,
} from './types';

/**
 * Pure functions. No React, no storage, no side effects — so the whole model
 * is testable in isolation (see tests/learning.test.ts).
 */

/** How much confidence a correct answer is worth, by how much help was used. */
const GAIN: Record<SupportLevel, number> = {
  none: 0.25,
  hint: 0.12,
  visual: 0.06,
  guided: 0.02,
};

/** A wrong answer nudges down gently. Children should never feel punished. */
const WRONG_PENALTY = 0.08;

/** Extra credit for handling the harder variant, less for the easier one. */
const DIFFICULTY_FACTOR = { easy: 0.7, base: 1, hard: 1.3 } as const;

/** Confidence bleeds slowly if a concept is never revisited. */
const DECAY_PER_DAY = 0.01;
const DECAY_GRACE_DAYS = 7;
const DAY_MS = 86_400_000;

const THRESHOLD_EXPLORING = 0.05;
const THRESHOLD_DEVELOPING = 0.35;
const THRESHOLD_SECURE = 0.7;
/** "Secure" also needs evidence, not one lucky tap. */
const SECURE_MIN_ATTEMPTS = 3;

export function emptyMastery(childId: string, conceptId: string): ChildMastery {
  return {
    childId,
    conceptId,
    state: 'new',
    confidence: 0,
    attempts: 0,
    successes: 0,
    hintsUsed: 0,
    lastSeen: 0,
  };
}

export function stateFor(confidence: number, attempts: number): MasteryState {
  if (confidence >= THRESHOLD_SECURE && attempts >= SECURE_MIN_ATTEMPTS)
    return 'secure';
  if (confidence >= THRESHOLD_DEVELOPING) return 'developing';
  if (confidence >= THRESHOLD_EXPLORING) return 'exploring';
  return 'new';
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Applied lazily on read rather than on a timer: a concept the child has not
 * touched for weeks drifts back down so the parent map stays honest.
 */
export function withDecay(m: ChildMastery, now = Date.now()): ChildMastery {
  if (m.lastSeen === 0 || m.confidence === 0) return m;
  const days = (now - m.lastSeen) / DAY_MS;
  if (days <= DECAY_GRACE_DAYS) return m;
  const confidence = clamp01(
    m.confidence - (days - DECAY_GRACE_DAYS) * DECAY_PER_DAY,
  );
  return { ...m, confidence, state: stateFor(confidence, m.attempts) };
}

/**
 * Fold one answered stage into a concept's mastery record.
 *
 * Expressive stages (drawing, telling Lumi what you learned) always count as
 * engagement, never as a score — they nudge confidence up a little and are
 * flagged so the parent view describes them as exploration.
 */
export function applyOutcome(
  current: ChildMastery,
  outcome: StageOutcome,
): ChildMastery {
  const decayed = withDecay(current, outcome.at);
  const attempts = decayed.attempts + 1;
  const successes = decayed.successes + (outcome.correct ? 1 : 0);
  const hintsUsed =
    decayed.hintsUsed + (outcome.support === 'none' ? 0 : 1);

  let confidence = decayed.confidence;

  if (outcome.expressive) {
    confidence = clamp01(confidence + 0.08);
  } else if (outcome.correct) {
    const base = GAIN[outcome.support];
    const factor = DIFFICULTY_FACTOR[outcome.difficulty];
    // Struggling through several tries still earns something, just less.
    const persistence = outcome.attempts > 1 ? 0.6 : 1;
    confidence = clamp01(confidence + base * factor * persistence);
  } else {
    confidence = clamp01(confidence - WRONG_PENALTY);
  }

  return {
    ...decayed,
    attempts,
    successes,
    hintsUsed,
    confidence,
    state: stateFor(confidence, attempts),
    lastSeen: outcome.at,
  };
}

export function applyOutcomeToMap(
  map: MasteryMap,
  childId: string,
  outcome: StageOutcome,
): MasteryMap {
  const current =
    map[outcome.conceptId] ?? emptyMastery(childId, outcome.conceptId);
  return { ...map, [outcome.conceptId]: applyOutcome(current, outcome) };
}

export function readMastery(
  map: MasteryMap,
  childId: string,
  conceptId: string,
  now = Date.now(),
): ChildMastery {
  const found = map[conceptId];
  return found ? withDecay(found, now) : emptyMastery(childId, conceptId);
}
